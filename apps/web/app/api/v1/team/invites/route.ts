import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }
    if (!user.is_admin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin privileges required' }, { status: 403 });
    }

    let query = `
      SELECT 
         ti.id, ti.email, ti.token, ti.is_admin, ti.groups,
         ti.is_accepted, ti.expires_at, ti.created_at,
         u.display_name as invited_by_name
       FROM team_invites ti
       LEFT JOIN users u ON u.id = ti.invited_by
       WHERE ti.is_accepted = FALSE AND ti.expires_at > NOW()
    `;
    const params: any[] = [];

    if (user.team_name) {
      query += ` AND (ti.invited_by IN (SELECT id FROM users WHERE team_name = $1) OR ti.invited_by = $2)`;
      params.push(user.team_name, user.id);
    } else {
      query += ` AND ti.invited_by = $1`;
      params.push(user.id);
    }

    query += ` ORDER BY ti.created_at DESC`;

    const { rows } = await db.query(query, params);

    return NextResponse.json({ invites: rows });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }
    if (!user.is_admin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin privileges required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const email = body.email?.trim()?.toLowerCase() || null;
    const isAdmin = Boolean(body.is_admin);
    const groups = Array.isArray(body.groups) ? body.groups : ['dev-team'];
    const expiresInDays = Number(body.expires_in_days) || 7;

    const url = new URL(request.url);
    const origin = url.origin;

    // If an email was provided and the user already exists in DB, assign roles directly!
    if (email) {
      const { rows: existingUsers } = await db.query(
        `SELECT id, email, display_name FROM users WHERE LOWER(email) = $1`,
        [email]
      );

      if (existingUsers.length > 0) {
        const targetUserId = existingUsers[0].id;
        // Update admin flag
        if (isAdmin) {
          await db.query(`UPDATE users SET is_admin = TRUE WHERE id = $1`, [targetUserId]);
        }

        // Assign groups
        for (const gName of groups) {
          const gRes = await db.query(`SELECT id FROM groups WHERE name = $1`, [gName]);
          if (gRes.rows.length > 0) {
            await db.query(
              `INSERT INTO user_group_map (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [targetUserId, gRes.rows[0].id]
            );
          }
        }

        return NextResponse.json({
          message: `Roles directly assigned to existing user ${existingUsers[0].display_name}`,
          direct_assigned: true,
          user: existingUsers[0],
        }, { status: 200 });
      }
    }

    // Generate secure invite token
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const { rows } = await db.query(
      `INSERT INTO team_invites (email, token, is_admin, groups, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, token, is_admin, groups, expires_at, created_at`,
      [email, token, isAdmin, groups, user.id, expiresAt]
    );

    const invite = rows[0];
    const inviteUrl = `${origin}/invite?token=${token}`;

    return NextResponse.json({
      invite,
      invite_url: inviteUrl,
      message: 'Invite link generated successfully',
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
