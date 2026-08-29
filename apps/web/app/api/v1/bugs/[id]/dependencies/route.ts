import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';
import { recordActivity } from '@/lib/services/audit';

interface RouteParams {
  params: { id: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const blockingId = parseInt(params.id, 10);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Must be logged in to modify dependencies' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const blockedId = parseInt(body.blocked_bug_id || body.blocks_bug_id || body.blockedId, 10);

    if (!blockingId || !blockedId || isNaN(blockingId) || isNaN(blockedId) || blockingId === blockedId) {
      return NextResponse.json({
        error: 'INVALID_DEPENDENCY',
        message: 'A bug cannot depend on itself or an invalid bug ID.',
      }, { status: 400 });
    }

    // Check both bugs exist
    const bugsCheck = await db.query(`SELECT id FROM bugs WHERE id = $1 OR id = $2`, [blockingId, blockedId]);
    if (bugsCheck.rows.length < 2) {
      return NextResponse.json({ error: 'BUG_NOT_FOUND', message: 'One or both bugs not found' }, { status: 404 });
    }

    // Cycle detection BFS from blockedId to blockingId
    const allDepsRes = await db.query(`SELECT blocking_bug_id, blocked_bug_id FROM bug_dependencies`);
    const adj = new Map<number, number[]>();
    for (const row of allDepsRes.rows) {
      const u = Number(row.blocking_bug_id);
      const v = Number(row.blocked_bug_id);
      if (!adj.has(u)) adj.set(u, []);
      adj.get(u)!.push(v);
    }

    const queue = [blockedId];
    const visited = new Set<number>([blockedId]);
    let createsCycle = false;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === blockingId) {
        createsCycle = true;
        break;
      }
      for (const next of adj.get(curr) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }

    if (createsCycle) {
      return NextResponse.json({
        error: 'CYCLIC_DEPENDENCY_DETECTED',
        message: 'Adding this dependency would create a cycle.',
      }, { status: 422 });
    }

    // Insert dependency
    await db.query(
      `INSERT INTO bug_dependencies (blocking_bug_id, blocked_bug_id, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [blockingId, blockedId, user.id]
    );

    // Audit logs
    await recordActivity(db, {
      bugId: blockingId,
      whoId: user.id,
      field: 'blocks',
      oldValue: null,
      newValue: String(blockedId),
      comment: `Added blocked bug #${blockedId}`,
    });

    await recordActivity(db, {
      bugId: blockedId,
      whoId: user.id,
      field: 'depends_on',
      oldValue: null,
      newValue: String(blockingId),
      comment: `Added blocking bug #${blockingId}`,
    });

    return NextResponse.json({
      message: 'Dependency added successfully',
      blocking_bug_id: blockingId,
      blocked_bug_id: blockedId,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
