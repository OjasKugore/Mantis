import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { extractMentions } from '../services/mentionParser.js';

const CreateCommentSchema = z.object({
  body: z.string().min(1),
  format: z.enum(['plain', 'markdown']).default('markdown'),
  parent_id: z.number().int().positive().optional(),
  is_private: z.boolean().default(false),
});

export async function commentRoutes(app: FastifyInstance) {
  // GET /bugs/:id/comments
  app.get<{ Params: { id: string } }>(
    '/bugs/:id/comments',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      // Check bug existence
      const bugCheck = await db.query(`SELECT id FROM bugs WHERE id = $1`, [bugId]);
      if (bugCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'BUG_NOT_FOUND', message: 'Bug not found' });
      }

      const { rows } = await db.query(
        `SELECT c.id, c.bug_id, c.author_id, c.body, c.format, c.is_private, c.parent_id, c.created_at,
                u.username AS author_username, u.display_name AS author_display_name, u.avatar_url AS author_avatar
         FROM bug_comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.bug_id = $1
         ORDER BY c.created_at ASC`,
        [bugId]
      );

      return reply.code(200).send(rows);
    }
  );

  // POST /bugs/:id/comments
  app.post<{ Params: { id: string } }>(
    '/bugs/:id/comments',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      const parseResult = CreateCommentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid comment payload',
          details: parseResult.error.flatten(),
        });
      }

      const { body, format, parent_id, is_private } = parseResult.data;
      const author = request.user!;

      // Check bug existence
      const bugCheck = await db.query(`SELECT id, summary FROM bugs WHERE id = $1`, [bugId]);
      if (bugCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'BUG_NOT_FOUND', message: 'Bug not found' });
      }

      // Insert comment
      const { rows: commentRows } = await db.query(
        `INSERT INTO bug_comments (bug_id, author_id, body, format, is_private, parent_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, bug_id, author_id, body, format, is_private, parent_id, created_at`,
        [bugId, author.id, body, format, is_private, parent_id ?? null]
      );

      const newComment = commentRows[0];

      // Extract mentions
      const usernames = extractMentions(body);
      if (usernames.length > 0) {
        for (const username of usernames) {
          const userRes = await db.query(
            `SELECT id, username FROM users WHERE username = $1 AND is_enabled = TRUE`,
            [username]
          );

          if (userRes.rows.length > 0) {
            const mentionedUser = userRes.rows[0];

            // Insert mention record
            try {
              await db.query(
                `INSERT INTO comment_mentions (comment_id, mentioned_user_id)
                 VALUES ($1, $2)`,
                [newComment.id, mentionedUser.id]
              );
            } catch (err) {
              // Ignore unique violation
            }

            // Insert notification
            await db.query(
              `INSERT INTO notifications (user_id, type, payload)
               VALUES ($1, $2, $3)`,
              [
                mentionedUser.id,
                'mention',
                JSON.stringify({
                  bug_id: bugId,
                  comment_id: newComment.id,
                  author_username: author.username,
                  preview: body.slice(0, 120),
                }),
              ]
            );
          }
        }
      }

      return reply.code(201).send({
        ...newComment,
        author_username: author.username,
        author_display_name: author.display_name,
        author_avatar: null,
      });
    }
  );
}
