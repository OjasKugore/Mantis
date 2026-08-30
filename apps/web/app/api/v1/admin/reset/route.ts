import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

// Demo accounts that are NEVER deleted
const DEMO_EMAILS = [
  'admin@mantis.local',
  'alice@mozilla.com',
  'bob@mozilla.com',
  'carol@mozilla.com',
  'dave@mozilla.com',
  'eve@mozilla.com',
  'frank@mozilla.com',
  'grace@mozilla.com',
  'heidi@mozilla.com',
  'ivan@mozilla.com',
];

/**
 * POST /api/v1/admin/reset
 * One-time workspace reset: deletes all non-demo user accounts and their bugs.
 * Requires: logged-in admin user OR ADMIN_RESET_TOKEN header.
 * Judge demo sandbox data is always preserved.
 */
export async function POST(request: Request) {
  try {
    // Allow either a logged-in admin OR a secret token (for CLI/curl usage)
    const secretToken = request.headers.get('x-reset-token');
    const envToken = process.env.ADMIN_RESET_TOKEN;

    let authorized = false;

    if (envToken && secretToken === envToken) {
      authorized = true;
    } else {
      const user = await getCurrentUser();
      if (user?.is_admin) authorized = true;
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Admin privileges or reset token required.' },
        { status: 403 }
      );
    }

    const demoEmailList = DEMO_EMAILS.map((_, i) => `$${i + 1}`).join(', ');

    // Find all non-demo user IDs
    const { rows: nonDemoUsers } = await db.query(
      `SELECT id, email FROM users WHERE email NOT IN (${demoEmailList})`,
      DEMO_EMAILS
    );

    if (nonDemoUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Workspace already clean — no non-demo accounts found.',
        deleted: { users: 0, bugs: 0 },
      });
    }

    const userIds: string[] = nonDemoUsers.map((u: any) => u.id);
    const userEmails: string[] = nonDemoUsers.map((u: any) => u.email);

    // Delete sessions, notifications, group map, team invites
    await db.query(`DELETE FROM sessions WHERE user_id = ANY($1::uuid[])`, [userIds]);
    await db.query(`DELETE FROM notifications WHERE user_id = ANY($1::uuid[])`, [userIds]);
    await db.query(`DELETE FROM comment_mentions WHERE mentioned_user_id = ANY($1::uuid[])`, [userIds]);
    await db.query(`DELETE FROM bug_comments WHERE author_id = ANY($1::uuid[])`, [userIds]);
    await db.query(`DELETE FROM flags WHERE setter_id = ANY($1::uuid[]) OR requestee_id = ANY($1::uuid[])`, [userIds]);
    await db.query(`DELETE FROM bugs_activity WHERE who_id = ANY($1::uuid[])`, [userIds]);
    await db.query(`DELETE FROM user_group_map WHERE user_id = ANY($1::uuid[])`, [userIds]);
    await db.query(`DELETE FROM team_invites WHERE invited_by = ANY($1::uuid[]) OR accepted_by = ANY($1::uuid[])`, [userIds]);

    // Find bugs filed by non-demo users
    const { rows: nonDemoBugs } = await db.query(
      `SELECT id FROM bugs WHERE reporter_id = ANY($1::uuid[])`,
      [userIds]
    );

    let deletedBugs = nonDemoBugs.length;

    if (nonDemoBugs.length > 0) {
      const bugIds: number[] = nonDemoBugs.map((b: any) => Number(b.id));

      await db.query(`DELETE FROM flags WHERE bug_id = ANY($1::int[])`, [bugIds]);
      await db.query(`DELETE FROM bug_comments WHERE bug_id = ANY($1::int[])`, [bugIds]);
      await db.query(`DELETE FROM bugs_activity WHERE bug_id = ANY($1::int[])`, [bugIds]);
      await db.query(`DELETE FROM bug_group_map WHERE bug_id = ANY($1::int[])`, [bugIds]);
      await db.query(`DELETE FROM bug_commits WHERE bug_id = ANY($1::int[])`, [bugIds]);
      await db.query(`DELETE FROM bug_pull_requests WHERE bug_id = ANY($1::int[])`, [bugIds]);
      await db.query(
        `DELETE FROM bug_dependencies WHERE blocking_bug_id = ANY($1::int[]) OR blocked_bug_id = ANY($1::int[])`,
        [bugIds]
      );
      await db.query(`DELETE FROM bugs WHERE id = ANY($1::int[])`, [bugIds]);
    }

    // Finally delete the users themselves
    await db.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [userIds]);

    console.log(`✅ Admin reset: removed ${nonDemoUsers.length} non-demo users and ${deletedBugs} bugs.`);

    return NextResponse.json({
      success: true,
      message: `Workspace reset complete. All non-demo accounts and their data have been removed.`,
      deleted: {
        users: nonDemoUsers.length,
        emails: userEmails,
        bugs: deletedBugs,
      },
    });
  } catch (err: any) {
    console.error('Admin reset error:', err);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
