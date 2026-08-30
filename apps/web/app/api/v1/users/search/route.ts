import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const user = await getCurrentUser();

    let query = `
      SELECT id, username, display_name, email, avatar_url, team_name
      FROM users
      WHERE is_enabled = TRUE
    `;
    const params: any[] = [];

    if (q) {
      params.push(`%${q}%`);
      query += ` AND (username ILIKE $${params.length} OR display_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    const isDemo = !user || user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local';
    if (!isDemo && user?.team_name) {
      params.push(user.team_name);
      query += ` AND (team_name = $${params.length} OR team_name IS NULL)`;
    }

    query += ` ORDER BY display_name ASC LIMIT 10`;

    const { rows } = await db.query(query, params);

    return NextResponse.json({
      users: rows.map((r: any) => ({
        id: String(r.id),
        username: r.username || r.email.split('@')[0],
        display_name: r.display_name || r.username || r.email,
        email: r.email,
        avatar_url: r.avatar_url,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
