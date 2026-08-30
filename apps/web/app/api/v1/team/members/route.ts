import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }
    if (!user.is_admin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin privileges required' }, { status: 403 });
    }

    // If the requesting user is a real user, only show real workspace members (exclude fake seed accounts)
    const isDemo = user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local';
    
    let query = `
      SELECT 
         u.id, u.email, u.display_name, u.username, u.avatar_url,
         u.is_admin, u.is_enabled, u.priority_rank, u.created_at,
         COALESCE(
           ARRAY_AGG(g.name) FILTER (WHERE g.name IS NOT NULL),
           '{}'
         ) as groups
       FROM users u
       LEFT JOIN user_group_map ugm ON ugm.user_id = u.id
       LEFT JOIN groups g ON g.id = ugm.group_id
    `;
    const params: any[] = [];

    if (isDemo) {
      query += ` WHERE (u.email LIKE '%@mozilla.com' OR u.email = 'admin@mantis.local')`;
    } else if (user.team_name) {
      query += ` WHERE u.team_name = $1 AND u.email NOT LIKE '%@mozilla.com' AND u.email != 'admin@mantis.local'`;
      params.push(user.team_name);
    } else {
      query += ` WHERE u.id = $1`;
      params.push(user.id);
    }

    query += `
       GROUP BY u.id
       ORDER BY COALESCE(u.priority_rank, 100) ASC, u.created_at ASC
    `;

    const { rows: users } = await db.query(query, params);

    return NextResponse.json({
      members: users.map((u: any) => ({
        ...u,
        priority_rank: u.priority_rank ?? 100,
        groups: u.groups || [],
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
