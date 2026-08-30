import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

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
    const { member_ids } = body;

    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', message: 'member_ids array is required' }, { status: 400 });
    }

    // Batch update ranks
    for (let index = 0; index < member_ids.length; index++) {
      const userId = member_ids[index];
      await db.query(
        `UPDATE users SET priority_rank = $1 WHERE id = $2`,
        [index + 1, userId]
      );
    }

    return NextResponse.json({ message: 'Team priority reordered successfully', count: member_ids.length });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
