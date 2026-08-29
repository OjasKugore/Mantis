import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { getCurrentUser, canUserAccessBug } from '@/lib/services/auth';
import { isValidTransition, validateResolution, BugStatus } from '@/lib/services/stateMachine';
import { recordActivity } from '@/lib/services/audit';

const UpdateStatusSchema = z.object({
  status: z.enum(['UNCONFIRMED', 'CONFIRMED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED']),
  resolution: z
    .enum(['', 'FIXED', 'INVALID', 'WONTFIX', 'DUPLICATE', 'WORKSFORME', 'INCOMPLETE'])
    .default(''),
  comment: z.string().optional(),
});

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const bugId = parseInt(params.id, 10);
    if (isNaN(bugId)) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Bug ID must be an integer' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Must be logged in to update status' }, { status: 401 });
    }

    const hasAccess = await canUserAccessBug(bugId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = UpdateStatusSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid status payload',
        details: parseResult.error.flatten(),
      }, { status: 400 });
    }

    const { status: newStatus, resolution: newResolution, comment } = parseResult.data;

    const bugRes = await db.query(`SELECT status, resolution FROM bugs WHERE id = $1`, [bugId]);
    if (bugRes.rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const currentBug = bugRes.rows[0];
    const currentStatus = currentBug.status as BugStatus;

    if (!isValidTransition(currentStatus, newStatus)) {
      return NextResponse.json({
        error: 'INVALID_TRANSITION',
        message: `Cannot transition bug from "${currentStatus}" to "${newStatus}"`,
      }, { status: 422 });
    }

    if (!validateResolution(newStatus, newResolution)) {
      return NextResponse.json({
        error: 'INVALID_RESOLUTION',
        message: `Resolution is required and must be valid for status "${newStatus}"`,
      }, { status: 422 });
    }

    const { rows } = await db.query(
      `UPDATE bugs
       SET status = $1, resolution = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newStatus, newResolution, bugId]
    );

    await recordActivity(db, {
      bugId,
      whoId: user.id,
      field: 'status',
      oldValue: currentStatus,
      newValue: newStatus,
      comment: comment ?? (newResolution ? `Resolution: ${newResolution}` : undefined),
    });

    return NextResponse.json({ ...rows[0], id: Number(rows[0].id) });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
