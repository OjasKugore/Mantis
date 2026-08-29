import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function GET() {
  try {
    const { rows } = await db.query(
      `SELECT id, name, description, target_type, is_requestable, is_requesteeble
       FROM flag_types
       ORDER BY id ASC`
    );

    return NextResponse.json(rows.map((r: any) => ({ ...r, id: Number(r.id) })));
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
