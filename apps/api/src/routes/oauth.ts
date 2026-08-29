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

async function generateUniqueUsername(desiredUsername: string, email: string): Promise<string> {
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

export async function oauthRoutes(app: FastifyInstance) {
  const webBaseUrl = process.env.WEB_URL || 'http://localhost:3000';
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // GET /oauth/github
  app.get('/oauth/github', async (request: FastifyRequest, reply: FastifyReply) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      // Mock bypass for development if no keys are provided
      return reply.redirect('/api/v1/oauth/github/callback?code=mock_github_code');
    }
    const redirectUri = `${apiBaseUrl}/api/v1/oauth/github/callback`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
    return reply.redirect(githubAuthUrl);
  });

  // GET /oauth/github/callback
  app.get('/oauth/github/callback', async (request: FastifyRequest<{ Querystring: { code?: string; error?: string } }>, reply: FastifyReply) => {
    const { code, error } = request.query;
    if (error || !code) {
      return reply.redirect(`${webBaseUrl}/login?error=${encodeURIComponent(error || 'GitHub authentication failed')}`);
    }

    let githubUser: {
      id: string;
      login: string;
      email: string;
      name: string;
      avatar_url?: string;
    };

    if (code === 'mock_github_code') {
      githubUser = {
        id: 'mock_gh_123',
        login: 'mock_github_user',
        email: 'github_user@example.com',
        name: 'Mock GitHub User',
      };
    } else {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      const redirectUri = `${apiBaseUrl}/api/v1/oauth/github/callback`;

      if (!clientId || !clientSecret) {
        return reply.redirect(`${webBaseUrl}/login?error=GitHub+OAuth+is+not+configured`);
      }

      try {
        // Exchange authorization code for access token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
          }),
        });

        const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };
        if (!tokenData.access_token) {
          throw new Error(tokenData.error_description || tokenData.error || 'Failed to obtain access token from GitHub');
        }

        // Fetch user profile
        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'User-Agent': 'Mantis-Platform',
          },
        });
        const ghData = (await userRes.json()) as any;

        // Ensure user email is fetched (even if primary/private)
        let primaryEmail = ghData.email;
        if (!primaryEmail) {
          const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'User-Agent': 'Mantis-Platform',
            },
          });
          if (emailsRes.ok) {
            const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
            const primary = emails.find(e => e.primary && e.verified) || emails.find(e => e.verified) || emails[0];
            if (primary) {
              primaryEmail = primary.email;
            }
          }
        }

        if (!primaryEmail) {
          primaryEmail = `${ghData.login}@users.noreply.github.com`;
        }

        githubUser = {
          id: String(ghData.id),
          login: ghData.login,
          email: primaryEmail,
          name: ghData.name || ghData.login,
          avatar_url: ghData.avatar_url,
        };
      } catch (err: any) {
        request.log.error(err, 'GitHub OAuth Exchange Error');
        return reply.redirect(`${webBaseUrl}/login?error=${encodeURIComponent(err.message || 'GitHub OAuth failed')}`);
      }
    }

    const existing = await db.query(`SELECT id FROM users WHERE github_id = $1 OR email = $2`, [githubUser.id, githubUser.email]);
    let userId: string;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      await db.query(
        `UPDATE users 
         SET github_id = $1, 
             avatar_url = COALESCE($2, avatar_url),
             display_name = COALESCE($3, display_name) 
         WHERE id = $4`,
        [githubUser.id, githubUser.avatar_url || null, githubUser.name, userId]
      );
    } else {
      const username = await generateUniqueUsername(githubUser.login, githubUser.email);
      const { rows } = await db.query(
        `INSERT INTO users (email, display_name, username, avatar_url, github_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [githubUser.email, githubUser.name || username, username, githubUser.avatar_url || null, githubUser.id]
      );
      userId = rows[0].id;
    }

    await createSession(userId, reply);
    return reply.redirect(`${webBaseUrl}/dashboard`);
  });

  // GET /oauth/google
  app.get('/oauth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      // Mock bypass for development if no keys are provided
      return reply.redirect('/api/v1/oauth/google/callback?code=mock_google_code');
    }
    const redirectUri = `${apiBaseUrl}/api/v1/oauth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`;
    return reply.redirect(googleAuthUrl);
  });

  // GET /oauth/google/callback
  app.get('/oauth/google/callback', async (request: FastifyRequest<{ Querystring: { code?: string; error?: string } }>, reply: FastifyReply) => {
    const { code, error } = request.query;
    if (error || !code) {
      return reply.redirect(`${webBaseUrl}/login?error=${encodeURIComponent(error || 'Google authentication failed')}`);
    }

    let googleUser: {
      id: string;
      email: string;
      name: string;
      avatar_url?: string;
    };

    if (code === 'mock_google_code') {
      googleUser = {
        id: 'mock_go_123',
        email: 'google_user@example.com',
        name: 'Mock Google User',
      };
    } else {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${apiBaseUrl}/api/v1/oauth/google/callback`;

      if (!clientId || !clientSecret) {
        return reply.redirect(`${webBaseUrl}/login?error=Google+OAuth+is+not+configured`);
      }

      try {
        // Exchange authorization code for token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }).toString(),
        });

        const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string };
        if (!tokenData.access_token) {
          throw new Error(tokenData.error_description || tokenData.error || 'Failed to obtain access token from Google');
        }

        // Fetch Google User Profile
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });
        const goData = (await userRes.json()) as any;

        if (!goData.email) {
          throw new Error('No email found in Google profile');
        }

        googleUser = {
          id: goData.sub,
          email: goData.email,
          name: goData.name || goData.email.split('@')[0],
          avatar_url: goData.picture,
        };
      } catch (err: any) {
        request.log.error(err, 'Google OAuth Exchange Error');
        return reply.redirect(`${webBaseUrl}/login?error=${encodeURIComponent(err.message || 'Google OAuth failed')}`);
      }
    }

    const existing = await db.query(`SELECT id FROM users WHERE google_id = $1 OR email = $2`, [googleUser.id, googleUser.email]);
    let userId: string;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      await db.query(
        `UPDATE users 
         SET google_id = $1, 
             avatar_url = COALESCE($2, avatar_url),
             display_name = COALESCE($3, display_name) 
         WHERE id = $4`,
        [googleUser.id, googleUser.avatar_url || null, googleUser.name, userId]
      );
    } else {
      const username = await generateUniqueUsername(googleUser.email.split('@')[0], googleUser.email);
      const { rows } = await db.query(
        `INSERT INTO users (email, display_name, username, avatar_url, google_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [googleUser.email, googleUser.name, username, googleUser.avatar_url || null, googleUser.id]
      );
      userId = rows[0].id;
    }

    await createSession(userId, reply);
    return reply.redirect(`${webBaseUrl}/dashboard`);
  });
}

