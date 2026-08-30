import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

const SYSTEM_PRESETS = [
  { id: -1, name: '🔥 P1 Blockers', query_json: { status: 'all', priority: 'P1', severity: 'all', embargo: 'all' }, is_preset: true },
  { id: -2, name: '🔒 Security Embargoed', query_json: { status: 'all', priority: 'all', severity: 'all', embargo: 'embargoed' }, is_preset: true },
  { id: -3, name: '⚡ Needs Triage (Unconfirmed)', query_json: { status: 'UNCONFIRMED', priority: 'all', severity: 'all', embargo: 'all' }, is_preset: true },
  { id: -4, name: '🚀 In Progress', query_json: { status: 'IN_PROGRESS', priority: 'all', severity: 'all', embargo: 'all' }, is_preset: true },
  { id: -5, name: '✅ Resolved Fixed', query_json: { status: 'RESOLVED', priority: 'all', severity: 'all', embargo: 'all' }, is_preset: true },
];

export async function GET() {
  try {
    const user = await getCurrentUser();
    let userViews: any[] = [];

    if (user) {
      const res = await db.query(
        `SELECT id, name, query_json, false as is_preset
         FROM named_queries
         WHERE user_id = $1
         ORDER BY id DESC`,
        [user.id]
      );
      userViews = res.rows;
    }

    const allViews = [...SYSTEM_PRESETS, ...userViews];
    return NextResponse.json({ views: allViews });
  } catch (err: any) {
    return NextResponse.json({ views: SYSTEM_PRESETS });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const name = (body.name || '').trim();
    const queryJson = body.query_json;

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'View name must be at least 2 characters' }, { status: 400 });
    }

    if (!queryJson || typeof queryJson !== 'object') {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Invalid query configuration' }, { status: 400 });
    }

    const res = await db.query(
      `INSERT INTO named_queries (user_id, name, query_json)
       VALUES ($1, $2, $3)
       RETURNING id, name, query_json`,
      [user.id, name, JSON.stringify(queryJson)]
    );

    return NextResponse.json({
      success: true,
      view: { ...res.rows[0], is_preset: false },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'DB_ERROR', message: err.message }, { status: 500 });
  }
}
