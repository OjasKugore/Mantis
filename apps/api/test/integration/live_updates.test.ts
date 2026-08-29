import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { db } from '../../src/db/client.js';
import {
  setupTestEnvironment,
  getTestApp,
  resetDb,
  createTestUser,
  getAuthCookieForUser,
  createTestBug,
  createTestGroup,
} from '../helpers/setup.js';

describe('Live Updates Polling Integration Tests (T3.21 – T3.23)', () => {
  let app: FastifyInstance;
  let user: any;
  let cookie: string;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser({ email: 'liveupdates@example.com' });
    user = created.user;
    cookie = await getAuthCookieForUser(user.id);
  });

  // T3.21 — GET /api/v1/bugs/:id/poll?since=<ISO> returns activity changes and new comments
  it('T3.21: GET /api/v1/bugs/:id/poll returns changes and comments after timestamp', async () => {
    const bug = await createTestBug(user.id, { summary: 'Polling target bug' });
    const pastTimestamp = new Date(Date.now() - 10000).toISOString();

    // 1. Add activity entry
    await db.query(
      `INSERT INTO bugs_activity (bug_id, who_id, field, old_value, new_value, comment)
       VALUES ($1, $2, 'status', 'UNCONFIRMED', 'CONFIRMED', 'Confirmed issue')`,
      [bug.id, user.id]
    );

    // 2. Add comment
    await db.query(
      `INSERT INTO bug_comments (bug_id, author_id, body)
       VALUES ($1, $2, 'New live comment text')`,
      [bug.id, user.id]
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${bug.id}/poll?since=${encodeURIComponent(pastTimestamp)}`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.bug_id).toBe(bug.id);
    expect(json.changes.some((c: any) => c.field === 'status' && c.new_value === 'CONFIRMED')).toBe(true);
    expect(json.comments).toHaveLength(1);
    expect(json.comments[0].body).toBe('New live comment text');
  });

  // T3.22 — GET /api/v1/bugs/:id/poll returns empty arrays if no changes occurred after since
  it('T3.22: GET /api/v1/bugs/:id/poll returns empty arrays when no new activity exists', async () => {
    const bug = await createTestBug(user.id, { summary: 'Quiet bug' });
    const futureTimestamp = new Date(Date.now() + 60000).toISOString();

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${bug.id}/poll?since=${encodeURIComponent(futureTimestamp)}`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.changes).toHaveLength(0);
    expect(json.comments).toHaveLength(0);
  });

  // T3.23 — Group secrecy: 404 returned for unauthorized user polling a restricted bug
  it('T3.23: Group secrecy: GET /api/v1/bugs/:id/poll returns 404 for non-group member', async () => {
    const secGroup = await createTestGroup('security-team');
    const restrictedBug = await createTestBug(user.id, { summary: 'Embargoed vulnerability' });

    await db.query(`INSERT INTO bug_group_map (bug_id, group_id) VALUES ($1, $2)`, [
      restrictedBug.id,
      secGroup.id,
    ]);

    const unauthorizedUser = await createTestUser({ email: 'unauth@example.com' });
    const unauthCookie = await getAuthCookieForUser(unauthorizedUser.user.id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${restrictedBug.id}/poll`,
      headers: { cookie: unauthCookie },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('NOT_FOUND');
  });
});
