import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser, applyGroupFilter } from '@/lib/services/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length < 3) {
      return NextResponse.json({ duplicates: [] });
    }

    const user = await getCurrentUser();
    const userId = user?.id ?? null;
    const isDemo = !user || user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local';

    let sandboxClause = '';
    const params: any[] = [`%${q.trim()}%`];
    let pIdx = 2;

    if (user && !isDemo) {
      if (user?.team_name) {
        sandboxClause = ` AND b.reporter_id IN (SELECT id FROM users WHERE team_name = $${pIdx++} AND email NOT LIKE '%@mozilla.com' AND email != 'admin@mantis.local')`;
        params.push(user.team_name);
      } else if (userId) {
        sandboxClause = ` AND b.reporter_id = $${pIdx++}`;
        params.push(userId);
      } else {
        sandboxClause = ` AND 1=0`;
      }
    } else {
      sandboxClause = ` AND b.reporter_id IN (SELECT id FROM users WHERE email LIKE '%@mozilla.com' OR email = 'admin@mantis.local')`;
    }

    const groupFilter = applyGroupFilter(user?.id ?? null, pIdx);
    if (groupFilter.param) {
      params.push(groupFilter.param);
    }

    const { rows } = await db.query(
      `SELECT b.id, b.summary, b.status, b.priority, b.severity,
              p.name as product_name, c.name as component_name
       FROM bugs b
       LEFT JOIN products p ON p.id = b.product_id
       LEFT JOIN components c ON c.id = b.component_id
       WHERE (b.summary ILIKE $1 OR b.description ILIKE $1)
       ${sandboxClause}
       ${groupFilter.fragment}
       ORDER BY b.id DESC
       LIMIT 5`,
      params
    );

    return NextResponse.json({
      duplicates: rows.map((r: any) => ({ ...r, id: Number(r.id) })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
