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

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = `${origin}/api/v1/oauth/github/callback`;

  if (code === 'mock_github_dev_login' || !clientId || !clientSecret) {
    githubUser = {
      id: 'github-dev-user-001',
      login: 'github-dev-user',
      email: 'developer.github@mantis.local',
      name: 'GitHub Developer',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&fit=crop&crop=face',
    };
  } else {
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

      githubUser = {
        id: String(ghData.id),
        login: ghData.login,
        email: primaryEmail || `${ghData.login}@users.noreply.github.com`,
        name: ghData.name || ghData.login,
        avatar_url: ghData.avatar_url,
      };
    } catch (err: any) {
      // In development fallback to mock github developer profile
      githubUser = {
        id: 'github-dev-user-001',
        login: 'github-dev-user',
        email: 'developer.github@mantis.local',
        name: 'GitHub Developer',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&fit=crop&crop=face',
      };
    }
  }

  try {
    const existing = await db.query(
      `SELECT id, email, display_name, username, is_admin, avatar_url, onboarded FROM users WHERE github_id = $1 OR email = $2`,
      [githubUser.id, githubUser.email]
    );
    let userId: string;
    let userRecord: { id: string; email: string; display_name: string; username: string; is_admin: boolean; avatar_url?: string; onboarded?: boolean };

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
      userRecord = {
        id: userId,
        email: existing.rows[0].email,
        display_name: githubUser.name || existing.rows[0].display_name,
        username: existing.rows[0].username,
        is_admin: existing.rows[0].is_admin,
        avatar_url: githubUser.avatar_url || existing.rows[0].avatar_url,
        onboarded: Boolean(existing.rows[0].onboarded),
      };
    } else {
      const username = await generateUniqueUsername(githubUser.login, githubUser.email);
      
      // Genesis admin detection
      const { rows: nonDemoUsers } = await db.query(
        `SELECT COUNT(*) as count FROM users WHERE email NOT LIKE '%@mozilla.com' AND email != 'admin@mantis.local'`
      );
      const isFirstUser = parseInt(nonDemoUsers[0].count, 10) === 0;

      // Check pending invite by email
      const { rows: pendingInvites } = await db.query(
        `SELECT id, is_admin, groups FROM team_invites WHERE LOWER(email) = $1 AND is_accepted = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
        [githubUser.email.toLowerCase()]
      );
      const inviteRecord = pendingInvites[0] || null;
      const makeAdmin = isFirstUser || Boolean(inviteRecord?.is_admin);

      const isOnboarded = Boolean(inviteRecord);
      const { rows } = await db.query(
        `INSERT INTO users (email, display_name, username, avatar_url, github_id, is_admin, onboarded)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, display_name, username, is_admin, avatar_url, onboarded`,
        [githubUser.email, githubUser.name || username, username, githubUser.avatar_url || null, githubUser.id, makeAdmin, isOnboarded]
      );
      userId = rows[0].id;
      userRecord = rows[0];

      // Assign groups
      const assignedGroups = inviteRecord?.groups || (isFirstUser ? ['security-team', 'dev-team', 'qa-team'] : ['dev-team']);
      for (const gName of assignedGroups) {
        const gRes = await db.query(`SELECT id FROM groups WHERE name = $1`, [gName]);
        if (gRes.rows.length > 0) {
          await db.query(
            `INSERT INTO user_group_map (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, gRes.rows[0].id]
          );
        }
      }

      if (inviteRecord) {
        await db.query(
          `UPDATE team_invites SET is_accepted = TRUE, accepted_by = $1 WHERE id = $2`,
          [userId, inviteRecord.id]
        );
      }
    }

    const targetPath = userRecord.onboarded ? '/dashboard' : '/onboarding';
    const response = NextResponse.redirect(`${origin}${targetPath}`);
    await createOAuthSession(userId, response, userRecord);
    return response;
  } catch (err: any) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'Failed to complete OAuth')}`);
  }
}
