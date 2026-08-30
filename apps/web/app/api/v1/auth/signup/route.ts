import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { hashPassword } from '@/lib/argon';
import { setUserTokenCookie } from '@/lib/services/session-token';

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
      const issue = parseResult.error.issues[0];
      const field = issue?.path?.[0];
      let msg = 'Invalid signup payload';
      if (field === 'password') msg = 'Password must be at least 6 characters';
      else if (field === 'email') msg = 'Please enter a valid email address';
      else if (field === 'display_name') msg = 'Full name is required';
      else if (issue?.message) msg = issue.message;

      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        code: 'VALIDATION_ERROR',
        message: msg,
        details: parseResult.error.flatten(),
      }, { status: 400 });
    }

    const { email, password, display_name } = parseResult.data;
    // Always normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();
    const username =
      parseResult.data.username?.trim() ||
      normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    // Check existing email or username
    const existing = await db.query(
      `SELECT id, email, username FROM users WHERE LOWER(email) = $1 OR username = $2`,
      [normalizedEmail, username]
    );

    if (existing.rows.length > 0) {
      const isEmail = existing.rows.some((r: any) => r.email.toLowerCase() === normalizedEmail);
      const errorCode = isEmail ? 'EMAIL_ALREADY_EXISTS' : 'USERNAME_ALREADY_EXISTS';
      return NextResponse.json({
        error: errorCode,
        code: errorCode,
        message: isEmail
          ? 'An account with this email already exists'
          : 'This username is already taken',
      }, { status: 409 });
    }

    // Check if there is an active invite token or pending invite by email
    const inviteToken = rawBody.invite_token;
    let inviteRecord: any = null;

    if (inviteToken) {
      const invRes = await db.query(
        `SELECT id, is_admin, groups, invited_by FROM team_invites WHERE token = $1 AND is_accepted = FALSE AND expires_at > NOW()`,
        [inviteToken]
      );
      if (invRes.rows.length > 0) {
        inviteRecord = invRes.rows[0];
      }
    } else {
      const invEmailRes = await db.query(
        `SELECT id, is_admin, groups, invited_by FROM team_invites WHERE LOWER(email) = $1 AND is_accepted = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
        [normalizedEmail]
      );
      if (invEmailRes.rows.length > 0) {
        inviteRecord = invEmailRes.rows[0];
      }
    }

    // Genesis admin detection: If no active non-demo users exist, this user is the root instance admin
    const { rows: nonDemoUsers } = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE email NOT LIKE '%@mozilla.com' AND email != 'admin@mantis.local'`
    );
    const isFirstUser = parseInt(nonDemoUsers[0].count, 10) === 0;

    const makeAdmin = isFirstUser || Boolean(inviteRecord?.is_admin);

    // Look up inviter's team_name if this user came via an invite
    let userTeamName: string | null = null;
    let isOnboarded = false;
    if (inviteRecord?.invited_by) {
      const inviterRes = await db.query(`SELECT team_name FROM users WHERE id = $1`, [inviteRecord.invited_by]);
      if (inviterRes.rows.length > 0 && inviterRes.rows[0].team_name) {
        userTeamName = inviterRes.rows[0].team_name;
        isOnboarded = true;
      }
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO users (email, display_name, username, password_hash, is_admin, onboarded, team_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, display_name, username, is_admin, is_enabled, avatar_url, priority_rank, onboarded, team_name, created_at`,
      [normalizedEmail, display_name.trim(), username, passwordHash, makeAdmin, isOnboarded, userTeamName]
    );

    const newUser = rows[0];

    // Assign groups
    const assignedGroups: string[] = inviteRecord?.groups || (isFirstUser ? ['security-team', 'dev-team', 'qa-team'] : ['dev-team']);
    for (const gName of assignedGroups) {
      const gRes = await db.query(`SELECT id FROM groups WHERE name = $1`, [gName]);
      if (gRes.rows.length > 0) {
        await db.query(
          `INSERT INTO user_group_map (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newUser.id, gRes.rows[0].id]
        );
      }
    }

    // Mark invite as accepted if one was used
    if (inviteRecord) {
      await db.query(
        `UPDATE team_invites SET is_accepted = TRUE, accepted_by = $1 WHERE id = $2`,
        [newUser.id, inviteRecord.id]
      );
    }

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [newUser.id, tokenHash, expiresAt]
    );

    const safeUser = {
      id: newUser.id,
      email: newUser.email,
      display_name: newUser.display_name,
      username: newUser.username,
      is_admin: newUser.is_admin,
      avatar_url: newUser.avatar_url,
      onboarded: Boolean(newUser.onboarded),
      team_name: newUser.team_name || null,
      groups: assignedGroups,
      priority_rank: newUser.priority_rank ?? 100,
    };

    const response = NextResponse.json({
      user: safeUser,
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
    setUserTokenCookie(response, safeUser);

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
