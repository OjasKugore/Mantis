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
    const groupFilter = applyGroupFilter(user?.id ?? null, 2);

    const params: any[] = [`%${q.trim()}%`];
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
