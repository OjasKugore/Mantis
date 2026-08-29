import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client.js';
import { verifyGitHubSignature } from '../lib/hmac.js';
import { parseBugRefs } from '../services/webhookParser.js';
import { canUserAccessBug } from '../middleware/groupFilter.js';

export async function webhookRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/bugs/:id/github
   * Retrieves linked commits and pull requests for a specific bug.
   */
  app.get<{ Params: { id: string } }>(
    '/bugs/:id/github',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const bugId = Number(request.params.id);
      if (isNaN(bugId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Bug ID must be numeric' });
      }

      const userId = (request as any).user?.id || null;
      const hasAccess = await canUserAccessBug(bugId, userId);
      if (!hasAccess) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Bug not found' });
      }

      const { rows: commits } = await db.query(
        `SELECT * FROM bug_commits WHERE bug_id = $1 ORDER BY committed_at DESC`,
        [bugId]
      );
      const { rows: pull_requests } = await db.query(
        `SELECT * FROM bug_pull_requests WHERE bug_id = $1 ORDER BY id DESC`,
        [bugId]
      );

      return reply.code(200).send({ commits, pull_requests });
    }
  );

  /**
   * Raw body parser hook for GitHub Webhook HMAC signature verification.
   * Preserves raw Buffer on (request as any).rawBody.
   */
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body: Buffer, done) => {
    try {
      (req as any).rawBody = body;
      const json = JSON.parse(body.toString('utf-8'));
      done(null, json);
    } catch (err: any) {
      done(err, undefined);
    }
  });

  /**
   * POST /api/v1/webhooks/github
   * SCM Webhook handler for GitHub Push and Pull Request events.
   * Auto-records commits/PRs and auto-resolves bugs.
   */
  app.post('/webhooks/github', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    const event = (request.headers['x-github-event'] as string) || 'push';
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev-github-webhook-secret';

    const rawBody: Buffer = (request as any).rawBody || Buffer.from(JSON.stringify(request.body || {}));

    // Verify HMAC signature
    const isValid = verifyGitHubSignature(rawBody, signature, secret);
    if (!isValid) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid webhook signature',
      });
    }

    const payload = request.body as any;
    const processedBugIds: number[] = [];

    // System user fallback for audit log
    const systemUserId = '00000000-0000-0000-0000-000000000000';

    if (event === 'push' && Array.isArray(payload.commits)) {
      const repoFullName = payload.repository?.full_name || 'unknown/repo';

      for (const commit of payload.commits) {
        const bugIds = parseBugRefs(commit.message || '');

        for (const bugId of bugIds) {
          // Check if bug exists
          const { rows: bugRows } = await db.query(`SELECT id, status, reporter_id FROM bugs WHERE id = $1`, [bugId]);
          if (bugRows.length === 0) continue;

          const bug = bugRows[0];
          const actorId = bug.reporter_id || systemUserId;

          // Insert into bug_commits
          await db.query(
            `INSERT INTO bug_commits (bug_id, repo_full_name, commit_sha, commit_message, author_name, author_email, committed_at, html_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (bug_id, commit_sha) DO NOTHING`,
            [
              bugId,
              repoFullName,
              commit.id || commit.sha || 'unknown-sha',
              commit.message || '',
              commit.author?.name || 'GitHub Contributor',
              commit.author?.email || 'git@github.com',
              commit.timestamp ? new Date(commit.timestamp) : new Date(),
              commit.url || null,
            ]
          );

          // Auto-resolve bug if active
          if (['UNCONFIRMED', 'CONFIRMED', 'IN_PROGRESS'].includes(bug.status)) {
            await db.query(
              `UPDATE bugs SET status = 'RESOLVED', resolution = 'FIXED', updated_at = NOW() WHERE id = $1`,
              [bugId]
            );

            await db.query(
              `INSERT INTO bugs_activity (bug_id, who_id, field, old_value, new_value, comment)
               VALUES ($1, $2, 'status', $3, 'RESOLVED', 'Auto-resolved via GitHub Webhook commit')`,
              [bugId, actorId, bug.status]
            );
          }

          if (!processedBugIds.includes(bugId)) {
            processedBugIds.push(bugId);
          }
        }
      }
    } else if (event === 'pull_request' && payload.pull_request) {
      const pr = payload.pull_request;
      const repoFullName = payload.repository?.full_name || 'unknown/repo';
      const action = payload.action || 'opened';
      const combinedText = `${pr.title || ''}\n${pr.body || ''}`;
      const bugIds = parseBugRefs(combinedText);

      const prState = pr.merged ? 'merged' : pr.state === 'closed' ? 'closed' : 'open';

      for (const bugId of bugIds) {
        const { rows: bugRows } = await db.query(`SELECT id, status, reporter_id FROM bugs WHERE id = $1`, [bugId]);
        if (bugRows.length === 0) continue;

        const bug = bugRows[0];
        const actorId = bug.reporter_id || systemUserId;

        // Upsert into bug_pull_requests
        await db.query(
          `INSERT INTO bug_pull_requests (bug_id, repo_full_name, pr_number, pr_title, pr_state, pr_url, merged_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (bug_id, repo_full_name, pr_number)
           DO UPDATE SET pr_title = EXCLUDED.pr_title, pr_state = EXCLUDED.pr_state, merged_at = EXCLUDED.merged_at`,
          [
            bugId,
            repoFullName,
            pr.number,
            pr.title || 'Untitled PR',
            prState,
            pr.html_url || '',
            pr.merged_at ? new Date(pr.merged_at) : null,
          ]
        );

        // Auto-resolve if PR merged
        if ((action === 'closed' || pr.merged) && pr.merged && ['UNCONFIRMED', 'CONFIRMED', 'IN_PROGRESS'].includes(bug.status)) {
          await db.query(
            `UPDATE bugs SET status = 'RESOLVED', resolution = 'FIXED', updated_at = NOW() WHERE id = $1`,
            [bugId]
          );

          await db.query(
            `INSERT INTO bugs_activity (bug_id, who_id, field, old_value, new_value, comment)
             VALUES ($1, $2, 'status', $3, 'RESOLVED', 'Auto-resolved via GitHub Webhook PR merge')`,
            [bugId, actorId, bug.status]
          );
        }

        if (!processedBugIds.includes(bugId)) {
          processedBugIds.push(bugId);
        }
      }
    }

    return reply.status(200).send({
      status: 'processed',
      event,
      processedBugIds,
    });
  });
}
