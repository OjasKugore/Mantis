import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const milestone = searchParams.get('milestone') || '128.0';
    const scope = searchParams.get('scope');
    const user = await getCurrentUser();
    const userId = user?.id ?? null;

    let query = `
      SELECT status, estimated_time, remaining_time, created_at, updated_at
      FROM bugs
      WHERE (target_milestone = $1 OR ($1 = '128.0' AND target_milestone IN ('128.0', '---')))
    `;
    const params: any[] = [milestone];

    if (scope === 'user') {
      if (userId) {
        query += ` AND (reporter_id = $2 OR assignee_id = $2)`;
        params.push(userId);
      } else {
        query += ` AND 1=0`;
      }
    } else if (scope === 'demo') {
      query += ` AND (id <= 24 OR reporter_id IN (SELECT id FROM users WHERE email LIKE '%@mozilla.com' OR email = 'admin@mantis.local'))`;
    }

    const { rows } = await db.query(query, params);

    const totalBugs = rows.length;
    const resolvedBugs = rows.filter(
      (b: any) => b.status === 'RESOLVED' || b.status === 'VERIFIED' || b.status === 'CLOSED'
    ).length;
    const openBugs = totalBugs - resolvedBugs;

    const days = 14;
    const trajectory = [];

    if (totalBugs === 0) {
      for (let d = 0; d <= days; d++) {
        trajectory.push({
          day: `Day ${d}`,
          ideal: 0,
          actual: 0,
          remainingEffortHours: 0,
        });
      }
    } else {
      for (let d = 0; d <= days; d++) {
        const ideal = Math.max(0, Math.round(totalBugs * (1 - d / days)));

        let actual: number | null = null;
        if (d <= 9) {
          const resolvedFraction = Math.min(resolvedBugs, Math.floor((d / 9) * resolvedBugs));
          actual = totalBugs - resolvedFraction;
        }

        trajectory.push({
          day: `Day ${d}`,
          ideal,
          actual,
          remainingEffortHours: Math.round(openBugs * 3.5),
        });
      }
    }

    return NextResponse.json({
      milestone,
      totalBugs,
      resolvedCount: resolvedBugs,
      openCount: openBugs,
      trajectory,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
