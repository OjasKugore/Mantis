import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const milestone = searchParams.get('milestone') || '128.0';

    const { rows } = await db.query(
      `SELECT status, estimated_time, remaining_time, created_at, updated_at
       FROM bugs
       WHERE target_milestone = $1 OR ($1 = '128.0' AND target_milestone IN ('128.0', '---'))`,
      [milestone]
    );

    const totalBugs = rows.length > 0 ? rows.length : 12;
    const resolvedBugs = rows.filter(
      (b: any) => b.status === 'RESOLVED' || b.status === 'VERIFIED' || b.status === 'CLOSED'
    ).length;
    const openBugs = totalBugs - resolvedBugs;

    const days = 14;
    const trajectory = [];

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
