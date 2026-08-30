import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser, canUserAccessBug } from '@/lib/services/auth';
import { recordActivity } from '@/lib/services/audit';

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
      `SELECT u.id, u.display_name, u.email, u.avatar_url
       FROM bug_cc bc
       JOIN users u ON u.id = bc.user_id
       WHERE bc.bug_id = $1
       ORDER BY u.display_name ASC`,
      [bugId]
    );

    const isWatching = user ? res.rows.some((r: any) => r.id === user.id) : false;

    return NextResponse.json({
      cc_list: res.rows,
      is_watching: isWatching,
      total: res.rows.length,
    });
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

    let targetUserId = user.id;
    try {
      const body = await request.json();
      if (body.user_id) targetUserId = body.user_id;
    } catch {
      // Default to current user
    }

    await db.query(
      `INSERT INTO bug_cc (bug_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [bugId, targetUserId]
    );

    const targetUserRes = await db.query(`SELECT display_name, email FROM users WHERE id = $1`, [targetUserId]);
    const targetName = targetUserRes.rows[0]?.display_name || targetUserRes.rows[0]?.email || targetUserId;

    await recordActivity(db, {
      bugId,
      whoId: user.id,
      field: 'cc',
      oldValue: '',
      newValue: targetName,
    });

    const res = await db.query(
      `SELECT u.id, u.display_name, u.email, u.avatar_url
       FROM bug_cc bc
       JOIN users u ON u.id = bc.user_id
       WHERE bc.bug_id = $1
       ORDER BY u.display_name ASC`,
      [bugId]
    );

    return NextResponse.json({
      success: true,
      cc_list: res.rows,
      is_watching: true,
      total: res.rows.length,
    });
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
    const targetUserId = searchParams.get('user_id') || user.id;

    const targetUserRes = await db.query(`SELECT display_name, email FROM users WHERE id = $1`, [targetUserId]);
    const targetName = targetUserRes.rows[0]?.display_name || targetUserRes.rows[0]?.email || targetUserId;

    await db.query(`DELETE FROM bug_cc WHERE bug_id = $1 AND user_id = $2`, [bugId, targetUserId]);

    await recordActivity(db, {
      bugId,
      whoId: user.id,
      field: 'cc',
      oldValue: targetName,
      newValue: '',
    });

    const res = await db.query(
      `SELECT u.id, u.display_name, u.email, u.avatar_url
       FROM bug_cc bc
       JOIN users u ON u.id = bc.user_id
       WHERE bc.bug_id = $1
       ORDER BY u.display_name ASC`,
      [bugId]
    );

    return NextResponse.json({
      success: true,
      cc_list: res.rows,
      is_watching: false,
      total: res.rows.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'DB_ERROR', message: err.message }, { status: 500 });
  }
}
