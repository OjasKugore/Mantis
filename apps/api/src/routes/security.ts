import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { canUserAccessBug } from '../middleware/groupFilter.js';
import { recordActivity } from '../services/audit.js';
import { computeCvss4 } from '../services/cvss4.js';

export async function securityRoutes(app: FastifyInstance) {
  /**
   * PATCH /bugs/:id/security
   * Security-team only endpoint to set CVSS vector and/or embargo.
   *
   * Body:
   *   cvss_vector?     string   – FIRST.org CVSS v4.0 vector
   *   is_embargoed?    boolean  – set/clear embargo
   *   embargo_until?   string   – ISO date override (defaults to now + 90d)
   *
   * Authorization:
   *   Caller must belong to a group named "security-team".
   *   Non-members receive 403 Forbidden.
   *   Embargoed bugs served to non-members return 404 (secrecy, enforced on GET).
   */
  app.patch<{ Params: { id: string } }>(
    '/bugs/:id/security',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      const userId = request.user!.id;

      // ── Authorization: caller must be in 'security-team' group ────────────
      const { rows: secGroups } = await db.query(
        `SELECT g.id FROM groups g
         JOIN user_group_map ugm ON ugm.group_id = g.id
         WHERE ugm.user_id = $1 AND g.name = 'security-team'`,
        [userId]
      );

      if (secGroups.length === 0) {
        return reply.code(403).send({
          error: 'FORBIDDEN',
          message: 'Only security team members can update security fields.',
        });
      }

      const securityGroupId = secGroups[0].id;

      // ── Fetch current bug ─────────────────────────────────────────────────
      const { rows: bugRows } = await db.query(
        `SELECT id, cvss_vector, cvss_score, cvss_severity, is_embargoed, embargo_until
         FROM bugs WHERE id = $1`,
        [bugId]
      );

      if (bugRows.length === 0) {
        return reply.code(404).send({ error: 'BUG_NOT_FOUND', message: 'Bug not found' });
      }

      const bug = bugRows[0];
      const body = (request.body as {
        cvss_vector?: string;
        is_embargoed?: boolean;
        embargo_until?: string;
      }) || {};

      const updates: string[] = [];
      const params: (string | number | boolean | null | Date)[] = [];
      let paramIdx = 1;

      let newCvssVector = bug.cvss_vector;
      let newCvssScore = bug.cvss_score;
      let newCvssSeverity = bug.cvss_severity;

      // ── CVSS vector update ────────────────────────────────────────────────
      if (body.cvss_vector !== undefined) {
        let result;
        try {
          result = computeCvss4(body.cvss_vector);
        } catch (err: any) {
          return reply.code(422).send({
            error: 'INVALID_CVSS_VECTOR',
            message: err.message || 'Invalid CVSS v4.0 vector',
          });
        }

        newCvssVector = result.vector;
        newCvssScore = result.score;
        newCvssSeverity = result.severity;

        updates.push(`cvss_vector = $${paramIdx++}`);  params.push(newCvssVector);
        updates.push(`cvss_score = $${paramIdx++}`);   params.push(newCvssScore);
        updates.push(`cvss_severity = $${paramIdx++}`); params.push(newCvssSeverity);

        // Audit the CVSS change
        const dummyClient = { query: (text: string, p?: any[]) => db.query(text, p) } as any;
        await recordActivity(dummyClient, {
          bugId,
          whoId: userId,
          field: 'cvss_vector',
          oldValue: bug.cvss_vector ?? null,
          newValue: newCvssVector,
          comment: `CVSS v4.0 score set to ${newCvssScore} (${newCvssSeverity})`,
        });
      }

      // ── Embargo update ────────────────────────────────────────────────────
      if (body.is_embargoed !== undefined) {
        updates.push(`is_embargoed = $${paramIdx++}`);
        params.push(body.is_embargoed);

        if (body.is_embargoed) {
          // Default: now + 90 days
          const embargoDate = body.embargo_until
            ? new Date(body.embargo_until)
            : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

          updates.push(`embargo_until = $${paramIdx++}`);
          params.push(embargoDate);

          // Restrict the bug to the security-team group
          await db.query(
            `INSERT INTO bug_group_map (bug_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [bugId, securityGroupId]
          );
        } else {
          // Clear embargo
          updates.push(`embargo_until = NULL`);

          // Remove group restriction (lift embargo)
          await db.query(
            `DELETE FROM bug_group_map WHERE bug_id = $1 AND group_id = $2`,
            [bugId, securityGroupId]
          );
        }

        const dummyClient = { query: (text: string, p?: any[]) => db.query(text, p) } as any;
        await recordActivity(dummyClient, {
          bugId,
          whoId: userId,
          field: 'is_embargoed',
          oldValue: String(bug.is_embargoed),
          newValue: String(body.is_embargoed),
          comment: body.is_embargoed ? 'Bug placed under 90-day security embargo' : 'Embargo lifted',
        });
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'NO_CHANGES', message: 'No security fields provided' });
      }

      updates.push(`updated_at = NOW()`);
      params.push(bugId);

      await db.query(
        `UPDATE bugs SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
        params
      );

      // ── Return updated security fields ────────────────────────────────────
      const { rows: updated } = await db.query(
        `SELECT id, cvss_vector, cvss_score, cvss_severity, is_embargoed, embargo_until, updated_at
         FROM bugs WHERE id = $1`,
        [bugId]
      );

      return reply.code(200).send(updated[0]);
    }
  );

  /**
   * GET /bugs/:id/security
   * Returns CVSS + embargo details for authorized callers.
   * Non-members of restricting group receive 404 (secrecy).
   */
  app.get<{ Params: { id: string } }>(
    '/bugs/:id/security',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      const userId = request.user!.id;
      const canAccess = await canUserAccessBug(bugId, userId);
      if (!canAccess) {
        return reply.code(404).send({ error: 'BUG_NOT_FOUND', message: 'Bug not found' });
      }

      const { rows } = await db.query(
        `SELECT id, cvss_vector, cvss_score, cvss_severity, is_embargoed, embargo_until
         FROM bugs WHERE id = $1`,
        [bugId]
      );

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'BUG_NOT_FOUND', message: 'Bug not found' });
      }

      return reply.code(200).send(rows[0]);
    }
  );
}
