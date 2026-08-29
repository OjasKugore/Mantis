import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client.js';
import { canUserAccessBug } from '../middleware/groupFilter.js';

export async function liveUpdateRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/bugs/:id/live
   * Server-Sent Events (SSE) stream for real-time bug updates.
   */
  app.get<{ Params: { id: string } }>(
    '/bugs/:id/live',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      const userId = (request as any).user?.id || null;
      const hasAccess = await canUserAccessBug(bugId, userId);
      if (!hasAccess) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
      }

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
      reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
      reply.raw.flushHeaders();

      // Send initial connected event
      reply.raw.write(`event: connected\ndata: ${JSON.stringify({ bugId, connectedAt: new Date() })}\n\n`);

      let lastChecked = new Date();

      const interval = setInterval(async () => {
        try {
          const { rows: changes } = await db.query(
            `SELECT id, field, old_value, new_value, changed_at, who_id
             FROM bugs_activity
             WHERE bug_id = $1 AND changed_at > $2
             ORDER BY changed_at ASC`,
            [bugId, lastChecked]
          );

          const { rows: comments } = await db.query(
            `SELECT bc.id, bc.author_id, bc.body, bc.format, bc.created_at, u.username AS author_username
             FROM bug_comments bc
             LEFT JOIN users u ON u.id = bc.author_id
             WHERE bc.bug_id = $1 AND bc.created_at > $2
             ORDER BY bc.created_at ASC`,
            [bugId, lastChecked]
          );

          lastChecked = new Date();

          if (changes.length > 0 || comments.length > 0) {
            reply.raw.write(`event: update\ndata: ${JSON.stringify({ changes, comments })}\n\n`);
          } else {
            // Heartbeat
            reply.raw.write(`: heartbeat\n\n`);
          }
        } catch {
          // ignore error on socket close
        }
      }, 3000);

      request.raw.on('close', () => {
        clearInterval(interval);
      });
    }
  );

  /**
   * GET /api/v1/bugs/:id/poll?since=<ISO8601>
   * Polls for changes to a bug (status/field changes from bugs_activity and new comments)
   * since a given ISO timestamp.
   * Enforces 404 security group secrecy.
   */
  app.get<{ Params: { id: string }; Querystring: { since?: string } }>(
    '/bugs/:id/poll',
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: { since?: string } }>,
      reply: FastifyReply
    ) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      const userId = (request as any).user?.id || null;

      // Group secrecy check (returns 404 if unauthorized or bug non-existent)
      const hasAccess = await canUserAccessBug(bugId, userId);
      if (!hasAccess) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
      }

      // Verify bug exists
      const { rows: bugRows } = await db.query(`SELECT id FROM bugs WHERE id = $1`, [bugId]);
      if (bugRows.length === 0) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
      }

      // Parse timestamp (default to 5 minutes ago if omitted)
      const sinceInput = request.query.since;
      let sinceDate = new Date(Date.now() - 5 * 60 * 1000);
      if (sinceInput) {
        const parsed = new Date(sinceInput);
        if (!isNaN(parsed.getTime())) {
          sinceDate = parsed;
        }
      }

      // Query activity changes
      const { rows: changes } = await db.query(
        `SELECT id, field, old_value, new_value, changed_at, who_id
         FROM bugs_activity
         WHERE bug_id = $1 AND changed_at > $2
         ORDER BY changed_at ASC`,
        [bugId, sinceDate]
      );

      // Query new comments
      const { rows: comments } = await db.query(
        `SELECT bc.id, bc.author_id, bc.body, bc.format, bc.created_at, u.username AS author_username
         FROM bug_comments bc
         LEFT JOIN users u ON u.id = bc.author_id
         WHERE bc.bug_id = $1 AND bc.created_at > $2
         ORDER BY bc.created_at ASC`,
        [bugId, sinceDate]
      );

      return reply.status(200).send({
        bug_id: bugId,
        since: sinceDate.toISOString(),
        changes,
        comments,
        timestamp: new Date().toISOString(),
      });
    }
  );
}
