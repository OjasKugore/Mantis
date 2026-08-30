import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET() {
  try {
    const { rows } = await db.query(
      `SELECT id, name, description, is_active, default_milestone FROM products ORDER BY id ASC`
    );
    return NextResponse.json(rows.map((r: any) => ({ ...r, id: Number(r.id) })));
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
    const defaultMilestone = body.default_milestone?.trim() || '---';

    if (!name || name.length < 1 || name.length > 64) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Product name is required (1–64 characters)' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await db.query(`SELECT id FROM products WHERE LOWER(name) = LOWER($1)`, [name]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'CONFLICT', message: `A product named "${name}" already exists` }, { status: 409 });
    }

    // Ensure a classification exists (use first one or create default)
    let classId: number;
    const classRes = await db.query(`SELECT id FROM classifications LIMIT 1`);
    if (classRes.rows.length > 0) {
      classId = Number(classRes.rows[0].id);
    } else {
      const newClass = await db.query(
        `INSERT INTO classifications (name, sortkey) VALUES ('General', 0) RETURNING id`
      );
      classId = Number(newClass.rows[0].id);
    }

    const { rows } = await db.query(
      `INSERT INTO products (name, classification_id, description, default_milestone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, is_active, default_milestone`,
      [name, classId, description, defaultMilestone]
    );

    return NextResponse.json({ ...rows[0], id: Number(rows[0].id) }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
