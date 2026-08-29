import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { getCurrentUser, canUserAccessBug } from '@/lib/services/auth';
import { extractMentions } from '@/lib/services/mentionParser';

const CreateCommentSchema = z.object({
  body: z.string().min(1),
  format: z.enum(['markdown', 'plain']).default('markdown'),
  is_private: z.boolean().default(false),
  parent_id: z.number().int().positive().optional().nullable(),
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
    const hasAccess = await canUserAccessBug(bugId, user?.id ?? null);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const { rows } = await db.query(
      `SELECT c.id, c.bug_id, c.author_id, c.body, c.format, c.is_private, c.parent_id, c.created_at,
              u.display_name AS author_name, u.username AS author_username, u.avatar_url AS author_avatar
       FROM bug_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.bug_id = $1
       ORDER BY c.created_at ASC`,
      [bugId]
    );

    const comments = rows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      bug_id: Number(r.bug_id),
      parent_id: r.parent_id ? Number(r.parent_id) : null,
    }));

    return NextResponse.json(comments);
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
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Must be logged in to comment' }, { status: 401 });
    }

    const hasAccess = await canUserAccessBug(bugId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const rawBody = await request.json().catch(() => ({}));
    if (!rawBody.body && (rawBody.comment || rawBody.text)) {
      rawBody.body = rawBody.comment || rawBody.text;
    }
    const parseResult = CreateCommentSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Invalid comment payload' }, { status: 400 });
    }

    const { body, format, is_private, parent_id } = parseResult.data;

    const { rows } = await db.query(
      `INSERT INTO bug_comments (bug_id, author_id, body, format, is_private, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [bugId, user.id, body, format, is_private, parent_id ?? null]
    );

    const comment = rows[0];
    comment.id = Number(comment.id);
    comment.bug_id = Number(comment.bug_id);
    comment.author_name = user.display_name;
    comment.author_username = user.username;

    // Process mentions and dispatch notifications
    const mentions = extractMentions(body);
    for (const mentionUsername of mentions) {
      const userRes = await db.query(`SELECT id FROM users WHERE username = $1`, [mentionUsername]);
      if (userRes.rows.length > 0) {
        const mentionedUserId = userRes.rows[0].id;
        if (mentionedUserId !== user.id) {
          await db.query(
            `INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)`,
            [
              mentionedUserId,
              'mention',
              JSON.stringify({
                bug_id: bugId,
                comment_id: comment.id,
                mentioned_by: user.display_name,
                snippet: body.slice(0, 100),
              }),
            ]
          );
        }
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
