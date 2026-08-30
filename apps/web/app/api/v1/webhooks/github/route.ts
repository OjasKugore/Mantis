import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/client';
import { parseBugRefs } from '@/lib/services/webhookParser';
import { recordActivity } from '@/lib/services/audit';

export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event') || 'push';
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev-github-webhook-secret';

    if (signature && process.env.NODE_ENV === 'production') {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(rawText).digest('hex');
      if (signature !== digest) {
        return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const payload = rawText ? JSON.parse(rawText) : {};
    const processedBugIds: number[] = [];

    if (event === 'push' && Array.isArray(payload.commits)) {
      const repoFullName = payload.repository?.full_name || 'unknown/repo';
      const isDemoRepo = repoFullName.toLowerCase().includes('mantis-webhook-demo') || repoFullName.toLowerCase().includes('gecko-dev');

      for (const commit of payload.commits) {
        const bugIds = parseBugRefs(commit.message || '');

        for (const bugId of bugIds) {
          let bugQuery = `SELECT id, status, reporter_id FROM bugs WHERE id = $1`;
          if (isDemoRepo) {
            bugQuery += ` AND (reporter_id IN (SELECT id FROM users WHERE email LIKE '%@mozilla.com' OR email = 'admin@mantis.local'))`;
          }

          const { rows: bugRows } = await db.query(bugQuery, [bugId]);
          if (bugRows.length === 0) continue;

          const bug = bugRows[0];
          const actorId = bug.reporter_id;

          await db.query(
            `INSERT INTO bug_commits (bug_id, repo_full_name, commit_sha, commit_message, author_name, author_email, committed_at, html_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (bug_id, commit_sha) DO NOTHING`,
            [
              bugId,
              repoFullName,
              commit.id?.slice(0, 11) || '0000000',
              commit.message || '',
              commit.author?.name || 'GitHub Committer',
              commit.author?.email || 'git@github.com',
              commit.timestamp ? new Date(commit.timestamp) : new Date(),
              commit.url || `https://github.com/${repoFullName}/commit/${commit.id}`,
            ]
          );

          // Auto-resolve bug if "fixes", "closes", or "resolves" was in message
          const msgLower = (commit.message || '').toLowerCase();
          if (
            msgLower.includes('fix') ||
            msgLower.includes('close') ||
            msgLower.includes('resolve')
          ) {
            if (bug.status !== 'RESOLVED' && bug.status !== 'VERIFIED' && bug.status !== 'CLOSED') {
              await db.query(
                `UPDATE bugs SET status = 'RESOLVED', resolution = 'FIXED', updated_at = NOW() WHERE id = $1`,
                [bugId]
              );

              await recordActivity(db, {
                bugId,
                whoId: actorId,
                field: 'status',
                oldValue: bug.status,
                newValue: 'RESOLVED',
                comment: `Auto-resolved via GitHub commit: ${commit.message?.slice(0, 80)}`,
              });
            }
          }

          processedBugIds.push(bugId);
        }
      }
    }

    return NextResponse.json({
      received: true,
      event,
      processed_bugs: Array.from(new Set(processedBugIds)),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
