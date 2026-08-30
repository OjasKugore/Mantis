import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const user = await getCurrentUser();

    // Judge demo accounts see demo catalog (Firefox, Thunderbird, Core)
    const isDemo = scope === 'demo' || (!scope && !user) || (user && (user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local'));

    let query = `SELECT id, name, description, is_active, default_milestone FROM products`;
    const params: any[] = [];

    if (isDemo) {
      query += ` WHERE id IN (1, 2, 3) OR LOWER(name) IN ('firefox', 'thunderbird', 'core') OR team_name = 'Mozilla'`;
    } else if (user?.team_name) {
      query += ` WHERE (team_name = $1 OR (team_name IS NULL AND description ILIKE $2) OR classification_id IN (SELECT id FROM classifications WHERE name ILIKE $1)) AND LOWER(name) NOT IN ('firefox', 'thunderbird', 'core')`;
      params.push(user.team_name, `%${user.team_name}%`);
    } else if (user?.id) {
      query += ` WHERE (team_name = $1 OR team_name = $2) AND LOWER(name) NOT IN ('firefox', 'thunderbird', 'core')`;
      params.push(user.email, user.username);
    } else {
      query += ` WHERE id IN (1, 2, 3) OR LOWER(name) IN ('firefox', 'thunderbird', 'core') OR team_name = 'Mozilla'`;
    }
    query += ` ORDER BY id ASC`;

    const { rows } = await db.query(query, params);
    return NextResponse.json(rows.map((r: any) => ({ ...r, id: Number(r.id) })));
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    if (!user.is_admin) return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const name = body.name?.trim();
    const description = body.description?.trim() || '';
    const defaultMilestone = body.default_milestone?.trim() || '---';
    const teamName = user.team_name || (user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local' ? 'Mozilla' : user.username);

    if (!name || name.length < 1 || name.length > 64) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Product name is required (1–64 characters)' }, { status: 400 });
    }

    // Check for duplicate name in the same workspace/team
    const existing = await db.query(
      `SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND (team_name = $2 OR (team_name IS NULL AND $2 = 'Mozilla' AND id IN (1, 2, 3)))`,
      [name, teamName]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'CONFLICT', message: `A product named "${name}" already exists in your workspace` }, { status: 409 });
    }

    // Ensure a classification exists (scoped to team)
    let classId: number;
    const classRes = await db.query(
      `SELECT id FROM classifications WHERE name ILIKE $1 LIMIT 1`,
      [`%${teamName}%`]
    );
    if (classRes.rows.length > 0) {
      classId = Number(classRes.rows[0].id);
    } else {
      const nextClassRes = await db.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM classifications`);
      const nextClassId = Number(nextClassRes.rows[0]?.next_id || 1);
      const newClass = await db.query(
        `INSERT INTO classifications (id, name, sortkey) VALUES ($1, $2, 0) RETURNING id`,
        [nextClassId, `${teamName} Products`]
      );
      classId = Number(newClass.rows[0].id);
    }

    const nextIdRes = await db.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM products`);
    const nextId = Number(nextIdRes.rows[0]?.next_id || 1);

    const { rows } = await db.query(
      `INSERT INTO products (id, name, classification_id, description, default_milestone, team_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, is_active, default_milestone, team_name`,
      [nextId, name, classId, description, defaultMilestone, teamName]
    );

    return NextResponse.json({ ...rows[0], id: Number(rows[0].id) }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
