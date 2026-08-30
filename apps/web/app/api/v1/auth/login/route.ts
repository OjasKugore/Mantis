import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/client';
import { verifyPassword } from '@/lib/argon';
import { setUserTokenCookie } from '@/lib/services/session-token';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'INVALID_CREDENTIALS', message: 'Email and password required' }, { status: 400 });
    }

    const { rows } = await db.query(
      `SELECT id, email, display_name, username, password_hash, is_admin, avatar_url FROM users WHERE email = $1 AND is_enabled = TRUE`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0 || !rows[0].password_hash) {
      return NextResponse.json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }, { status: 401 });
    }

    const user = rows[0];
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }, { status: 401 });
    }

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
    };

    const response = NextResponse.json({ user: safeUser, token: sessionId });
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
