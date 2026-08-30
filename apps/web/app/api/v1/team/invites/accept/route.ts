import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';
import { setUserTokenCookie } from '@/lib/services/session-token';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'You must be logged in to accept an invitation' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'TOKEN_REQUIRED', message: 'Invite token is required' }, { status: 400 });
    }

    const { rows } = await db.query(
      `SELECT id, email, token, is_admin, groups, is_accepted, expires_at
       FROM team_invites
       WHERE token = $1`,
      [token]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'INVALID_TOKEN', message: 'Invite token is invalid' }, { status: 404 });
    }

    const invite = rows[0];
    if (invite.is_accepted) {
      return NextResponse.json({ error: 'ALREADY_ACCEPTED', message: 'This invite has already been accepted' }, { status: 409 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'EXPIRED_TOKEN', message: 'This invite has expired' }, { status: 410 });
    }

    // If invite was bound to a specific email, verify it matches
    if (invite.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({
        error: 'EMAIL_MISMATCH',
        message: `This invite was issued for ${invite.email}, but you are signed in as ${user.email}`,
      }, { status: 403 });
    }

    // Mark user as onboarded and update admin status if promoted
    const promoteAdmin = Boolean(invite.is_admin) || Boolean(user.is_admin);
    await db.query(`UPDATE users SET onboarded = TRUE, is_admin = $1 WHERE id = $2`, [promoteAdmin, user.id]);

    // Apply groups
    const assignedGroups = invite.groups || ['dev-team'];
    for (const gName of assignedGroups) {
      const gRes = await db.query(`SELECT id FROM groups WHERE name = $1`, [gName]);
      if (gRes.rows.length > 0) {
        await db.query(
          `INSERT INTO user_group_map (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [user.id, gRes.rows[0].id]
        );
      }
    }

    // Mark invite accepted
    await db.query(
      `UPDATE team_invites SET is_accepted = TRUE, accepted_by = $1 WHERE id = $2`,
      [user.id, invite.id]
    );

    // Fetch updated user
    const { rows: updatedUserRows } = await db.query(
      `SELECT u.id, u.email, u.display_name, u.username, u.is_admin, u.avatar_url, u.priority_rank, u.onboarded, u.team_name
       FROM users u WHERE u.id = $1`,
      [user.id]
    );

    const safeUser = {
      ...updatedUserRows[0],
      is_admin: promoteAdmin,
      onboarded: true,
      groups: assignedGroups,
    };

    const response = NextResponse.json({
      message: 'Successfully joined team with assigned roles',
      user: safeUser,
      redirect: '/dashboard',
    });

    // Update signed session cookie
    setUserTokenCookie(response, safeUser);

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
