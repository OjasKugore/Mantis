import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client.js';
import { computeCPM } from '../services/cpm.js';

export async function calculateMilestoneReadiness(milestoneId: string) {
  // 1. Fetch all unresolved bugs for this milestone
  const { rows: bugs } = await db.query(
    `SELECT b.id, b.summary, b.status, b.priority, b.severity, b.cvss_severity, b.estimated_time
     FROM bugs b
     WHERE b.target_milestone = $1 AND b.status NOT IN ('RESOLVED', 'VERIFIED', 'CLOSED')`,
    [milestoneId]
  );

  // 2. Fetch all dependencies relating to bugs in this milestone
  const { rows: deps } = await db.query(
    `SELECT blocking_bug_id, blocked_bug_id
     FROM bug_dependencies
     WHERE blocking_bug_id IN (SELECT id FROM bugs WHERE target_milestone = $1)
        OR blocked_bug_id IN (SELECT id FROM bugs WHERE target_milestone = $1)`,
    [milestoneId]
  );

  // 3. Fetch pending blocking flags ('?') on milestone bugs
  const { rows: pendingFlags } = await db.query(
    `SELECT f.id, f.bug_id
     FROM flags f
     JOIN bugs b ON b.id = f.bug_id
     WHERE b.target_milestone = $1 AND f.status = '?'`,
    [milestoneId]
  );

  // 4. Compute critical path across milestone bugs
  const cpmNodes = bugs.map((b: any) => ({
    id: Number(b.id),
    estimatedTime: Number(b.estimated_time) || 1,
    status: b.status,
  }));
  const cpmEdges = deps.map((d: any) => ({
    blockingId: Number(d.blocking_bug_id),
    blockedId: Number(d.blocked_bug_id),
  }));

  const criticalPath = computeCPM(cpmNodes, cpmEdges);

  let penalties = 0;
  const breakdown: { label: string; penalty: number }[] = [];

  // Open CPM critical path bug penalty: -15 pts each
  const cpmCount = bugs.filter((b: any) => criticalPath.includes(Number(b.id))).length;
  if (cpmCount > 0) {
    const p = cpmCount * 15;
    penalties += p;
    breakdown.push({ label: `${cpmCount} Open Critical Path Bugs`, penalty: p });
  }

  // Unresolved CVSS CRITICAL penalty: -20 pts each
  const critCvss = bugs.filter((b: any) => b.cvss_severity === 'CRITICAL').length;
  if (critCvss > 0) {
    const p = critCvss * 20;
    penalties += p;
    breakdown.push({ label: `${critCvss} Critical CVSS Vulnerabilities`, penalty: p });
  }

  // Unresolved CVSS HIGH penalty: -10 pts each
  const highCvss = bugs.filter((b: any) => b.cvss_severity === 'HIGH').length;
  if (highCvss > 0) {
    const p = highCvss * 10;
    penalties += p;
    breakdown.push({ label: `${highCvss} High CVSS Vulnerabilities`, penalty: p });
  }

  // Pending blocking flags ('?'): -5 pts each
  const flagsCount = pendingFlags.length;
  if (flagsCount > 0) {
    const p = flagsCount * 5;
    penalties += p;
    breakdown.push({ label: `${flagsCount} Pending Blocking Flags`, penalty: p });
  }

  // Unresolved Priority P1 / Blocker bug: -8 pts each
  const p1Count = bugs.filter((b: any) => b.priority === 'P1' || b.severity === 'blocker').length;
  if (p1Count > 0) {
    const p = p1Count * 8;
    penalties += p;
    breakdown.push({ label: `${p1Count} Unresolved P1 Blockers`, penalty: p });
  }

  const score = Math.max(0, 100 - penalties);
  return {
    milestone: milestoneId,
    score,
    penalties,
    breakdown,
    totalOpenBugs: bugs.length,
    criticalPathBugIds: criticalPath,
  };
}

export async function analyticsRoutes(app: FastifyInstance) {
  // GET /api/v1/milestones/:id/readiness
  app.get<{ Params: { id: string } }>('/milestones/:id/readiness', async (request, reply) => {
    const { id } = request.params;
    const readiness = await calculateMilestoneReadiness(id);
    return reply.send(readiness);
  });

  // GET /api/v1/analytics/milestones/:id/readiness
  app.get<{ Params: { id: string } }>('/analytics/milestones/:id/readiness', async (request, reply) => {
    const { id } = request.params;
    const readiness = await calculateMilestoneReadiness(id);
    return reply.send(readiness);
  });

  // GET /api/v1/analytics/velocity — Engineering MTTR & Velocity
  app.get('/analytics/velocity', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows } = await db.query(`
        SELECT 
            p.name AS product_name,
            COUNT(b.id)::int AS total_resolved,
            ROUND(AVG(EXTRACT(EPOCH FROM (ba.changed_at - b.created_at)) / 86400)::numeric, 1)::float AS avg_mttr_days,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ba.changed_at - b.created_at)) / 86400)::float AS median_mttr_days,
            COUNT(CASE WHEN b.priority IN ('P1','P2') THEN 1 END)::int AS high_priority_resolved
        FROM bugs b
        JOIN products p ON p.id = b.product_id
        JOIN bugs_activity ba ON ba.bug_id = b.id AND ba.field = 'status' AND ba.new_value = 'RESOLVED'
        WHERE ba.changed_at >= NOW() - INTERVAL '30 days'
        GROUP BY p.name;
      `);

      return reply.send({ velocity: rows });
    } catch (err: any) {
      // Fallback for database engines (or mocks) without PERCENTILE_CONT support
      try {
        const { rows: resolvedRows } = await db.query(`
          SELECT 
            p.name AS product_name,
            b.id AS bug_id,
            b.priority,
            b.created_at,
            ba.changed_at AS resolved_at
          FROM bugs b
          JOIN products p ON p.id = b.product_id
          JOIN bugs_activity ba ON ba.bug_id = b.id AND ba.field = 'status' AND ba.new_value = 'RESOLVED'
        `);

        // Group by product
        const byProduct = new Map<string, any[]>();
        for (const r of resolvedRows) {
          if (!byProduct.has(r.product_name)) {
            byProduct.set(r.product_name, []);
          }
          byProduct.get(r.product_name)!.push(r);
        }

        const velocity: any[] = [];
        for (const [productName, items] of byProduct.entries()) {
          const mttrs = items.map(item => {
            const diffMs = new Date(item.resolved_at).getTime() - new Date(item.created_at).getTime();
            return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
          }).sort((a, b) => a - b);

          const totalResolved = items.length;
          const avgMttr = totalResolved > 0 ? mttrs.reduce((a, b) => a + b, 0) / totalResolved : 0;
          const mid = Math.floor(mttrs.length / 2);
          const medianMttr = mttrs.length % 2 !== 0 ? mttrs[mid] : (mttrs[mid - 1] + mttrs[mid]) / 2;
          const highPriority = items.filter(item => item.priority === 'P1' || item.priority === 'P2').length;

          velocity.push({
            product_name: productName,
            total_resolved: totalResolved,
            avg_mttr_days: Math.round(avgMttr * 10) / 10,
            median_mttr_days: Math.round(medianMttr * 10) / 10,
            high_priority_resolved: highPriority,
          });
        }

        return reply.send({ velocity });
      } catch (innerErr) {
        return reply.send({ velocity: [] });
      }
    }
  });
}
