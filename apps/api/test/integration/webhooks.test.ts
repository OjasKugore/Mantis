import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createHmac } from 'crypto';
import { db } from '../../src/db/client.js';
import {
  setupTestEnvironment,
  getTestApp,
  resetDb,
  createTestUser,
  createTestBug,
} from '../helpers/setup.js';

describe('GitHub Webhooks Integration Tests (T3.14 – T3.20)', () => {
  let app: FastifyInstance;
  let user: any;
  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev-github-webhook-secret';

  function signPayload(payload: object, customSecret = secret): string {
    const raw = JSON.stringify(payload);
    return `sha256=${createHmac('sha256', customSecret).update(Buffer.from(raw)).digest('hex')}`;
  }

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser({ email: 'webhooks@example.com' });
    user = created.user;
  });

  // T3.14 — Invalid HMAC signature returns 401 Unauthorized
  it('T3.14: Webhook rejects invalid signature with HTTP 401', async () => {
    const payload = { repository: { full_name: 'org/repo' }, commits: [] };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'x-hub-signature-256': 'sha256=invalid-signature-hash',
        'x-github-event': 'push',
        'content-type': 'application/json',
      },
      payload,
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('UNAUTHORIZED');
  });

  // T3.15 — Valid push event with 'fixes #101' inserts bug_commits and transitions bug to RESOLVED
  it('T3.15: Push event with fixes #101 inserts bug_commits and auto-resolves bug', async () => {
    const bug = await createTestBug(user.id, { summary: 'Null pointer in auth module', status: 'CONFIRMED' });

    const payload = {
      repository: { full_name: 'acme/webapp' },
      commits: [
        {
          id: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4',
          message: `Fix critical auth loop (fixes #${bug.id})`,
          author: { name: 'Alice Dev', email: 'alice@example.com' },
          timestamp: new Date().toISOString(),
          url: 'https://github.com/acme/webapp/commit/a1b2c3d',
        },
      ],
    };

    const signature = signPayload(payload);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'x-hub-signature-256': signature,
        'x-github-event': 'push',
        'content-type': 'application/json',
      },
      payload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().processedBugIds).toContain(bug.id);

    // Verify bug status updated to RESOLVED
    const { rows: updatedBug } = await db.query(`SELECT status, resolution FROM bugs WHERE id = $1`, [bug.id]);
    expect(updatedBug[0].status).toBe('RESOLVED');
    expect(updatedBug[0].resolution).toBe('FIXED');

    // Verify bug_commits inserted
    const { rows: commitRows } = await db.query(`SELECT * FROM bug_commits WHERE bug_id = $1`, [bug.id]);
    expect(commitRows).toHaveLength(1);
    expect(commitRows[0].commit_sha).toBe('a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4');
  });

  // T3.16 — Push event with multiple bug refs (fixes #101, closes #102) auto-resolves both
  it('T3.16: Push event with multiple bug refs auto-resolves both bugs', async () => {
    const bug1 = await createTestBug(user.id, { summary: 'Bug 1', status: 'CONFIRMED' });
    const bug2 = await createTestBug(user.id, { summary: 'Bug 2', status: 'IN_PROGRESS' });

    const payload = {
      repository: { full_name: 'acme/webapp' },
      commits: [
        {
          id: 'c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2',
          message: `Refactor module — fixes #${bug1.id} and resolves #${bug2.id}`,
          author: { name: 'Bob Dev', email: 'bob@example.com' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const signature = signPayload(payload);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'x-hub-signature-256': signature,
        'x-github-event': 'push',
        'content-type': 'application/json',
      },
      payload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().processedBugIds).toContain(bug1.id);
    expect(res.json().processedBugIds).toContain(bug2.id);

    const { rows: b1 } = await db.query(`SELECT status FROM bugs WHERE id = $1`, [bug1.id]);
    const { rows: b2 } = await db.query(`SELECT status FROM bugs WHERE id = $1`, [bug2.id]);
    expect(b1[0].status).toBe('RESOLVED');
    expect(b2[0].status).toBe('RESOLVED');
  });

  // T3.17 — PR open event inserts into bug_pull_requests with state open
  it('T3.17: PR open event records bug_pull_requests entry', async () => {
    const bug = await createTestBug(user.id, { summary: 'PR target bug' });

    const payload = {
      action: 'opened',
      repository: { full_name: 'acme/webapp' },
      pull_request: {
        number: 42,
        title: `Fix memory overflow (resolves #${bug.id})`,
        body: 'Details here',
        state: 'open',
        merged: false,
        html_url: 'https://github.com/acme/webapp/pull/42',
      },
    };

    const signature = signPayload(payload);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'x-hub-signature-256': signature,
        'x-github-event': 'pull_request',
        'content-type': 'application/json',
      },
      payload,
    });

    expect(res.statusCode).toBe(200);

    const { rows: prRows } = await db.query(`SELECT * FROM bug_pull_requests WHERE bug_id = $1`, [bug.id]);
    expect(prRows).toHaveLength(1);
    expect(prRows[0].pr_number).toBe(42);
    expect(prRows[0].pr_state).toBe('open');
  });

  // T3.18 — PR closed & merged event updates state to merged and auto-resolves bug
  it('T3.18: PR closed and merged event updates state to merged and auto-resolves bug', async () => {
    const bug = await createTestBug(user.id, { summary: 'PR merge target', status: 'IN_PROGRESS' });

    const payload = {
      action: 'closed',
      repository: { full_name: 'acme/webapp' },
      pull_request: {
        number: 43,
        title: `Feature completion (closes #${bug.id})`,
        body: 'Merging fix',
        state: 'closed',
        merged: true,
        merged_at: new Date().toISOString(),
        html_url: 'https://github.com/acme/webapp/pull/43',
      },
    };

    const signature = signPayload(payload);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'x-hub-signature-256': signature,
        'x-github-event': 'pull_request',
        'content-type': 'application/json',
      },
      payload,
    });

    expect(res.statusCode).toBe(200);

    const { rows: bugRow } = await db.query(`SELECT status, resolution FROM bugs WHERE id = $1`, [bug.id]);
    expect(bugRow[0].status).toBe('RESOLVED');
    expect(bugRow[0].resolution).toBe('FIXED');

    const { rows: prRows } = await db.query(`SELECT * FROM bug_pull_requests WHERE bug_id = $1`, [bug.id]);
    expect(prRows[0].pr_state).toBe('merged');
  });

  // T3.19 — Non-existent bug reference handled gracefully
  it('T3.19: Non-existent bug reference in commit handled gracefully', async () => {
    const payload = {
      repository: { full_name: 'acme/webapp' },
      commits: [
        {
          id: '9999999999999999999999999999999999999999',
          message: 'fixes #999999',
        },
      ],
    };

    const signature = signPayload(payload);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'x-hub-signature-256': signature,
        'x-github-event': 'push',
        'content-type': 'application/json',
      },
      payload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().processedBugIds).toHaveLength(0);
  });

  // T3.20 — Activity log entry recorded in bugs_activity
  it('T3.20: Auto-resolving bug via webhook records audit entry in bugs_activity', async () => {
    const bug = await createTestBug(user.id, { summary: 'Audit test bug', status: 'CONFIRMED' });

    const payload = {
      repository: { full_name: 'acme/webapp' },
      commits: [
        {
          id: 'f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1',
          message: `Fix bug (fixes #${bug.id})`,
        },
      ],
    };

    const signature = signPayload(payload);

    await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/github',
      headers: {
        'x-hub-signature-256': signature,
        'x-github-event': 'push',
        'content-type': 'application/json',
      },
      payload,
    });

    const { rows: activity } = await db.query(
      `SELECT * FROM bugs_activity WHERE bug_id = $1 AND field = 'status' AND new_value = 'RESOLVED'`,
      [bug.id]
    );

    expect(activity).toHaveLength(1);
    expect(activity[0].comment).toContain('GitHub Webhook');
  });
});
