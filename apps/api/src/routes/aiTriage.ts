import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client.js';
import { canUserAccessBug } from '../middleware/groupFilter.js';
import { callLLMTriage } from '../services/aiTriage.js';
import { Bug, BugComment } from '@mantis/shared';

export async function aiTriageRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/bugs/:id/ai-triage
   * Generates AI Triage synthesis using Gemini 2.0 Flash for a given bug.
   * Enforces 404 security group secrecy for confidential bugs.
   */
  app.post<{ Params: { id: string } }>(
    '/bugs/:id/ai-triage',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      // Check session user if present
      const userId = (request as any).user?.id || null;

      // ── Security Group Secrecy Check (404 Not Found if unauthorized) ─────
      const hasAccess = await canUserAccessBug(bugId, userId);
      if (!hasAccess) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
      }

      // Fetch bug
      const { rows: bugRows } = await db.query(`SELECT * FROM bugs WHERE id = $1`, [bugId]);
      if (bugRows.length === 0) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
      }
      const bug = bugRows[0] as Bug;

      // Fetch top 30 comments
      const { rows: commentRows } = await db.query(
        `SELECT bc.*, u.username AS author_username
         FROM bug_comments bc
         LEFT JOIN users u ON u.id = bc.author_id
         WHERE bc.bug_id = $1
         ORDER BY bc.created_at ASC
         LIMIT 30`,
        [bugId]
      );
      const comments = commentRows as BugComment[];

      // Call AI Triage Service
      const result = await callLLMTriage(bug, comments);

      if (!result) {
        return reply.status(200).send({
          fallback: true,
          error: 'AI_SERVICE_UNAVAILABLE',
          result: null,
        });
      }

      return reply.status(200).send({
        fallback: false,
        result,
      });
    }
  );
}
