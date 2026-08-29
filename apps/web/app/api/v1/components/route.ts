import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    let query = `SELECT id, name, product_id, description, is_active FROM components WHERE is_active = TRUE`;
    const params: any[] = [];

    if (productId) {
      query += ` AND product_id = $1`;
      params.push(parseInt(productId, 10));
    }

    query += ` ORDER BY id ASC`;

    const { rows } = await db.query(query, params);
    return NextResponse.json(rows.map((r: any) => ({ ...r, id: Number(r.id), product_id: Number(r.product_id) })));
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
