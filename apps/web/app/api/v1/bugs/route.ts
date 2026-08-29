import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { getCurrentUser, applyGroupFilter } from '@/lib/services/auth';
import { recordActivity } from '@/lib/services/audit';

const CreateBugSchema = z.object({
  summary: z.string().min(1).max(255),
  description: z.string().default(''),
  product_id: z.number().int().positive().default(1),
  component_id: z.number().int().positive().default(1),
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getCurrentUser();
    const userId = user?.id ?? null;

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let pIdx = 1;

    if (searchParams.get('status')) {
      conditions.push(`b.status = $${pIdx++}`);
      params.push(searchParams.get('status'));
    }
    if (searchParams.get('priority')) {
      conditions.push(`b.priority = $${pIdx++}`);
      params.push(searchParams.get('priority'));
    }
    if (searchParams.get('severity')) {
      conditions.push(`b.severity = $${pIdx++}`);
      params.push(searchParams.get('severity'));
    }
    if (searchParams.get('product_id')) {
      conditions.push(`b.product_id = $${pIdx++}`);
      params.push(parseInt(searchParams.get('product_id')!, 10));
    }
    if (searchParams.get('component_id')) {
      conditions.push(`b.component_id = $${pIdx++}`);
      params.push(parseInt(searchParams.get('component_id')!, 10));
    }
    if (searchParams.get('assignee_id')) {
      conditions.push(`b.assignee_id = $${pIdx++}`);
      params.push(searchParams.get('assignee_id'));
    }
    if (searchParams.get('q')) {
      conditions.push(`(b.summary ILIKE $${pIdx} OR b.description ILIKE $${pIdx})`);
      params.push(`%${searchParams.get('q')}%`);
      pIdx++;
    }

    // Apply zero-leakage security group visibility filter
    const groupFilter = applyGroupFilter(userId, pIdx);
    conditions.push(groupFilter.fragment.replace('AND ', ''));
    if (groupFilter.param) {
      params.push(groupFilter.param);
      pIdx = groupFilter.nextIndex;
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await db.query(
      `SELECT COUNT(*) as total FROM bugs b WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const queryParams = [...params, limit, offset];
    const { rows } = await db.query(
      `SELECT b.id, b.summary, b.status, b.resolution, b.priority, b.severity,
              b.product_id, b.component_id, b.version, b.target_milestone,
              b.reporter_id, b.assignee_id, b.qa_contact_id,
              b.estimated_time, b.remaining_time, b.deadline,
              b.is_embargoed, b.embargo_until, b.cvss_score, b.cvss_vector, b.cvss_severity,
              b.created_at, b.updated_at,
              p.name as product_name, c.name as component_name,
              u_rep.display_name as reporter_name, u_rep.username as reporter_username,
              u_ass.display_name as assignee_name, u_ass.username as assignee_username
       FROM bugs b
       LEFT JOIN products p ON p.id = b.product_id
       LEFT JOIN components c ON c.id = b.component_id
       LEFT JOIN users u_rep ON u_rep.id = b.reporter_id
       LEFT JOIN users u_ass ON u_ass.id = b.assignee_id
       WHERE ${whereClause}
       ORDER BY b.id DESC
       LIMIT $${pIdx++} OFFSET $${pIdx}`,
      queryParams
    );

    const formattedRows = rows.map((r: any) => ({ ...r, id: Number(r.id) }));

    return NextResponse.json({
      bugs: formattedRows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Must be logged in to file a bug' }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = CreateBugSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid bug payload',
        details: parseResult.error.flatten(),
      }, { status: 400 });
    }

    const data = parseResult.data;
    const reporterId = user.id;

    // Validate product
    const productRes = await db.query(
      `SELECT id, is_active FROM products WHERE id = $1`,
      [data.product_id]
    );
    if (productRes.rows.length === 0 || !productRes.rows[0].is_active) {
      return NextResponse.json({ error: 'INVALID_PRODUCT', message: 'Product does not exist or is inactive' }, { status: 400 });
    }

    // Validate component
    const componentRes = await db.query(
      `SELECT id, default_owner_id, is_active FROM components WHERE id = $1 AND product_id = $2`,
      [data.component_id, data.product_id]
    );
    if (componentRes.rows.length === 0 || !componentRes.rows[0].is_active) {
      return NextResponse.json({ error: 'INVALID_COMPONENT', message: 'Component does not exist or is inactive' }, { status: 400 });
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

    // If marked as security bug, restrict to security-team group
    if (data.is_embargoed) {
      const { rows: secGroup } = await db.query(`SELECT id FROM groups WHERE name = 'security-team' LIMIT 1`);
      if (secGroup.length > 0) {
        await db.query(`INSERT INTO bug_group_map (bug_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          newBug.id,
          secGroup[0].id,
        ]);
      }
    }

    // Record creation in audit log
    await recordActivity(db, {
      bugId: newBug.id,
      whoId: reporterId,
      field: 'status',
      oldValue: null,
      newValue: 'UNCONFIRMED',
      comment: 'Bug created',
    });

    return NextResponse.json(newBug, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
