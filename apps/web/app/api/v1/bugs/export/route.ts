import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const severity = searchParams.get('severity') || 'all';
    const embargo = searchParams.get('embargo') || 'all';
    const search = searchParams.get('search') || '';
    const scope = searchParams.get('scope');

    const user = await getCurrentUser();
    const userId = user?.id ?? null;
    const isSecurityMember = user?.groups?.includes('security') || user?.is_admin || false;
    const isDemo = scope === 'demo' || (!scope && !user) || (user && (user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local'));

    let query = `
      SELECT b.id, b.summary, b.status, b.resolution, b.priority, b.severity,
             b.estimated_time, b.remaining_time, b.is_embargoed, b.cvss_score, b.cvss_severity,
             p.name as product_name, c.name as component_name,
             u.display_name as reporter_name, a.display_name as assignee_name,
             b.created_at, b.updated_at
      FROM bugs b
      LEFT JOIN products p ON p.id = b.product_id
      LEFT JOIN components c ON c.id = b.component_id
      LEFT JOIN users u ON u.id = b.reporter_id
      LEFT JOIN users a ON a.id = b.assignee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    // Sandbox isolation filter
    if (scope === 'user' || (user && !isDemo)) {
      if (user?.team_name) {
        query += ` AND b.reporter_id IN (SELECT id FROM users WHERE team_name = $${pIdx++} AND email NOT LIKE '%@mozilla.com' AND email != 'admin@mantis.local')`;
        params.push(user.team_name);
      } else if (userId) {
        query += ` AND b.reporter_id = $${pIdx++}`;
        params.push(userId);
      } else {
        query += ` AND 1=0`;
      }
    } else {
      query += ` AND b.reporter_id IN (SELECT id FROM users WHERE email LIKE '%@mozilla.com' OR email = 'admin@mantis.local')`;
    }

    // Secrecy filter
    if (!isSecurityMember) {
      query += ` AND (b.is_embargoed = false OR b.is_embargoed IS NULL OR b.reporter_id = $${pIdx} OR b.assignee_id = $${pIdx})`;
      params.push(userId);
      pIdx++;
    }

    if (status !== 'all') {
      query += ` AND b.status = $${pIdx}`;
      params.push(status);
      pIdx++;
    }

    if (priority !== 'all') {
      query += ` AND b.priority = $${pIdx}`;
      params.push(priority);
      pIdx++;
    }

    if (severity !== 'all') {
      query += ` AND b.severity = $${pIdx}`;
      params.push(severity);
      pIdx++;
    }

    if (embargo === 'embargoed') {
      query += ` AND b.is_embargoed = true`;
    } else if (embargo === 'public') {
      query += ` AND (b.is_embargoed = false OR b.is_embargoed IS NULL)`;
    }

    if (search.trim()) {
      query += ` AND (b.summary ILIKE $${pIdx} OR b.description ILIKE $${pIdx})`;
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    query += ` ORDER BY b.id ASC LIMIT 1000`;

    const res = await db.query(query, params);

    // Build CSV
    const headers = [
      'Bug ID',
      'Summary',
      'Status',
      'Resolution',
      'Priority',
      'Severity',
      'Product',
      'Component',
      'Reporter',
      'Assignee',
      'CVSS Score',
      'CVSS Severity',
      'Embargoed',
      'Est Hours',
      'Created At',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.join(',')];
    for (const r of res.rows) {
      csvRows.push([
        r.id,
        escapeCsv(r.summary),
        r.status,
        r.resolution || '',
        r.priority,
        r.severity,
        escapeCsv(r.product_name || ''),
        escapeCsv(r.component_name || ''),
        escapeCsv(r.reporter_name || ''),
        escapeCsv(r.assignee_name || ''),
        r.cvss_score || '',
        r.cvss_severity || '',
        r.is_embargoed ? 'YES' : 'NO',
        r.estimated_time || '',
        r.created_at ? new Date(r.created_at).toISOString() : '',
      ].join(','));
    }

    const csvContent = csvRows.join('\r\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mantis-defects-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'EXPORT_FAILED', message: err.message }, { status: 500 });
  }
}
