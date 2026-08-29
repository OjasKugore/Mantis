import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { getCurrentUser, canUserAccessBug } from '@/lib/services/auth';
import { computeCvss4 } from '@/lib/services/cvss4';
import { recordActivity } from '@/lib/services/audit';

const SecuritySchema = z.object({
  is_embargoed: z.boolean().optional(),
  cvss_vector: z.string().optional(),
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
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Must be logged in to modify security' }, { status: 401 });
    }

    const hasAccess = await canUserAccessBug(bugId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = SecuritySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Invalid payload' }, { status: 400 });
    }

    const { is_embargoed, cvss_vector } = parseResult.data;

    let cvssScore: number | null = null;
    let cvssSeverity: string | null = null;

    if (cvss_vector) {
      try {
        const cvssResult = computeCvss4(cvss_vector);
        cvssScore = cvssResult.score;
        cvssSeverity = cvssResult.severity;
      } catch (err: any) {
        return NextResponse.json({ error: 'INVALID_CVSS_VECTOR', message: err.message }, { status: 400 });
      }
    }

    const currentBugRes = await db.query(`SELECT * FROM bugs WHERE id = $1`, [bugId]);
    if (currentBugRes.rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const currentBug = currentBugRes.rows[0];

    const fields: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    if (is_embargoed !== undefined) {
      fields.push(`is_embargoed = $${pIdx++}`);
      values.push(is_embargoed);

      if (is_embargoed) {
        const embargoDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        fields.push(`embargo_until = $${pIdx++}`);
        values.push(embargoDate);

        const { rows: secGroup } = await db.query(`SELECT id FROM groups WHERE name = 'security-team' LIMIT 1`);
        if (secGroup.length > 0) {
          await db.query(`INSERT INTO bug_group_map (bug_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
            bugId,
            secGroup[0].id,
          ]);
        }
      } else {
        fields.push(`embargo_until = NULL`);
        await db.query(`DELETE FROM bug_group_map WHERE bug_id = $1`, [bugId]);
      }

      await recordActivity(db, {
        bugId,
        whoId: user.id,
        field: 'is_embargoed',
        oldValue: String(currentBug.is_embargoed),
        newValue: String(is_embargoed),
        comment: is_embargoed ? 'Restricted to Security Team' : 'Quarantine lifted (Public)',
      });
    }

    if (cvss_vector) {
      fields.push(`cvss_vector = $${pIdx++}`);
      values.push(cvss_vector);
      fields.push(`cvss_score = $${pIdx++}`);
      values.push(cvssScore);
      fields.push(`cvss_severity = $${pIdx++}`);
      values.push(cvssSeverity);

      await recordActivity(db, {
        bugId,
        whoId: user.id,
        field: 'cvss_score',
        oldValue: String(currentBug.cvss_score ?? ''),
        newValue: String(cvssScore),
        comment: `CVSS 4.0: ${cvss_vector} (${cvssSeverity})`,
      });
    }

    fields.push(`updated_at = NOW()`);
    values.push(bugId);

    const { rows } = await db.query(
      `UPDATE bugs SET ${fields.join(', ')} WHERE id = $${pIdx} RETURNING *`,
      values
    );

    return NextResponse.json({ ...rows[0], id: Number(rows[0].id) });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
