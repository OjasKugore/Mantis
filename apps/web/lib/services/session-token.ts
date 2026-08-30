import crypto from 'crypto';
import type { NextResponse } from 'next/server';

export interface SessionPayload {
  id: string;
  email: string;
  display_name: string;
  username: string;
  is_admin: boolean;
  avatar_url?: string;
  groups?: string[];
  priority_rank?: number;
  onboarded?: boolean;
  team_name?: string;
  exp: number; // Unix timestamp seconds
}

const SECRET = process.env.SESSION_SECRET || 'mantis-session-secret-change-me-in-production-12345';
const COOKIE_NAME = 'mantis_user_token';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function sign(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createUserToken(user: Omit<SessionPayload, 'exp'>): string {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  return sign(payload);
}

export function verifyUserToken(token: string): SessionPayload | null {
  return verify(token);
}

export function setUserTokenCookie(response: NextResponse, user: Omit<SessionPayload, 'exp'>): void {
  const token = createUserToken(user);
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearUserTokenCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export { COOKIE_NAME };
