import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'TOKEN_REQUIRED', message: 'Invite token is required' }, { status: 400 });
    }

    const { rows } = await db.query(
      `SELECT 
         ti.id, ti.email, ti.token, ti.is_admin, ti.groups,
         ti.is_accepted, ti.expires_at,
         u.display_name as invited_by_name
       FROM team_invites ti
       LEFT JOIN users u ON u.id = ti.invited_by
       WHERE ti.token = $1`,
      [token]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'INVALID_TOKEN', message: 'Invite link is invalid or has expired' }, { status: 404 });
    }

    const invite = rows[0];
    const isExpired = new Date(invite.expires_at) < new Date();

    if (isExpired) {
      return NextResponse.json({ error: 'EXPIRED_TOKEN', message: 'This invite link has expired' }, { status: 410 });
    }

    if (invite.is_accepted) {
      return NextResponse.json({ error: 'ALREADY_ACCEPTED', message: 'This invite has already been claimed' }, { status: 409 });
    }

    return NextResponse.json({
      valid: true,
      invite: {
        id: invite.id,
        email: invite.email,
        is_admin: invite.is_admin,
        groups: invite.groups || [],
        invited_by: invite.invited_by_name || 'Workspace Administrator',
        expires_at: invite.expires_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
