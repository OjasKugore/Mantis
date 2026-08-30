import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const field = searchParams.get('field');
    const bugId = searchParams.get('bug_id');

    const user = await getCurrentUser();
    const userId = user?.id ?? null;
    const isSecurityMember = user?.groups?.includes('security') || user?.is_admin || false;
    const scope = searchParams.get('scope');
    const isDemo = scope === 'demo' || (!scope && !user) || (user && (user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local'));

    let query = `
      SELECT ba.id, ba.bug_id, ba.who_id as user_id, ba.changed_at as timestamp,
             ba.field as field_name, ba.old_value as removed, ba.new_value as added,
             u.display_name as who_name, u.email as who_email, u.avatar_url as who_avatar,
             b.summary as bug_summary, b.is_embargoed
      FROM bugs_activity ba
      LEFT JOIN users u ON u.id = ba.who_id
      LEFT JOIN bugs b ON b.id = ba.bug_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    // Sandbox isolation filter
    if (scope === 'user' || (user && !isDemo)) {
      if (user?.team_name) {
        query += ` AND b.reporter_id IN (SELECT id FROM users WHERE team_name = $${pIdx++} AND email NOT LIKE '%@mozilla.com' AND email != 'admin@mantis.local')`;
        params.push(user.team_name);
      } else if (userId) {
        query += ` AND b.reporter_id = $${pIdx++}`;
        params.push(userId);
      } else {
        query += ` AND 1=0`;
      }
    } else {
      query += ` AND (b.reporter_id IN (SELECT id FROM users WHERE email LIKE '%@mozilla.com' OR email = 'admin@mantis.local') OR b.reporter_id IS NULL)`;
    }

    // Secrecy filter: hide activity on embargoed bugs from unauthorized users
    if (!isSecurityMember) {
      query += ` AND (b.is_embargoed = false OR b.is_embargoed IS NULL OR b.reporter_id = $${pIdx} OR b.assignee_id = $${pIdx})`;
      params.push(userId);
      pIdx++;
    }

    if (field && field !== 'all') {
      query += ` AND (ba.field = $${pIdx} OR ba.field = $${pIdx + 1})`;
      params.push(field, field === 'status' ? 'bug_status' : field === 'bug_status' ? 'status' : field);
      pIdx += 2;
    }

    if (bugId) {
      query += ` AND ba.bug_id = $${pIdx}`;
      params.push(parseInt(bugId, 10));
      pIdx++;
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered_activities`;
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    query += ` ORDER BY ba.changed_at DESC, ba.id DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    params.push(limit, offset);

    const res = await db.query(query, params);

    return NextResponse.json({
      activities: res.rows,
      total,
      limit,
      offset,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'AUDIT_QUERY_FAILED', message: err.message }, { status: 500 });
  }
}
