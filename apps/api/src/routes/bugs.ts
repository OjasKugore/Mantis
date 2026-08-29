import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { applyGroupFilter, canUserAccessBug } from '../middleware/groupFilter.js';
import { isValidTransition, validateResolution } from '../services/stateMachine.js';
import { recordActivity } from '../services/audit.js';

const CreateBugSchema = z.object({
  summary: z.string().min(1).max(255),
  description: z.string().default(''),
  product_id: z.number().int().positive(),
  component_id: z.number().int().positive(),
  version: z.string().default('unspecified'),
  target_milestone: z.string().default('---'),
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).default('P3'),
  severity: z
    .enum(['blocker', 'critical', 'major', 'normal', 'minor', 'trivial', 'enhancement'])
    .default('normal'),
  assignee_id: z.string().uuid().optional().nullable(),
  qa_contact_id: z.string().uuid().optional().nullable(),
  estimated_time: z.number().nonnegative().default(0),
  remaining_time: z.number().nonnegative().default(0),
  deadline: z.string().datetime().optional().nullable(),
  is_embargoed: z.boolean().optional().default(false),
  cvss_score: z.number().optional().nullable(),
  cvss_vector: z.string().optional().nullable(),
  cvss_severity: z.string().optional().nullable(),
});

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

const UpdateStatusSchema = z.object({
  status: z.enum(['UNCONFIRMED', 'CONFIRMED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED']),
  resolution: z
    .enum(['', 'FIXED', 'INVALID', 'WONTFIX', 'DUPLICATE', 'WORKSFORME', 'INCOMPLETE'])
    .default(''),
});

const QueryBugsSchema = z.object({
  status: z.string().optional(),
  product_id: z.coerce.number().int().positive().optional(),
  component_id: z.coerce.number().int().positive().optional(),
  assignee_id: z.string().uuid().optional(),
  reporter_id: z.string().uuid().optional(),
  priority: z.string().optional(),
  severity: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export async function bugRoutes(app: FastifyInstance) {
  // POST /api/v1/bugs — Create bug
  app.post('/', { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = CreateBugSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid bug payload',
        details: parseResult.error.flatten(),
      });
    }

    const data = parseResult.data;
    const reporterId = request.user!.id;

    // Validate product
    const productRes = await db.query(
      `SELECT id, is_active FROM products WHERE id = $1`,
      [data.product_id]
    );
    if (productRes.rows.length === 0 || !productRes.rows[0].is_active) {
      return reply.code(400).send({
        error: 'INVALID_PRODUCT',
        message: 'Product does not exist or is inactive',
      });
    }

    // Validate component
    const componentRes = await db.query(
      `SELECT id, default_owner_id, is_active FROM components WHERE id = $1 AND product_id = $2`,
      [data.component_id, data.product_id]
    );
    if (componentRes.rows.length === 0 || !componentRes.rows[0].is_active) {
      return reply.code(400).send({
        error: 'INVALID_COMPONENT',
        message: 'Component does not exist for this product or is inactive',
      });
    }

    const component = componentRes.rows[0];
    const assigneeId = data.assignee_id !== undefined ? data.assignee_id : component.default_owner_id;
    const embargoUntil = data.is_embargoed ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null;

    const { rows } = await db.query(
      `INSERT INTO bugs (
        summary, description, status, resolution, priority, severity,
        product_id, component_id, version, target_milestone,
        reporter_id, assignee_id, qa_contact_id, estimated_time, remaining_time, deadline,
        is_embargoed, embargo_until, cvss_score, cvss_vector, cvss_severity
      )
      VALUES ($1, $2, 'UNCONFIRMED', '', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, summary, description, status, resolution, priority, severity,
                product_id, component_id, version, target_milestone,
                reporter_id, assignee_id, qa_contact_id, estimated_time, remaining_time,
                deadline, is_embargoed, embargo_until, cvss_score, cvss_vector, cvss_severity, created_at, updated_at`,
      [
        data.summary,
        data.description,
        data.priority,
        data.severity,
        data.product_id,
        data.component_id,
        data.version,
        data.target_milestone,
        reporterId,
        assigneeId,
        data.qa_contact_id ?? null,
        data.estimated_time,
        data.remaining_time,
        data.deadline ?? null,
        data.is_embargoed,
        embargoUntil,
        data.cvss_score ?? null,
        data.cvss_vector ?? null,
        data.cvss_severity ?? null,
      ]
    );

    const newBug = rows[0];
    newBug.id = Number(newBug.id);

    // Record initial status in audit activity log
    await recordActivity(db, {
      bugId: newBug.id,
      whoId: reporterId,
      field: 'status',
      oldValue: null,
      newValue: 'UNCONFIRMED',
      comment: 'Bug created',
    });

    return reply.code(201).send(newBug);
  });

  // GET /api/v1/bugs — Query/list bugs with group secrecy
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = QueryBugsSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { status, product_id, component_id, assignee_id, reporter_id, priority, severity, page, limit } =
      parseResult.data;

    // Optional user authentication via session cookie
    let userId: string | null = null;
    const token = request.cookies?.session;
    if (token) {
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const sessionRes = await db.query(
        `SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
      );
      if (sessionRes.rows.length > 0) {
        userId = sessionRes.rows[0].user_id;
      }
    }

    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`b.status = $${paramIndex++}`);
      params.push(status);
    }
    if (product_id) {
      conditions.push(`b.product_id = $${paramIndex++}`);
      params.push(product_id);
    }
    if (component_id) {
      conditions.push(`b.component_id = $${paramIndex++}`);
      params.push(component_id);
    }
    if (assignee_id) {
      conditions.push(`b.assignee_id = $${paramIndex++}`);
      params.push(assignee_id);
    }
    if (reporter_id) {
      conditions.push(`b.reporter_id = $${paramIndex++}`);
      params.push(reporter_id);
    }
    if (priority) {
      conditions.push(`b.priority = $${paramIndex++}`);
      params.push(priority);
    }
    if (severity) {
      conditions.push(`b.severity = $${paramIndex++}`);
      params.push(severity);
    }

    // Apply security group filter
    const groupFilter = applyGroupFilter(userId, paramIndex);
    conditions.push(groupFilter.fragment.replace(/^AND\s+/i, ''));
    if (groupFilter.param) {
      params.push(groupFilter.param);
      paramIndex = groupFilter.nextIndex;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM bugs b WHERE ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    const queryParams = [...params, limit, offset];
    const dataRes = await db.query(
      `SELECT b.id, b.summary, b.description, b.status, b.resolution, b.priority, b.severity,
              b.product_id, b.component_id, b.version, b.target_milestone,
              b.reporter_id, b.assignee_id, b.qa_contact_id, b.estimated_time, b.remaining_time,
              b.deadline, b.is_embargoed, b.cvss_score, b.cvss_severity, b.created_at, b.updated_at
       FROM bugs b
       WHERE ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    const bugs = dataRes.rows.map((r) => ({
      ...r,
      id: Number(r.id),
      product_id: Number(r.product_id),
      component_id: Number(r.component_id),
    }));

    return reply.code(200).send({
      bugs,
      total,
      page,
      limit,
    });
  });

  // GET /api/v1/bugs/:id — Get bug detail (returns 404 for unauthorized group bugs)
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const bugId = parseInt(request.params.id, 10);
    if (isNaN(bugId)) {
      return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be an integer' });
    }

    // Extract user if present
    let userId: string | null = null;
    const token = request.cookies?.session;
    if (token) {
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const sessionRes = await db.query(
        `SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
      );
      if (sessionRes.rows.length > 0) {
        userId = sessionRes.rows[0].user_id;
      }
    }

    // Check bug existence and group access secrecy (must return 404, never 403)
    const hasAccess = await canUserAccessBug(bugId, userId);
    if (!hasAccess) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
    }

    const { rows } = await db.query(
      `SELECT b.*,
              p.name AS product_name,
              c.name AS component_name,
              rep.display_name AS reporter_name, rep.username AS reporter_username, rep.avatar_url AS reporter_avatar,
              asg.display_name AS assignee_name, asg.username AS assignee_username, asg.avatar_url AS assignee_avatar
       FROM bugs b
       JOIN products p ON p.id = b.product_id
       JOIN components c ON c.id = b.component_id
       JOIN users rep ON rep.id = b.reporter_id
       LEFT JOIN users asg ON asg.id = b.assignee_id
       WHERE b.id = $1`,
      [bugId]
    );

    if (rows.length === 0) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
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
    bug.activity = activityRes.rows.map((a: any) => ({ ...a, id: Number(a.id), bug_id: Number(a.bug_id) }));

    return reply.code(200).send(bug);
  });

  // PATCH /api/v1/bugs/:id — Update bug fields
  app.patch<{ Params: { id: string } }>('/:id', { preHandler: [authMiddleware] }, async (request, reply) => {
    const bugId = parseInt(request.params.id, 10);
    if (isNaN(bugId)) {
      return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be an integer' });
    }

    const parseResult = UpdateBugSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid update payload',
        details: parseResult.error.flatten(),
      });
    }

    const userId = request.user!.id;
    const hasAccess = await canUserAccessBug(bugId, userId);
    if (!hasAccess) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
    }

    const existingRes = await db.query(`SELECT * FROM bugs WHERE id = $1`, [bugId]);
    if (existingRes.rows.length === 0) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
    }

    const currentBug = existingRes.rows[0];
    const updates = parseResult.data;
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [bugId];
    let paramIndex = 2;

    for (const [field, newValue] of Object.entries(updates)) {
      if (newValue !== undefined) {
        const oldValue = currentBug[field];
        if (String(oldValue ?? '') !== String(newValue ?? '')) {
          setClauses.push(`${field} = $${paramIndex++}`);
          params.push(newValue);

          // Record field mutation in activity log
          await recordActivity(db, {
            bugId,
            whoId: userId,
            field,
            oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
            newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
          });
        }
      }
    }

    const { rows } = await db.query(
      `UPDATE bugs SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    const updatedBug = rows[0];
    updatedBug.id = Number(updatedBug.id);
    return reply.code(200).send(updatedBug);
  });

  // PATCH /api/v1/bugs/:id/status — State Machine Transition
  app.patch<{ Params: { id: string } }>('/:id/status', { preHandler: [authMiddleware] }, async (request, reply) => {
    const bugId = parseInt(request.params.id, 10);
    if (isNaN(bugId)) {
      return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be an integer' });
    }

    const parseResult = UpdateStatusSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid status payload',
        details: parseResult.error.flatten(),
      });
    }

    const userId = request.user!.id;
    const hasAccess = await canUserAccessBug(bugId, userId);
    if (!hasAccess) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
    }

    const existingRes = await db.query(`SELECT status, resolution FROM bugs WHERE id = $1`, [bugId]);
    if (existingRes.rows.length === 0) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
    }

    const currentStatus = existingRes.rows[0].status;
    const currentResolution = existingRes.rows[0].resolution;
    const { status: newStatus, resolution: requestedResolution } = parseResult.data;

    // Validate transition
    if (!isValidTransition(currentStatus, newStatus)) {
      return reply.code(422).send({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
        from: currentStatus,
        to: newStatus,
      });
    }

    // Determine final resolution (clear resolution when reopening or moving to non-resolved status)
    let newResolution = requestedResolution;
    if (['UNCONFIRMED', 'CONFIRMED', 'IN_PROGRESS'].includes(newStatus)) {
      newResolution = '';
    }

    // Validate resolution rule
    if (!validateResolution(newStatus, newResolution)) {
      return reply.code(422).send({
        error: 'RESOLUTION_REQUIRED',
        message:
          newStatus === 'RESOLVED'
            ? 'Resolution is required when resolving a bug'
            : 'Resolution must be empty for this status',
      });
    }

    // Update bug in database
    await db.query(
      `UPDATE bugs SET status = $1, resolution = $2, updated_at = NOW() WHERE id = $3`,
      [newStatus, newResolution, bugId]
    );

    // Record status activity
    await recordActivity(db, {
      bugId,
      whoId: userId,
      field: 'status',
      oldValue: currentStatus,
      newValue: newStatus,
    });

    // Record resolution activity if changed
    if (currentResolution !== newResolution) {
      await recordActivity(db, {
        bugId,
        whoId: userId,
        field: 'resolution',
        oldValue: currentResolution || null,
        newValue: newResolution || null,
      });
    }

    return reply.code(200).send({
      id: bugId,
      status: newStatus,
      resolution: newResolution,
    });
  });
}
