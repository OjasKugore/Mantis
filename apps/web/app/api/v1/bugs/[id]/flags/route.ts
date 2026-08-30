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

    const { rows } = await db.query(
      `SELECT f.id, f.type_id, f.status, f.bug_id, f.attach_id, f.setter_id, f.requestee_id,
              f.created_at, f.updated_at,
              ft.name as type_name, ft.description as type_description, ft.target_type,
              setter.username as setter_username, setter.display_name as setter_display_name,
              req.username as requestee_username, req.display_name as requestee_display_name
       FROM flags f
       JOIN flag_types ft ON ft.id = f.type_id
       JOIN users setter ON setter.id = f.setter_id
       LEFT JOIN users req ON req.id = f.requestee_id
       WHERE f.bug_id = $1
       ORDER BY f.created_at DESC`,
      [bugId]
    );

    return NextResponse.json(rows.map((r: any) => ({ ...r, id: Number(r.id), bug_id: Number(r.bug_id) })));
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
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
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Must be logged in to set flags' }, { status: 401 });
    }

    const hasAccess = await canUserAccessBug(bugId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body.status && ['?', '+', '-'].includes(body.status) ? body.status : '?';

    let typeId: number | null = null;
    let typeName: string = '';

    if (body.type_id) {
      typeId = Number(body.type_id);
      const ftRes = await db.query(`SELECT id, name FROM flag_types WHERE id = $1`, [typeId]);
      if (ftRes.rows.length > 0) {
        typeName = ftRes.rows[0].name;
      } else {
        return NextResponse.json({ error: 'INVALID_FLAG_TYPE', message: `Unknown flag type ID: ${typeId}` }, { status: 400 });
      }
    } else if (body.type_name) {
      const ftRes = await db.query(`SELECT id, name FROM flag_types WHERE name = $1`, [body.type_name]);
      if (ftRes.rows.length > 0) {
        typeId = Number(ftRes.rows[0].id);
        typeName = ftRes.rows[0].name;
      } else {
        return NextResponse.json({ error: 'INVALID_FLAG_TYPE', message: `Unknown flag type: "${body.type_name}"` }, { status: 400 });
      }
    } else {
      // Default to first available flag type (e.g. needinfo)
      const ftRes = await db.query(`SELECT id, name FROM flag_types ORDER BY id ASC LIMIT 1`);
      if (ftRes.rows.length > 0) {
        typeId = Number(ftRes.rows[0].id);
        typeName = ftRes.rows[0].name;
      }
    }

    if (!typeId) {
      return NextResponse.json({ error: 'INVALID_FLAG_TYPE', message: 'No valid flag type found' }, { status: 400 });
    }

    let requesteeId: string | null = null;
    if (body.requestee_id) {
      const uRes = await db.query(`SELECT id FROM users WHERE id = $1`, [body.requestee_id]);
      if (uRes.rows.length > 0) {
        requesteeId = uRes.rows[0].id;
      }
    } else if (body.requestee_username) {
      const cleanUsername = body.requestee_username.replace(/^@/, '');
      const reqRes = await db.query(`SELECT id FROM users WHERE username = $1`, [cleanUsername]);
      if (reqRes.rows.length > 0) {
        requesteeId = reqRes.rows[0].id;
      }
    }

    const { rows } = await db.query(
      `INSERT INTO flags (type_id, status, bug_id, setter_id, requestee_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [typeId, status, bugId, user.id, requesteeId]
    );

    const flag = rows[0];
    flag.id = Number(flag.id);
    flag.bug_id = Number(flag.bug_id);

    // Send notification if requested from someone
    if (requesteeId && requesteeId !== user.id) {
      await db.query(
        `INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)`,
        [
          requesteeId,
          'flag_request',
          JSON.stringify({
            bug_id: bugId,
            flag_name: typeName,
            setter_name: user.display_name,
          }),
        ]
      );
    }

    return NextResponse.json(flag, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
