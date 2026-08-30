import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser, canUserAccessBug } from '@/lib/services/auth';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const bugId = parseInt(params.id, 10);
    if (isNaN(bugId)) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Bug ID must be an integer' }, { status: 400 });
    }

    const user = await getCurrentUser();
    const hasAccess = await canUserAccessBug(bugId, user?.id ?? null);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const res = await db.query(
      `SELECT kd.id, kd.name, kd.description
       FROM bug_keywords bk
       JOIN keyword_defs kd ON kd.id = bk.keyword_id
       WHERE bk.bug_id = $1
       ORDER BY kd.name ASC`,
      [bugId]
    );

    return NextResponse.json({ keywords: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: 'DB_ERROR', message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const bugId = parseInt(params.id, 10);
    if (isNaN(bugId)) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Bug ID must be an integer' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const hasAccess = await canUserAccessBug(bugId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const body = await request.json();
    let keywordId = body.keyword_id;
    const keywordName = body.keyword_name ? String(body.keyword_name).trim().toLowerCase() : null;

    if (!keywordId && keywordName) {
      // Find or create keyword_def
      const findRes = await db.query(`SELECT id FROM keyword_defs WHERE name = $1`, [keywordName]);
      if (findRes.rows.length > 0) {
        keywordId = findRes.rows[0].id;
      } else {
        const createRes = await db.query(
          `INSERT INTO keyword_defs (name, description) VALUES ($1, $2) RETURNING id`,
          [keywordName, `User tagged keyword "${keywordName}"`]
        );
        keywordId = createRes.rows[0].id;
      }
    }

    if (!keywordId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Keyword ID or name required' }, { status: 400 });
    }

    await db.query(
      `INSERT INTO bug_keywords (bug_id, keyword_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [bugId, keywordId]
    );

    // Record in activity log
    const kdRes = await db.query(`SELECT name FROM keyword_defs WHERE id = $1`, [keywordId]);
    const kwName = kdRes.rows[0]?.name || String(keywordId);
    await db.query(
      `INSERT INTO bugs_activity (bug_id, who, field_name, removed, added) VALUES ($1, $2, 'keywords', '', $3)`,
      [bugId, user.id, kwName]
    );

    const updatedRes = await db.query(
      `SELECT kd.id, kd.name, kd.description
       FROM bug_keywords bk
       JOIN keyword_defs kd ON kd.id = bk.keyword_id
       WHERE bk.bug_id = $1
       ORDER BY kd.name ASC`,
      [bugId]
    );

    return NextResponse.json({ success: true, keywords: updatedRes.rows });
  } catch (err: any) {
    return NextResponse.json({ error: 'DB_ERROR', message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const bugId = parseInt(params.id, 10);
    if (isNaN(bugId)) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Bug ID must be an integer' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const hasAccess = await canUserAccessBug(bugId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const keywordId = searchParams.get('keyword_id');
    if (!keywordId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'keyword_id parameter required' }, { status: 400 });
    }

    const kdRes = await db.query(`SELECT name FROM keyword_defs WHERE id = $1`, [keywordId]);
    const kwName = kdRes.rows[0]?.name || String(keywordId);

    await db.query(`DELETE FROM bug_keywords WHERE bug_id = $1 AND keyword_id = $2`, [bugId, keywordId]);

    // Record in activity log
    await db.query(
      `INSERT INTO bugs_activity (bug_id, who, field_name, removed, added) VALUES ($1, $2, 'keywords', $3, '')`,
      [bugId, user.id, kwName]
    );

    const updatedRes = await db.query(
      `SELECT kd.id, kd.name, kd.description
       FROM bug_keywords bk
       JOIN keyword_defs kd ON kd.id = bk.keyword_id
       WHERE bk.bug_id = $1
       ORDER BY kd.name ASC`,
      [bugId]
    );

    return NextResponse.json({ success: true, keywords: updatedRes.rows });
  } catch (err: any) {
    return NextResponse.json({ error: 'DB_ERROR', message: err.message }, { status: 500 });
  }
}
