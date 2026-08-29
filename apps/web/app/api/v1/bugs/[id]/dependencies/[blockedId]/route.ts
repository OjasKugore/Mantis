import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';
import { recordActivity } from '@/lib/services/audit';

interface RouteParams {
  params: { id: string; blockedId: string };
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const blockingId = parseInt(params.id, 10);
    const blockedId = parseInt(params.blockedId, 10);
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Must be logged in to modify dependencies' }, { status: 401 });
    }

    if (!blockingId || !blockedId || isNaN(blockingId) || isNaN(blockedId)) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Invalid bug ID' }, { status: 400 });
    }

    const { rowCount } = await db.query(
      `DELETE FROM bug_dependencies WHERE blocking_bug_id = $1 AND blocked_bug_id = $2`,
      [blockingId, blockedId]
    );

    if (rowCount && rowCount > 0) {
      await recordActivity(db, {
        bugId: blockingId,
        whoId: user.id,
        field: 'blocks',
        oldValue: String(blockedId),
        newValue: null,
        comment: `Removed blocked bug #${blockedId}`,
      });
      await recordActivity(db, {
        bugId: blockedId,
        whoId: user.id,
        field: 'depends_on',
        oldValue: String(blockingId),
        newValue: null,
        comment: `Removed blocking bug #${blockingId}`,
      });
    }

    return NextResponse.json({ message: 'Dependency removed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
