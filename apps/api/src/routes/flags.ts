import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const CreateFlagSchema = z.object({
  type_id: z.number().int().positive(),
  status: z.literal('?'),
  requestee_id: z.string().uuid().optional(),
  attach_id: z.number().int().positive().optional(),
});

const UpdateFlagSchema = z.object({
  status: z.enum(['+', '-']),
});

export async function flagRoutes(app: FastifyInstance) {
  // GET /flag-types
  app.get('/flag-types', async (request: FastifyRequest, reply: FastifyReply) => {
    const { rows } = await db.query(`SELECT * FROM flag_types ORDER BY name ASC`);
    return reply.code(200).send(rows);
  });

  // GET /bugs/:id/flags
  app.get<{ Params: { id: string } }>(
    '/bugs/:id/flags',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      const { rows } = await db.query(
        `SELECT f.id, f.type_id, f.status, f.bug_id, f.attach_id, f.setter_id, f.requestee_id,
                f.created_at, f.updated_at,
                ft.name AS type_name, ft.description AS type_description, ft.target_type,
                su.username AS setter_username, su.display_name AS setter_display_name,
                ru.username AS requestee_username, ru.display_name AS requestee_display_name
         FROM flags f
         JOIN flag_types ft ON ft.id = f.type_id
         JOIN users su ON su.id = f.setter_id
         LEFT JOIN users ru ON ru.id = f.requestee_id
         WHERE f.bug_id = $1
         ORDER BY f.created_at ASC`,
        [bugId]
      );

      return reply.code(200).send(rows);
    }
  );

  // POST /bugs/:id/flags
  app.post<{ Params: { id: string } }>(
    '/bugs/:id/flags',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      const rawStatus = (request.body as any)?.status;
      if (rawStatus !== '?') {
        return reply.code(422).send({
          error: 'FLAG_MUST_START_AS_REQUESTED',
          message: 'New flags must be created with status "?"',
        });
      }

      const parseResult = CreateFlagSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid flag payload',
          details: parseResult.error.flatten(),
        });
      }

      const { type_id, status, requestee_id, attach_id } = parseResult.data;
      const setter = request.user!;

      // Check bug
      const bugCheck = await db.query(`SELECT id FROM bugs WHERE id = $1`, [bugId]);
      if (bugCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'BUG_NOT_FOUND', message: 'Bug not found' });
      }

      // Check flag type
      const typeCheck = await db.query(`SELECT id, name, grant_group_id FROM flag_types WHERE id = $1`, [type_id]);
      if (typeCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'FLAG_TYPE_NOT_FOUND', message: 'Flag type not found' });
      }

      // Insert flag
      const { rows: flagRows } = await db.query(
        `INSERT INTO flags (type_id, status, bug_id, setter_id, requestee_id, attach_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, type_id, status, bug_id, setter_id, requestee_id, attach_id, created_at, updated_at`,
        [type_id, status, bugId, setter.id, requestee_id ?? null, attach_id ?? null]
      );

      const newFlag = flagRows[0];

      // Send notification to requestee if set
      if (requestee_id) {
        await db.query(
          `INSERT INTO notifications (user_id, type, payload)
           VALUES ($1, $2, $3)`,
          [
            requestee_id,
            'flag_request',
            JSON.stringify({
              bug_id: bugId,
              flag_id: newFlag.id,
              type_name: typeCheck.rows[0].name,
              setter_username: setter.username,
            }),
          ]
        );
      }

      return reply.code(201).send(newFlag);
    }
  );

  // PATCH /flags/:id
  app.patch<{ Params: { id: string } }>(
    '/flags/:id',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const flagId = Number(request.params.id);
      if (isNaN(flagId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Flag ID must be numeric' });
      }

      const parseResult = UpdateFlagSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(422).send({
          error: 'INVALID_FLAG_STATUS',
          message: 'Flag status must be "+" or "-"',
        });
      }

      const { status } = parseResult.data;
      const user = request.user!;

      // Retrieve flag with type and grant permissions
      const { rows: flagRows } = await db.query(
        `SELECT f.*, ft.name AS type_name, ft.grant_group_id
         FROM flags f
         JOIN flag_types ft ON ft.id = f.type_id
         WHERE f.id = $1`,
        [flagId]
      );

      if (flagRows.length === 0) {
        return reply.code(404).send({ error: 'FLAG_NOT_FOUND', message: 'Flag not found' });
      }

      const flag = flagRows[0];

      // Check grant group permissions if restricted
      if (flag.grant_group_id && !user.is_admin) {
        const groupMemberCheck = await db.query(
          `SELECT 1 FROM user_group_map WHERE user_id = $1 AND group_id = $2`,
          [user.id, flag.grant_group_id]
        );
        if (groupMemberCheck.rows.length === 0) {
          return reply.code(403).send({
            error: 'FORBIDDEN',
            message: 'User is not a member of the required grant group for this flag',
          });
        }
      }

      // Update flag status without mutating bugs.status
      const { rows: updatedRows } = await db.query(
        `UPDATE flags
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, type_id, status, bug_id, setter_id, requestee_id, attach_id, created_at, updated_at`,
        [status, flagId]
      );

      const updatedFlag = updatedRows[0];

      // Notify original setter
      if (flag.setter_id && flag.setter_id !== user.id) {
        await db.query(
          `INSERT INTO notifications (user_id, type, payload)
           VALUES ($1, $2, $3)`,
          [
            flag.setter_id,
            status === '+' ? 'flag_granted' : 'flag_denied',
            JSON.stringify({
              bug_id: flag.bug_id,
              flag_id: flag.id,
              type_name: flag.type_name,
              resolver_username: user.username,
              status,
            }),
          ]
        );
      }

      return reply.code(200).send(updatedFlag);
    }
  );
}
