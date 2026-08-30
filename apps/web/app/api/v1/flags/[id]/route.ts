import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

const UpdateFlagSchema = z.object({
  status: z.enum(['?', '+', '-']),
});

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const flagId = parseInt(params.id, 10);
    if (isNaN(flagId)) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Flag ID must be an integer' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Must be logged in to update flags' }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = UpdateFlagSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Invalid flag status' }, { status: 400 });
    }

    const { status } = parseResult.data;

    const { rows } = await db.query(
      `UPDATE flags
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, flagId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Flag not found' }, { status: 404 });
    }

    const flag = rows[0];
    flag.id = Number(flag.id);
    flag.bug_id = Number(flag.bug_id);

    // Notify setter if someone else updated the flag
    if (flag.setter_id && flag.setter_id !== user.id) {
      const notifType = status === '+' ? 'flag_granted' : status === '-' ? 'flag_denied' : 'flag_request';
      await db.query(
        `INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)`,
        [
          flag.setter_id,
          notifType,
          JSON.stringify({
            bug_id: flag.bug_id,
            flag_id: flag.id,
            updater_name: user.display_name,
            new_status: status,
          }),
        ]
      ).catch(() => {});
    }

    return NextResponse.json(flag);
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
