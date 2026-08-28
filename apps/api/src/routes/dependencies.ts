import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { recordActivity } from '../services/audit.js';
import { computeCPM } from '../services/cpm.js';

export async function dependencyRoutes(app: FastifyInstance) {
  // POST /bugs/:id/dependencies
  app.post<{ Params: { id: string } }>(
    '/bugs/:id/dependencies',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const blockingId = Number(request.params.id);
      const { blocked_bug_id } = (request.body as { blocked_bug_id?: number | string }) || {};
      const blockedId = Number(blocked_bug_id);

      if (!blockingId || !blockedId || isNaN(blockingId) || isNaN(blockedId) || blockingId === blockedId) {
        return reply.code(400).send({
          error: 'INVALID_DEPENDENCY',
          message: 'A bug cannot depend on itself or an invalid bug ID.',
        });
      }

      // Check both bugs exist
      const bugsCheck = await db.query(`SELECT id FROM bugs WHERE id = $1 OR id = $2`, [blockingId, blockedId]);
      if (bugsCheck.rows.length < (blockingId === blockedId ? 1 : 2)) {
        return reply.code(404).send({ error: 'BUG_NOT_FOUND', message: 'One or both bugs not found' });
      }

      // Cycle detection: Check if adding blockingId -> blockedId creates a cycle
      // (i.e. check if blockedId can already reach blockingId via dependencies)
      // First check direct or multi-hop path from blockedId to blockingId
      const allDepsRes = await db.query(`SELECT blocking_bug_id, blocked_bug_id FROM bug_dependencies`);
      const adj = new Map<number, number[]>();
      for (const row of allDepsRes.rows) {
        const u = Number(row.blocking_bug_id);
        const v = Number(row.blocked_bug_id);
        if (!adj.has(u)) adj.set(u, []);
        adj.get(u)!.push(v);
      }

      // BFS/DFS from blockedId to see if we can reach blockingId
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
        return reply.code(422).send({
          error: 'CYCLIC_DEPENDENCY_DETECTED',
          message: 'Adding this dependency would create a cycle.',
        });
      }

      // Insert dependency
      await db.query(
        `INSERT INTO bug_dependencies (blocking_bug_id, blocked_bug_id, created_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [blockingId, blockedId, request.user!.id]
      );

      // Audit logs
      const dummyClient = {
        query: (text: string, params?: any[]) => db.query(text, params),
      } as any;

      await recordActivity(dummyClient, {
        bugId: blockingId,
        whoId: request.user!.id,
        field: 'blocks',
        oldValue: null,
        newValue: String(blockedId),
        comment: `Added blocked bug #${blockedId}`,
      });

      await recordActivity(dummyClient, {
        bugId: blockedId,
        whoId: request.user!.id,
        field: 'depends_on',
        oldValue: null,
        newValue: String(blockingId),
        comment: `Added blocker bug #${blockingId}`,
      });

      return reply.code(201).send({
        blocking_bug_id: blockingId,
        blocked_bug_id: blockedId,
      });
    }
  );

  // DELETE /bugs/:id/dependencies/:blocked_id
  app.delete<{ Params: { id: string; blocked_id: string } }>(
    '/bugs/:id/dependencies/:blocked_id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string; blocked_id: string } }>, reply: FastifyReply) => {
      const blockingId = Number(request.params.id);
      const blockedId = Number(request.params.blocked_id);

      if (isNaN(blockingId) || isNaN(blockedId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug IDs must be numeric' });
      }

      const delRes = await db.query(
        `DELETE FROM bug_dependencies WHERE blocking_bug_id = $1 AND blocked_bug_id = $2`,
        [blockingId, blockedId]
      );

      if ((delRes.rowCount ?? 0) > 0) {
        const dummyClient = {
          query: (text: string, params?: any[]) => db.query(text, params),
        } as any;

        await recordActivity(dummyClient, {
          bugId: blockingId,
          whoId: request.user!.id,
          field: 'blocks',
          oldValue: String(blockedId),
          newValue: null,
          comment: `Removed blocked bug #${blockedId}`,
        });

        await recordActivity(dummyClient, {
          bugId: blockedId,
          whoId: request.user!.id,
          field: 'depends_on',
          oldValue: String(blockingId),
          newValue: null,
          comment: `Removed blocker bug #${blockingId}`,
        });
      }

      return reply.code(204).send();
    }
  );

  // GET /bugs/:id/graph
  app.get<{ Params: { id: string } }>(
    '/bugs/:id/graph',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      // Check root bug exists
      const bugCheck = await db.query(`SELECT id FROM bugs WHERE id = $1`, [bugId]);
      if (bugCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'BUG_NOT_FOUND', message: 'Bug not found' });
      }

      // Fetch all dependencies to compute reachable graph
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

      const nodeIds = [...reachableSet];
      const placeholders = nodeIds.map((_, i) => `$${i + 1}`).join(', ');
      const { rows: nodes } = await db.query(
        `SELECT id, summary, status, priority, severity, estimated_time
         FROM bugs
         WHERE id IN (${placeholders})`,
        nodeIds
      );

      const formattedNodes = nodes.map(n => ({
        id: Number(n.id),
        summary: n.summary,
        status: n.status,
        priority: n.priority,
        severity: n.severity,
        estimated_time: Number(n.estimated_time) || 1,
      }));

      // Edges between reachable nodes
      const edges: { blockingId: number; blockedId: number }[] = [];
      for (const row of allDepsRes.rows) {
        const u = Number(row.blocking_bug_id);
        const v = Number(row.blocked_bug_id);
        if (reachableSet.has(u) && reachableSet.has(v)) {
          edges.push({ blockingId: u, blockedId: v });
        }
      }

      const cpmNodes = formattedNodes.map(n => ({
        id: n.id,
        estimatedTime: n.estimated_time,
        status: n.status,
      }));

      const criticalPathIds = computeCPM(cpmNodes, edges);

      return reply.code(200).send({
        nodes: formattedNodes,
        edges,
        criticalPathIds,
      });
    }
  );
}
