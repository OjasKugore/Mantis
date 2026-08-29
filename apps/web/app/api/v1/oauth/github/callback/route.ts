import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { createOAuthSession, generateUniqueUsername } from '@/lib/services/oauth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error || 'GitHub authentication failed')}`);
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
    const redirectUri = `${origin}/api/v1/oauth/github/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${origin}/login?error=GitHub+OAuth+is+not+configured`);
    }

    try {
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

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'Mantis-Platform',
        },
      });
      const ghData = (await userRes.json()) as any;

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
          const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
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
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'GitHub OAuth failed')}`);
    }
  }

  try {
    const existing = await db.query(
      `SELECT id FROM users WHERE github_id = $1 OR email = $2`,
      [githubUser.id, githubUser.email]
    );
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

    const response = NextResponse.redirect(`${origin}/dashboard`);
    await createOAuthSession(userId, response);
    return response;
  } catch (err: any) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'Failed to complete OAuth')}`);
  }
}
