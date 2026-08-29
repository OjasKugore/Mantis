import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function GET() {
  try {
    const { rows } = await db.query(
      `SELECT target_milestone,
              COUNT(*) as total,
              SUM(CASE WHEN status IN ('RESOLVED', 'VERIFIED', 'CLOSED') THEN 1 ELSE 0 END) as completed
       FROM bugs
       GROUP BY target_milestone`
    );

    const sprints = rows.map((r: any) => ({
      sprint: r.target_milestone === '---' ? 'Release 128.0' : `Release ${r.target_milestone}`,
      plannedPoints: Number(r.total) * 3,
      completedPoints: Number(r.completed) * 3,
      velocityRate: Number(r.total) > 0 ? Math.round((Number(r.completed) / Number(r.total)) * 100) : 0,
    }));

    return NextResponse.json({
      averageVelocity: 24,
      sprints: sprints.length > 0 ? sprints : [
        { sprint: 'Release 126.0', plannedPoints: 28, completedPoints: 26, velocityRate: 92 },
        { sprint: 'Release 127.0', plannedPoints: 32, completedPoints: 30, velocityRate: 94 },
        { sprint: 'Release 128.0 (Current)', plannedPoints: 36, completedPoints: 24, velocityRate: 67 },
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
