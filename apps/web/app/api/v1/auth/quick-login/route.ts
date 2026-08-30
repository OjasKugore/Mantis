import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/client';
import { setUserTokenCookie } from '@/lib/services/session-token';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { persona } = body;

    const personaMap: Record<string, string> = {
      admin: 'admin@mantis.local',
      carol: 'carol@mozilla.com',
      carol_sec: 'carol@mozilla.com',
      alice: 'alice@mozilla.com',
      alice_dev: 'alice@mozilla.com',
      bob: 'bob@mozilla.com',
      bob_qa: 'bob@mozilla.com',
      dave: 'dave@mozilla.com',
      dave_relmgr: 'dave@mozilla.com',
      dave_eng: 'dave@mozilla.com',
      eve: 'eve@mozilla.com',
      eve_triage: 'eve@mozilla.com',
      eve_admin: 'admin@mantis.local',
    };

    const email = personaMap[persona] || 'alice@mozilla.com';

    const { rows } = await db.query(
      `SELECT u.id, u.email, u.display_name, u.username, u.is_admin, u.avatar_url, u.priority_rank, u.onboarded, u.team_name,
              COALESCE(
                ARRAY_AGG(g.name) FILTER (WHERE g.name IS NOT NULL),
                '{}'
              ) as groups
       FROM users u
       LEFT JOIN user_group_map ugm ON ugm.user_id = u.id
       LEFT JOIN groups g ON g.id = ugm.group_id
       WHERE LOWER(u.email) = LOWER($1) AND u.is_enabled = TRUE
       GROUP BY u.id`,
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'USER_NOT_FOUND', message: 'User not found' }, { status: 404 });
    }

    const user = rows[0];

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      username: user.username,
      is_admin: user.is_admin,
      avatar_url: user.avatar_url,
      priority_rank: user.priority_rank ?? 100,
      onboarded: true,
      team_name: user.team_name || 'Mozilla Bugzilla',
      groups: user.groups || [],
    };

    const response = NextResponse.json({
      user: safeUser,
      token: sessionId,
      message: `Quick-login active as ${user.display_name}`,
    });

    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
    setUserTokenCookie(response, safeUser);

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
