import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

interface RouteParams {
  params: { id: string };
}

export async function PATCH(_request: Request, { params }: RouteParams) {
  try {
    const notifId = parseInt(params.id, 10);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [notifId, user.id]
    );

    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
