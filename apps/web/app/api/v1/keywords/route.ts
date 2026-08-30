import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET() {
  try {
    const res = await db.query(`SELECT id, name, description FROM keyword_defs ORDER BY name ASC`);
    return NextResponse.json({ keywords: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: 'DB_ERROR', message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const name = (body.name || '').trim().toLowerCase();
    const description = (body.description || '').trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Keyword name must be at least 2 characters' }, { status: 400 });
    }

    const res = await db.query(
      `INSERT INTO keyword_defs (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id, name, description`,
      [name, description]
    );

    return NextResponse.json({ keyword: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'DB_ERROR', message: err.message }, { status: 500 });
  }
}
