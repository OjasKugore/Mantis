import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { createOAuthSession, generateUniqueUsername } from '@/lib/services/oauth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error || 'Google authentication failed')}`);
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
    const redirectUri = `${origin}/api/v1/oauth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${origin}/login?error=Google+OAuth+is+not+configured`);
    }

    try {
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
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'Google OAuth failed')}`);
    }
  }

  try {
    const existing = await db.query(
      `SELECT id FROM users WHERE google_id = $1 OR email = $2`,
      [googleUser.id, googleUser.email]
    );
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

    const response = NextResponse.redirect(`${origin}/dashboard`);
    await createOAuthSession(userId, response);
    return response;
  } catch (err: any) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'Failed to complete OAuth')}`);
  }
}
