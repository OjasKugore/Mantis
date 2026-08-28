import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db/client.js';
import { hashPassword, verifyPassword } from '../lib/argon.js';
import { authMiddleware } from '../middleware/auth.js';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1),
  username: z.string().min(2).max(64).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function createSession(userId: string, reply: FastifyReply) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  reply.setCookie('session', rawToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return rawToken;
}

export async function authRoutes(app: FastifyInstance) {
  // POST /signup
  app.post('/signup', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = SignupSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid signup payload',
        details: parseResult.error.flatten(),
      });
    }

    const { email, password, display_name } = parseResult.data;
    const username =
      parseResult.data.username ||
      email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    // Check existing email
    const existing = await db.query(
      `SELECT id, email, username FROM users WHERE email = $1 OR username = $2`,
      [email, username]
    );

    if (existing.rows.length > 0) {
      const isEmail = existing.rows.some((r) => r.email.toLowerCase() === email.toLowerCase());
      return reply.code(409).send({
        error: isEmail ? 'EMAIL_ALREADY_EXISTS' : 'USERNAME_ALREADY_EXISTS',
        message: isEmail
          ? 'An account with this email already exists'
          : 'This username is already taken',
      });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO users (email, display_name, username, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, display_name, username, is_admin, is_enabled, created_at`,
      [email, display_name, username, passwordHash]
    );

    const newUser = rows[0];
    await createSession(newUser.id, reply);

    return reply.code(201).send(newUser);
  });

  // POST /login
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = LoginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid login payload',
      });
    }

    const { email, password } = parseResult.data;
    const { rows } = await db.query(
      `SELECT id, email, display_name, username, password_hash, is_admin, is_enabled
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (rows.length === 0 || !rows[0].is_enabled) {
      return reply.code(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const user = rows[0];
    const isValid = await verifyPassword(user.password_hash, password);
    if (!isValid) {
      return reply.code(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    await createSession(user.id, reply);

    return reply.code(200).send({
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      username: user.username,
      is_admin: user.is_admin,
    });
  });

  // POST /logout
  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies?.session;
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await db.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
    }

    reply.clearCookie('session', { path: '/' });
    return reply.code(200).send({ message: 'Logged out successfully' });
  });

  // GET /me
  app.get('/me', { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    return reply.code(200).send(request.user);
  });
}
