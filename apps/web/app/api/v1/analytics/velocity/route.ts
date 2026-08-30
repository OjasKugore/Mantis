import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    const user = await getCurrentUser();
    const userId = user?.id ?? null;
    const isDemo = scope === 'demo' || (!scope && !user) || (user && (user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local'));

    let sandboxClause = '';
    const params: any[] = [];
    let pIdx = 1;

    if (scope === 'user' || (user && !isDemo)) {
      if (user?.team_name) {
        sandboxClause = ` WHERE reporter_id IN (SELECT id FROM users WHERE team_name = $${pIdx++} AND email NOT LIKE '%@mozilla.com' AND email != 'admin@mantis.local')`;
        params.push(user.team_name);
      } else if (userId) {
        sandboxClause = ` WHERE reporter_id = $${pIdx++}`;
        params.push(userId);
      } else {
        sandboxClause = ` WHERE 1=0`;
      }
    } else {
      sandboxClause = ` WHERE reporter_id IN (SELECT id FROM users WHERE email LIKE '%@mozilla.com' OR email = 'admin@mantis.local')`;
    }

    const { rows } = await db.query(
      `SELECT target_milestone,
              COUNT(*) as total,
              SUM(CASE WHEN status IN ('RESOLVED', 'VERIFIED', 'CLOSED') THEN 1 ELSE 0 END) as completed
       FROM bugs
       ${sandboxClause}
       GROUP BY target_milestone`,
      params
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
