import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }
    if (!user.is_admin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin privileges required' }, { status: 403 });
    }

    await db.query(`DELETE FROM team_invites WHERE id = $1`, [params.id]);
    return NextResponse.json({ message: 'Invite revoked successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
