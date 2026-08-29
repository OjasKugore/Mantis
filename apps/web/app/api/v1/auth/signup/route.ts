import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { hashPassword } from '@/lib/argon';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1),
  username: z.string().min(2).max(64).optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parseResult = SignupSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid signup payload',
        details: parseResult.error.flatten(),
      }, { status: 400 });
    }

    const { email, password, display_name } = parseResult.data;
    const username =
      parseResult.data.username ||
      email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    // Check existing email or username
    const existing = await db.query(
      `SELECT id, email, username FROM users WHERE email = $1 OR username = $2`,
      [email, username]
    );

    if (existing.rows.length > 0) {
      const isEmail = existing.rows.some((r: any) => r.email.toLowerCase() === email.toLowerCase());
      return NextResponse.json({
        error: isEmail ? 'EMAIL_ALREADY_EXISTS' : 'USERNAME_ALREADY_EXISTS',
        message: isEmail
          ? 'An account with this email already exists'
          : 'This username is already taken',
      }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO users (email, display_name, username, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, display_name, username, is_admin, is_enabled, avatar_url, created_at`,
      [email, display_name, username, passwordHash]
    );

    const newUser = rows[0];

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [newUser.id, tokenHash, expiresAt]
    );

    const response = NextResponse.json({
      user: newUser,
      token: sessionId,
      message: 'Account created successfully',
    }, { status: 201 });

    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
