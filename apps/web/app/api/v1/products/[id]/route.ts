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
      // Check duplicate name (excluding self)
      const dup = await db.query(`SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND id != $2`, [name, id]);
      if (dup.rows.length > 0) {
        return NextResponse.json({ error: 'CONFLICT', message: `A product named "${name}" already exists` }, { status: 409 });
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
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING id, name, description, is_active, default_milestone`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ ...rows[0], id: Number(rows[0].id) });
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

    // Soft-delete: set is_active = false (preserves bug history)
    const { rows } = await db.query(
      `UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING id, name`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: `Product "${rows[0].name}" deactivated`, id: Number(rows[0].id) });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
