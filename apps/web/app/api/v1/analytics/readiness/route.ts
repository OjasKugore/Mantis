import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { computeCPM } from '@/lib/services/cpm';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get('milestone') || '128.0';
    const scope = searchParams.get('scope');

    const user = await getCurrentUser();
    const userId = user?.id ?? null;
    const isDemo = scope === 'demo' || (!scope && !user) || (user && (user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local'));

    let sandboxClause = '';
    const sandboxParams: any[] = [];
    let pIdx = 2;

    if (scope === 'user' || (user && !isDemo)) {
      if (user?.team_name) {
        sandboxClause = ` AND reporter_id IN (SELECT id FROM users WHERE team_name = $${pIdx++} AND email NOT LIKE '%@mozilla.com' AND email != 'admin@mantis.local')`;
        sandboxParams.push(user.team_name);
      } else if (userId) {
        sandboxClause = ` AND reporter_id = $${pIdx++}`;
        sandboxParams.push(userId);
      } else {
        sandboxClause = ` AND 1=0`;
      }
    } else {
      sandboxClause = ` AND reporter_id IN (SELECT id FROM users WHERE email LIKE '%@mozilla.com' OR email = 'admin@mantis.local')`;
    }

    const baseParams = [milestoneId, ...sandboxParams];

    // 1. Fetch total bugs and unresolved bugs for this milestone in this sandbox
    const totalRes = await db.query(
      `SELECT id, status FROM bugs WHERE ($1 = 'all' OR target_milestone = $1 OR ($1 = '128.0' AND target_milestone IN ('128.0', '---')))${sandboxClause}`,
      baseParams
    );

    const bSandboxClause = sandboxClause.replace(/reporter_id/g, 'b.reporter_id');
    const { rows: unresolvedBugs } = await db.query(
      `SELECT b.id, b.summary, b.status, b.priority, b.severity, b.cvss_severity, b.cvss_score, b.estimated_time
       FROM bugs b
       WHERE ($1 = 'all' OR b.target_milestone = $1 OR ($1 = '128.0' AND b.target_milestone IN ('128.0', '---')))
         AND b.status NOT IN ('RESOLVED', 'VERIFIED', 'CLOSED')${bSandboxClause}`,
      baseParams
    );

    // 2. Fetch all dependencies relating to bugs in this milestone and sandbox
    const { rows: deps } = await db.query(
      `SELECT blocking_bug_id, blocked_bug_id
       FROM bug_dependencies
       WHERE blocking_bug_id IN (SELECT id FROM bugs WHERE ($1 = 'all' OR target_milestone = $1 OR ($1 = '128.0' AND target_milestone IN ('128.0', '---')))${sandboxClause})
          OR blocked_bug_id IN (SELECT id FROM bugs WHERE ($1 = 'all' OR target_milestone = $1 OR ($1 = '128.0' AND target_milestone IN ('128.0', '---')))${sandboxClause})`,
      baseParams
    );

    // 3. Fetch pending blocking flags ('?') on milestone bugs in this sandbox
    const { rows: pendingFlags } = await db.query(
      `SELECT f.id, f.bug_id, ft.name as flag_name
       FROM flags f
       JOIN bugs b ON b.id = f.bug_id
       JOIN flag_types ft ON ft.id = f.type_id
       WHERE ($1 = 'all' OR b.target_milestone = $1 OR ($1 = '128.0' AND b.target_milestone IN ('128.0', '---')))
         AND f.status = '?'${bSandboxClause}`,
      baseParams
    );

    // 4. Compute critical path across milestone bugs
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

    const baseScore = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - penalties * 0.5)));

    const status = finalScore >= 85 ? 'READY_FOR_RELEASE' : finalScore >= 60 ? 'NEEDS_ATTENTION' : 'BLOCKED';

    return NextResponse.json({
      milestone: milestoneId,
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
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'READINESS_FAILED', message: err.message }, { status: 500 });
  }
}
