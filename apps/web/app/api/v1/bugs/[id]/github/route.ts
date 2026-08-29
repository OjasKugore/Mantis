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

    const [commitsRes, prsRes] = await Promise.all([
      db.query(
        `SELECT id, bug_id, repo_full_name, commit_sha, commit_message, author_name, author_email, committed_at, html_url, created_at
         FROM bug_commits
         WHERE bug_id = $1
         ORDER BY committed_at DESC NULLS LAST, created_at DESC`,
        [bugId]
      ),
      db.query(
        `SELECT id, bug_id, repo_full_name, pr_number, pr_title, pr_state, pr_url, merged_at, created_at
         FROM bug_pull_requests
         WHERE bug_id = $1
         ORDER BY created_at DESC`,
        [bugId]
      ),
    ]);

    return NextResponse.json({
      commits: commitsRes.rows.map((r: any) => ({ ...r, id: Number(r.id), bug_id: Number(r.bug_id) })),
      pull_requests: prsRes.rows.map((r: any) => ({ ...r, id: Number(r.id), bug_id: Number(r.bug_id) })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
