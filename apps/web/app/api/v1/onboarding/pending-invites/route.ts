import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const { rows } = await db.query(
      `SELECT 
         ti.id, ti.email, ti.token, ti.is_admin, ti.groups, ti.expires_at, ti.created_at,
         u.display_name as invited_by_name, u.team_name as workspace_name
       FROM team_invites ti
       LEFT JOIN users u ON u.id = ti.invited_by
       WHERE LOWER(ti.email) = LOWER($1) AND ti.is_accepted = FALSE AND ti.expires_at > NOW()
       ORDER BY ti.created_at DESC`,
      [user.email]
    );

    return NextResponse.json({
      invites: rows.map((r: any) => ({
        id: r.id,
        token: r.token,
        is_admin: r.is_admin,
        groups: r.groups || [],
        invited_by: r.invited_by_name || 'Workspace Administrator',
        team_name: r.workspace_name || 'Mantis Workspace',
        expires_at: r.expires_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
