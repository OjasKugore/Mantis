import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    if (!user.is_admin) return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const name = body.name?.trim();
    const description = body.description?.trim() || '';
    const productId = body.product_id ? parseInt(body.product_id, 10) : null;

    if (!name || name.length < 1 || name.length > 64) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Component name is required (1–64 characters)' }, { status: 400 });
    }

    if (!productId || isNaN(productId)) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'product_id is required' }, { status: 400 });
    }

    // Verify product exists
    const product = await db.query(`SELECT id FROM products WHERE id = $1 AND is_active = TRUE`, [productId]);
    if (product.rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Product not found or inactive' }, { status: 404 });
    }

    // Check for duplicate name within the same product
    const existing = await db.query(
      `SELECT id FROM components WHERE LOWER(name) = LOWER($1) AND product_id = $2`,
      [name, productId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'CONFLICT', message: `A component named "${name}" already exists in this product` }, { status: 409 });
    }

    const { rows } = await db.query(
      `INSERT INTO components (name, product_id, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, product_id, description, is_active`,
      [name, productId, description]
    );

    return NextResponse.json(
      { ...rows[0], id: Number(rows[0].id), product_id: Number(rows[0].product_id) },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
