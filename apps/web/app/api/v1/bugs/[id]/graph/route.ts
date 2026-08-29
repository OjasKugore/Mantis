import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser, canUserAccessBug } from '@/lib/services/auth';
import { computeCPM } from '@/lib/services/cpm';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const bugId = parseInt(params.id, 10);
    if (isNaN(bugId)) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Bug ID must be an integer' }, { status: 400 });
    }

    const user = await getCurrentUser();
    const hasAccess = await canUserAccessBug(bugId, user?.id ?? null);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    // Check root bug exists
    const bugCheck = await db.query(`SELECT id FROM bugs WHERE id = $1`, [bugId]);
    if (bugCheck.rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    // Fetch all dependencies to compute reachable graph via BFS
    const allDepsRes = await db.query(`SELECT blocking_bug_id, blocked_bug_id FROM bug_dependencies`);
    const forwardAdj = new Map<number, number[]>();
    const backwardAdj = new Map<number, number[]>();

    for (const row of allDepsRes.rows) {
      const u = Number(row.blocking_bug_id);
      const v = Number(row.blocked_bug_id);
      if (!forwardAdj.has(u)) forwardAdj.set(u, []);
      forwardAdj.get(u)!.push(v);

      if (!backwardAdj.has(v)) backwardAdj.set(v, []);
      backwardAdj.get(v)!.push(u);
    }

    // Traverse all reachable nodes (upstream and downstream)
    const reachableSet = new Set<number>([bugId]);
    const queue = [bugId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const next of forwardAdj.get(curr) || []) {
        if (!reachableSet.has(next)) {
          reachableSet.add(next);
          queue.push(next);
        }
      }
      for (const prev of backwardAdj.get(curr) || []) {
        if (!reachableSet.has(prev)) {
          reachableSet.add(prev);
          queue.push(prev);
        }
      }
    }

    const nodeIds = Array.from(reachableSet);
    const placeholders = nodeIds.map((_, i) => `$${i + 1}`).join(', ');
    const { rows: nodes } = await db.query(
      `SELECT id, summary, status, priority, severity, estimated_time, remaining_time
       FROM bugs
       WHERE id IN (${placeholders})`,
      nodeIds
    );

    const formattedNodes = nodes.map((n: any) => ({
      id: Number(n.id),
      summary: n.summary,
      status: n.status,
      priority: n.priority,
      severity: n.severity,
      estimated_time: Number(n.estimated_time) || 0,
      remaining_time: Number(n.remaining_time) || 0,
      estimatedTime: Number(n.estimated_time) || 1,
    }));

    // Filter edges belonging to reachable subgraph
    const edges: { blockingId: number; blockedId: number }[] = [];
    for (const row of allDepsRes.rows) {
      const u = Number(row.blocking_bug_id);
      const v = Number(row.blocked_bug_id);
      if (reachableSet.has(u) && reachableSet.has(v)) {
        edges.push({ blockingId: u, blockedId: v });
      }
    }

    const criticalPathIds = computeCPM(formattedNodes, edges);

    return NextResponse.json({
      nodes: formattedNodes,
      edges,
      criticalPathIds,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
