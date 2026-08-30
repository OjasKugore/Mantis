import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

interface RouteParams {
  params: { id: string };
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const viewId = parseInt(params.id, 10);
    if (isNaN(viewId) || viewId < 0) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Invalid saved view ID' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    await db.query(`DELETE FROM named_queries WHERE id = $1 AND user_id = $2`, [viewId, user.id]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'DB_ERROR', message: err.message }, { status: 500 });
  }
}
