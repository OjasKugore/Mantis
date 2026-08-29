import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { db } from '../db/client.js';

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

export async function oauthRoutes(app: FastifyInstance) {
  // GET /oauth/github
  app.get('/oauth/github', async (request: FastifyRequest, reply: FastifyReply) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      // Mock bypass for development if no keys
      return reply.redirect('/api/v1/oauth/github/callback?code=mock_github_code');
    }
    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/oauth/github/callback`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
    return reply.redirect(githubAuthUrl);
  });

  // GET /oauth/github/callback
  app.get('/oauth/github/callback', async (request: FastifyRequest<{ Querystring: { code: string } }>, reply: FastifyReply) => {
    const { code } = request.query;
    if (!code) {
      return reply.code(400).send({ error: 'Missing code' });
    }

    let githubUser: any = {
      id: 'mock_gh_123',
      login: 'mock_github_user',
      email: 'github_user@example.com',
      name: 'Mock GitHub User',
    };

    if (code !== 'mock_github_code') {
      // Real exchange logic here
    }

    const existing = await db.query(`SELECT id FROM users WHERE github_id = $1 OR email = $2`, [githubUser.id, githubUser.email]);
    let userId;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      await db.query(`UPDATE users SET github_id = $1 WHERE id = $2`, [githubUser.id, userId]);
    } else {
      const { rows } = await db.query(
        `INSERT INTO users (email, display_name, username, github_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [githubUser.email, githubUser.name || githubUser.login, githubUser.login, githubUser.id]
      );
      userId = rows[0].id;
    }

    await createSession(userId, reply);
    return reply.redirect(`http://localhost:3000/dashboard`);
  });

  // GET /oauth/google
  app.get('/oauth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      // Mock bypass for development if no keys
      return reply.redirect('/api/v1/oauth/google/callback?code=mock_google_code');
    }
    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/oauth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`;
    return reply.redirect(googleAuthUrl);
  });

  // GET /oauth/google/callback
  app.get('/oauth/google/callback', async (request: FastifyRequest<{ Querystring: { code: string } }>, reply: FastifyReply) => {
    const { code } = request.query;
    if (!code) {
      return reply.code(400).send({ error: 'Missing code' });
    }

    let googleUser: any = {
      id: 'mock_go_123',
      email: 'google_user@example.com',
      name: 'Mock Google User',
    };

    if (code !== 'mock_google_code') {
      // Real exchange logic here
    }

    const existing = await db.query(`SELECT id FROM users WHERE google_id = $1 OR email = $2`, [googleUser.id, googleUser.email]);
    let userId;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      await db.query(`UPDATE users SET google_id = $1 WHERE id = $2`, [googleUser.id, userId]);
    } else {
      const username = googleUser.email.split('@')[0];
      const { rows } = await db.query(
        `INSERT INTO users (email, display_name, username, google_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [googleUser.email, googleUser.name, username, googleUser.id]
      );
      userId = rows[0].id;
    }

    await createSession(userId, reply);
    return reply.redirect(`http://localhost:3000/dashboard`);
  });
}
