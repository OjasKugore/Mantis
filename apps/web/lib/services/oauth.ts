import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '../db/client';
import { setUserTokenCookie, type SessionPayload } from './session-token';

export async function createOAuthSession(
  userId: string,
  response: NextResponse,
  user?: Omit<SessionPayload, 'exp'>
): Promise<string> {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  };

  response.cookies.set('sessionId', sessionId, cookieOptions);
  response.cookies.set('session', sessionId, cookieOptions);

  // Also set signed user token for serverless/Vercel cold-start resilience
  if (user) {
    setUserTokenCookie(response, user);
  }

  return sessionId;
}

export async function generateUniqueUsername(desiredUsername: string, email: string): Promise<string> {
  let clean = (desiredUsername || email.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 50);
  if (!clean) clean = 'user';

  let candidate = clean;
  let counter = 1;

  while (true) {
    const existing = await db.query(`SELECT id FROM users WHERE username = $1`, [candidate]);
    if (existing.rows.length === 0) {
      return candidate;
    }
    candidate = `${clean}_${counter}`;
    counter++;
  }
}
