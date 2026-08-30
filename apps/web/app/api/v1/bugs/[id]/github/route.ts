import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser, canUserAccessBug } from '@/lib/services/auth';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const bugId = parseInt(params.id, 10);
    if (isNaN(bugId)) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Bug ID must be an integer' }, { status: 400 });
    }

    const user = await getCurrentUser();
    const hasAccess = await canUserAccessBug(bugId, user?.id ?? null);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const isDemo = !user || (user && (user.email.endsWith('@mozilla.com') || user.email === 'admin@mantis.local'));

    let commitsQuery = `
      SELECT id, bug_id, repo_full_name, commit_sha, commit_message, author_name, author_email, committed_at, html_url, created_at
      FROM bug_commits
      WHERE bug_id = $1
    `;
    let prsQuery = `
      SELECT id, bug_id, repo_full_name, pr_number, pr_title, pr_state, pr_url, merged_at, created_at
      FROM bug_pull_requests
      WHERE bug_id = $1
    `;

    if (!isDemo) {
      commitsQuery += ` AND repo_full_name NOT LIKE '%mantis-webhook-demo%' AND repo_full_name NOT LIKE '%gecko-dev%'`;
      prsQuery += ` AND repo_full_name NOT LIKE '%mantis-webhook-demo%' AND repo_full_name NOT LIKE '%gecko-dev%'`;
    }

    commitsQuery += ` ORDER BY committed_at DESC NULLS LAST, created_at DESC`;
    prsQuery += ` ORDER BY created_at DESC`;

    const [commitsRes, prsRes] = await Promise.all([
      db.query(commitsQuery, [bugId]),
      db.query(prsQuery, [bugId]),
    ]);

    return NextResponse.json({
      commits: commitsRes.rows.map((r: any) => ({ ...r, id: Number(r.id), bug_id: Number(r.bug_id) })),
      pull_requests: prsRes.rows.map((r: any) => ({ ...r, id: Number(r.id), bug_id: Number(r.bug_id) })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const bugId = parseInt(params.id, 10);
    if (isNaN(bugId)) {
      return NextResponse.json({ error: 'INVALID_ID', message: 'Bug ID must be an integer' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Must be logged in to link SCM changes' }, { status: 401 });
    }

    const hasAccess = await canUserAccessBug(bugId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Bug not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { type, repo_full_name, commit_sha, commit_message, html_url, pr_number, pr_title, pr_state } = body;

    const repo = repo_full_name?.trim() || 'myorg/repo';

    if (type === 'pr') {
      const prNum = parseInt(pr_number, 10) || 1;
      const title = pr_title?.trim() || `PR #${prNum} for Bug #${bugId}`;
      const state = pr_state || 'open';
      const url = html_url?.trim() || `https://github.com/${repo}/pull/${prNum}`;

      const { rows } = await db.query(
        `INSERT INTO bug_pull_requests (bug_id, repo_full_name, pr_number, pr_title, pr_state, pr_url, merged_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [bugId, repo, prNum, title, state, url, state === 'merged' ? new Date() : null]
      );

      return NextResponse.json({ success: true, pull_request: { ...rows[0], id: Number(rows[0].id) } }, { status: 201 });
    } else {
      // Default to commit
      const sha = (commit_sha?.trim() || Math.random().toString(16).slice(2, 13)).slice(0, 11);
      const message = commit_message?.trim() || `Bug ${bugId}: Manual commit trace linked by ${user.display_name}`;
      const url = html_url?.trim() || `https://github.com/${repo}/commit/${sha}`;

      const { rows } = await db.query(
        `INSERT INTO bug_commits (bug_id, repo_full_name, commit_sha, commit_message, author_name, author_email, committed_at, html_url)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
         RETURNING *`,
        [bugId, repo, sha, message, user.display_name, user.email, url]
      );

      return NextResponse.json({ success: true, commit: { ...rows[0], id: Number(rows[0].id) } }, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
