import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(`${origin}/api/v1/oauth/github/callback?code=mock_github_dev_login`);
  }

  const redirectUri = `${origin}/api/v1/oauth/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
  return NextResponse.redirect(githubAuthUrl);
}
