import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { getCurrentUser, canUserAccessBug } from '@/lib/services/auth';
import { recordActivity } from '@/lib/services/audit';

const UpdateBugSchema = z.object({
  summary: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional(),
  severity: z
    .enum(['blocker', 'critical', 'major', 'normal', 'minor', 'trivial', 'enhancement'])
    .optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  qa_contact_id: z.string().uuid().optional().nullable(),
  component_id: z.number().int().positive().optional(),
  version: z.string().optional(),
  target_milestone: z.string().optional(),
  estimated_time: z.number().nonnegative().optional(),
  remaining_time: z.number().nonnegative().optional(),
  deadline: z.string().datetime().optional().nullable(),
});

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
    const userId = user?.id ?? null;

    // Zero-leakage 404 security group isolation
    const hasAccess = await canUserAccessBug(bugId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const { rows } = await db.query(
      `SELECT b.*,
              p.name AS product_name,
              c.name AS component_name,
              rep.display_name AS reporter_name, rep.username AS reporter_username, rep.avatar_url AS reporter_avatar,
              asg.display_name AS assignee_name, asg.username AS assignee_username, asg.avatar_url AS assignee_avatar
       FROM bugs b
       LEFT JOIN products p ON p.id = b.product_id
       LEFT JOIN components c ON c.id = b.component_id
       LEFT JOIN users rep ON rep.id = b.reporter_id
       LEFT JOIN users asg ON asg.id = b.assignee_id
       WHERE b.id = $1`,
      [bugId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const bug = rows[0];
    bug.id = Number(bug.id);
    bug.product_id = Number(bug.product_id);
    bug.component_id = Number(bug.component_id);

    // Fetch activity log
    const activityRes = await db.query(
      `SELECT ba.id, ba.bug_id, ba.who_id, ba.changed_at, ba.field, ba.old_value, ba.new_value, ba.comment,
              u.display_name AS who_name, u.username AS who_username
       FROM bugs_activity ba
       JOIN users u ON u.id = ba.who_id
       WHERE ba.bug_id = $1
       ORDER BY ba.changed_at DESC`,
      [bugId]
    );
    bug.activity = activityRes.rows.map((a: any) => ({
      ...a,
      id: Number(a.id),
      bug_id: Number(a.bug_id),
    }));

    return NextResponse.json(bug);
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const bugId = parseInt(params.id, 10);
    if (isNaN(bugId)) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Bug ID must be an integer' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Must be logged in to update bug' }, { status: 401 });
    }

    const hasAccess = await canUserAccessBug(bugId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = UpdateBugSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid update payload',
        details: parseResult.error.flatten(),
      }, { status: 400 });
    }

    const updates = parseResult.data;
    const currentBugRes = await db.query(`SELECT * FROM bugs WHERE id = $1`, [bugId]);
    if (currentBugRes.rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }
    const currentBug = currentBugRes.rows[0];

    const fields: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = $${pIdx++}`);
        values.push(value);

        if (String(currentBug[key]) !== String(value)) {
          await recordActivity(db, {
            bugId,
            whoId: user.id,
            field: key,
            oldValue: String(currentBug[key] ?? ''),
            newValue: String(value ?? ''),
          });
        }
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ ...currentBug, id: Number(currentBug.id) });
    }

    fields.push(`updated_at = NOW()`);
    values.push(bugId);

    const { rows } = await db.query(
      `UPDATE bugs SET ${fields.join(', ')} WHERE id = $${pIdx} RETURNING *`,
      values
    );

    return NextResponse.json({ ...rows[0], id: Number(rows[0].id) });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
