import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { computeCPM } from '@/lib/services/cpm';
import { getCurrentUser } from '@/lib/services/auth';

export const dynamic = 'force-dynamic';

function getSandboxFilter(user: any, scope: string | null, startIndex: number = 1): { clause: string; params: any[]; nextIndex: number } {
  const userId = user?.id ?? null;
  const isDemo = scope === 'demo' || (!scope && !user) || (user && (user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local'));

  if (scope === 'user' || (user && !isDemo)) {
    if (user?.team_name) {
      return {
        clause: ` AND reporter_id IN (SELECT id FROM users WHERE team_name = $${startIndex} AND email NOT LIKE '%@mozilla.com' AND email != 'admin@mantis.local')`,
        params: [user.team_name],
        nextIndex: startIndex + 1,
      };
    } else if (userId) {
      return {
        clause: ` AND reporter_id = $${startIndex}`,
        params: [userId],
        nextIndex: startIndex + 1,
      };
    } else {
      return {
        clause: ` AND 1=0`,
        params: [],
        nextIndex: startIndex,
      };
    }
  } else {
    return {
      clause: ` AND reporter_id IN (SELECT id FROM users WHERE email LIKE '%@mozilla.com' OR email = 'admin@mantis.local')`,
      params: [],
      nextIndex: startIndex,
    };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get('milestone') || 'all';
    const productId = searchParams.get('product') || searchParams.get('productId') || 'all';
    const scope = searchParams.get('scope');

    const user = await getCurrentUser();
    const isDemo = scope === 'demo' || (!scope && !user) || (user && (user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local'));

    // 1. Fetch available products in this sandbox
    let prodQuery = `SELECT id, name FROM products`;
    const prodParams: any[] = [];
    if (isDemo) {
      prodQuery += ` WHERE team_name = 'Mozilla' OR team_name IS NULL OR id IN (1, 2, 3) OR LOWER(name) IN ('firefox', 'thunderbird', 'core')`;
    } else if (user?.team_name) {
      prodQuery += ` WHERE (team_name = $1 OR (team_name IS NULL AND description ILIKE $2) OR classification_id IN (SELECT id FROM classifications WHERE name ILIKE $1)) AND LOWER(name) NOT IN ('firefox', 'thunderbird', 'core')`;
      prodParams.push(user.team_name, `%${user.team_name}%`);
    } else if (user?.id) {
      prodQuery += ` WHERE (team_name = $1 OR team_name = $2) AND LOWER(name) NOT IN ('firefox', 'thunderbird', 'core')`;
      prodParams.push(user.email, user.username);
    } else {
      prodQuery += ` WHERE team_name = 'Mozilla' OR id IN (1, 2, 3) OR LOWER(name) IN ('firefox', 'thunderbird', 'core')`;
    }
    prodQuery += ` ORDER BY name ASC`;
    const { rows: productRows } = await db.query(prodQuery, prodParams);
    const availableProducts = productRows.map((r: any) => ({ id: Number(r.id), name: r.name }));

    // 2. Build sandbox and product filter conditions
    let pIdx = 2; // $1 is milestoneId
    let productClause = '';
    const extraParams: any[] = [];

    if (productId !== 'all') {
      const pIdNum = parseInt(productId, 10);
      if (!isNaN(pIdNum)) {
        productClause = ` AND product_id = $${pIdx++}`;
        extraParams.push(pIdNum);
      }
    }

    const { clause: sandboxClause, params: sandboxParams } = getSandboxFilter(user, scope, pIdx);
    const baseParams = [milestoneId, ...extraParams, ...sandboxParams];

    const milestoneFilter = `($1 = 'all' OR target_milestone = $1 OR ($1 = '128.0' AND target_milestone IN ('128.0', '---')))`;
    const bMilestoneFilter = `($1 = 'all' OR b.target_milestone = $1 OR ($1 = '128.0' AND b.target_milestone IN ('128.0', '---')))`;
    const bProductClause = productClause.replace(/product_id/g, 'b.product_id');
    const bSandboxClause = sandboxClause.replace(/reporter_id/g, 'b.reporter_id');

    // 3. Fetch total bugs and unresolved bugs for this milestone and product in this sandbox
    const totalRes = await db.query(
      `SELECT id, status FROM bugs WHERE ${milestoneFilter}${productClause}${sandboxClause}`,
      baseParams
    );

    const { rows: unresolvedBugs } = await db.query(
      `SELECT b.id, b.summary, b.status, b.priority, b.severity, b.cvss_severity, b.cvss_score, b.estimated_time, b.product_id
       FROM bugs b
       WHERE ${bMilestoneFilter}${bProductClause}
         AND b.status NOT IN ('RESOLVED', 'VERIFIED', 'CLOSED')${bSandboxClause}`,
      baseParams
    );

    // 4. Fetch all dependencies relating to bugs in this milestone, product, and sandbox
    const { rows: deps } = await db.query(
      `SELECT blocking_bug_id, blocked_bug_id
       FROM bug_dependencies
       WHERE blocking_bug_id IN (SELECT id FROM bugs WHERE ${milestoneFilter}${productClause}${sandboxClause})
          OR blocked_bug_id IN (SELECT id FROM bugs WHERE ${milestoneFilter}${productClause}${sandboxClause})`,
      baseParams
    );

    // 5. Fetch pending blocking flags ('?') on scoped bugs in this sandbox
    const { rows: pendingFlags } = await db.query(
      `SELECT f.id, f.bug_id, ft.name as flag_name
       FROM flags f
       JOIN bugs b ON b.id = f.bug_id
       JOIN flag_types ft ON ft.id = f.type_id
       WHERE ${bMilestoneFilter}${bProductClause}
         AND f.status = '?'${bSandboxClause}`,
      baseParams
    );

    // 6. Compute critical path across scoped bugs
    const cpmNodes = unresolvedBugs.map((b: any) => ({
      id: Number(b.id),
      estimatedTime: Number(b.estimated_time) || 1,
      status: b.status,
    }));
    const cpmEdges = deps.map((d: any) => ({
      blockingId: Number(d.blocking_bug_id),
      blockedId: Number(d.blocked_bug_id),
    }));

    const criticalPath = unresolvedBugs.length > 0 ? computeCPM(cpmNodes, cpmEdges) : [];

    let penalties = 0;
    const breakdown: { label: string; penalty: number; count: number; impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' }[] = [];

    // Open CPM critical path bug penalty: -15 pts each
    const cpmCount = unresolvedBugs.filter((b: any) => criticalPath.includes(Number(b.id))).length;
    if (cpmCount > 0) {
      const p = cpmCount * 15;
      penalties += p;
      breakdown.push({ label: `Open Critical Path Blocker${cpmCount > 1 ? 's' : ''}`, penalty: p, count: cpmCount, impact: 'CRITICAL' });
    }

    // Unresolved CVSS CRITICAL penalty: -20 pts each
    const critCvss = unresolvedBugs.filter((b: any) => b.cvss_severity === 'CRITICAL').length;
    if (critCvss > 0) {
      const p = critCvss * 20;
      penalties += p;
      breakdown.push({ label: `Critical CVSS Vulnerabilit${critCvss > 1 ? 'ies' : 'y'}`, penalty: p, count: critCvss, impact: 'CRITICAL' });
    }

    // Unresolved CVSS HIGH penalty: -10 pts each
    const highCvss = unresolvedBugs.filter((b: any) => b.cvss_severity === 'HIGH').length;
    if (highCvss > 0) {
      const p = highCvss * 10;
      penalties += p;
      breakdown.push({ label: `High CVSS Vulnerabilit${highCvss > 1 ? 'ies' : 'y'}`, penalty: p, count: highCvss, impact: 'HIGH' });
    }

    // Pending blocking flags ('?'): -5 pts each
    const flagsCount = pendingFlags.length;
    if (flagsCount > 0) {
      const p = flagsCount * 5;
      penalties += p;
      breakdown.push({ label: `Pending Blocking Review Flag${flagsCount > 1 ? 's' : ''}`, penalty: p, count: flagsCount, impact: 'MEDIUM' });
    }

    // Unresolved Priority P1 / Blocker bug: -8 pts each
    const p1Count = unresolvedBugs.filter((b: any) => b.priority === 'P1' || b.severity === 'blocker').length;
    if (p1Count > 0) {
      const p = p1Count * 8;
      penalties += p;
      breakdown.push({ label: `Unresolved P1 / Blocker Defect${p1Count > 1 ? 's' : ''}`, penalty: p, count: p1Count, impact: 'HIGH' });
    }

    const totalCount = totalRes.rows.length;
    const resolvedCount = totalRes.rows.filter((b: any) => ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(b.status)).length;
    const unresolvedCount = unresolvedBugs.length;

    // 7. Fetch all available milestones in this sandbox (starting at $1)
    let msIdx = 1;
    let msProductClause = '';
    const msParamsList: any[] = [];
    if (productId !== 'all') {
      const pIdNum = parseInt(productId, 10);
      if (!isNaN(pIdNum)) {
        msProductClause = ` AND product_id = $${msIdx++}`;
        msParamsList.push(pIdNum);
      }
    }
    const { clause: msClause, params: msSandboxParams } = getSandboxFilter(user, scope, msIdx);
    const { rows: milestoneRows } = await db.query(
      `SELECT DISTINCT target_milestone FROM bugs WHERE 1=1${msProductClause}${msClause}`,
      [...msParamsList, ...msSandboxParams]
    );
    const availableMilestones = Array.from(
      new Set(milestoneRows.map((r: any) => r.target_milestone).filter(Boolean))
    );

    if (totalCount === 0) {
      return NextResponse.json({
        milestone: milestoneId,
        productId,
        score: null,
        status: 'NO_DEFECTS',
        totalIssues: 0,
        resolvedIssues: 0,
        unresolvedIssues: 0,
        criticalPathIds: [],
        penalties: 0,
        breakdown: [],
        unresolvedBugs: [],
        availableMilestones,
        availableProducts,
      });
    }

    const baseScore = Math.round((resolvedCount / totalCount) * 100);
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - penalties * 0.5)));
    const status = finalScore >= 85 ? 'READY_FOR_RELEASE' : finalScore >= 60 ? 'NEEDS_ATTENTION' : 'BLOCKED';

    return NextResponse.json({
      milestone: milestoneId,
      productId,
      score: finalScore,
      status,
      totalIssues: totalCount,
      resolvedIssues: resolvedCount,
      unresolvedIssues: unresolvedCount,
      criticalPathIds: criticalPath,
      penalties,
      breakdown,
      unresolvedBugs: unresolvedBugs.map((b: any) => ({
        id: b.id,
        summary: b.summary,
        status: b.status,
        priority: b.priority,
        severity: b.severity,
        cvss_severity: b.cvss_severity,
        is_on_critical_path: criticalPath.includes(Number(b.id)),
      })),
      availableMilestones,
      availableProducts,
    });
  } catch (err: any) {
    console.error('Readiness computation error:', err);
    return NextResponse.json({ error: 'READINESS_FAILED', message: err.message }, { status: 500 });
  }
}
