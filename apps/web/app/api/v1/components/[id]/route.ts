import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    if (!user.is_admin) return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name || name.length > 64) {
        return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Name must be 1–64 characters' }, { status: 400 });
      }
      // Get the product_id of this component to scope duplicate check
      const comp = await db.query(`SELECT product_id FROM components WHERE id = $1`, [id]);
      if (comp.rows.length === 0) {
        return NextResponse.json({ error: 'NOT_FOUND', message: 'Component not found' }, { status: 404 });
      }
      const productId = comp.rows[0].product_id;
      const dup = await db.query(
        `SELECT id FROM components WHERE LOWER(name) = LOWER($1) AND product_id = $2 AND id != $3`,
        [name, productId, id]
      );
      if (dup.rows.length > 0) {
        return NextResponse.json({ error: 'CONFLICT', message: `A component named "${name}" already exists in this product` }, { status: 409 });
      }
      values.push(name);
      updates.push(`name = $${values.length}`);
    }

    if (body.description !== undefined) {
      values.push(body.description.trim());
      updates.push(`description = $${values.length}`);
    }

    if (body.is_active !== undefined) {
      values.push(Boolean(body.is_active));
      updates.push(`is_active = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const { rows } = await db.query(
      `UPDATE components SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING id, name, product_id, description, is_active`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Component not found' }, { status: 404 });
    }

    return NextResponse.json({ ...rows[0], id: Number(rows[0].id), product_id: Number(rows[0].product_id) });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    if (!user.is_admin) return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });

    const { rows } = await db.query(
      `UPDATE components SET is_active = FALSE WHERE id = $1 RETURNING id, name`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Component not found' }, { status: 404 });
    }

    return NextResponse.json({ message: `Component "${rows[0].name}" deactivated`, id: Number(rows[0].id) });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
