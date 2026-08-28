import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import {
  getTestApp,
  resetDb,
  setupTestEnvironment,
  createTestUser,
  getAuthCookieForUser,
  createTestBug,
} from '../helpers/setup.js';
import { db } from '../../src/db/client.js';

describe('Integration: Bug CRUD & State Machine (T1.13 - T1.16)', () => {
  let app: FastifyInstance;
  let testUser: any;
  let authCookie: string;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    const userRes = await createTestUser();
    testUser = userRes.user;
    authCookie = await getAuthCookieForUser(testUser.id);
  });

  it('T1.13 — POST /bugs: sequential numeric ID + initial bugs_activity row in same transaction', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/bugs',
      headers: { cookie: authCookie },
      payload: {
        summary: 'Crash on startup in networking module',
        description: 'Steps to reproduce: open browser, connect to proxy',
        product_id: 1,
        component_id: 1,
        priority: 'P2',
        severity: 'critical',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty('id');
    expect(typeof body.id).toBe('number');
    expect(body.summary).toBe('Crash on startup in networking module');
    expect(body.status).toBe('UNCONFIRMED');

    // Check that bugs_activity record was created in the same transaction
    const activity = await db.query(
      `SELECT * FROM bugs_activity WHERE bug_id = $1 ORDER BY changed_at DESC`,
      [body.id]
    );
    expect(activity.rows.length).toBeGreaterThanOrEqual(1);
    expect(activity.rows[0]).toMatchObject({
      bug_id: body.id,
      who_id: testUser.id,
      field: 'status',
      old_value: null,
      new_value: 'UNCONFIRMED',
    });
  });

  it('T1.14 — PATCH /status valid: updates and writes activity diff', async () => {
    const bug = await createTestBug(testUser.id, { status: 'UNCONFIRMED' });

    // Transition from UNCONFIRMED to CONFIRMED
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/bugs/${bug.id}/status`,
      headers: { cookie: authCookie },
      payload: {
        status: 'CONFIRMED',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: bug.id,
      status: 'CONFIRMED',
    });

    // Check activity log diff
    const activity = await db.query(
      `SELECT * FROM bugs_activity WHERE bug_id = $1 AND field = 'status' ORDER BY changed_at DESC LIMIT 1`,
      [bug.id]
    );
    expect(activity.rows[0]).toMatchObject({
      old_value: 'UNCONFIRMED',
      new_value: 'CONFIRMED',
    });
  });

  it('T1.15 — PATCH /status invalid: 422 and DB status unchanged', async () => {
    const bug = await createTestBug(testUser.id, { status: 'UNCONFIRMED' });

    // Invalid transition: UNCONFIRMED -> CLOSED is forbidden
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/bugs/${bug.id}/status`,
      headers: { cookie: authCookie },
      payload: {
        status: 'CLOSED',
        resolution: 'FIXED',
      },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({
      error: 'INVALID_STATUS_TRANSITION',
    });

    // Verify database status is unchanged
    const dbBug = await db.query(`SELECT status FROM bugs WHERE id = $1`, [bug.id]);
    expect(dbBug.rows[0].status).toBe('UNCONFIRMED');
  });

  it('T1.16 — GET /bugs: paginated, filters by product_id and status', async () => {
    // Create multiple bugs
    await createTestBug(testUser.id, { summary: 'Bug 1', status: 'CONFIRMED', product_id: 1 });
    await createTestBug(testUser.id, { summary: 'Bug 2', status: 'CONFIRMED', product_id: 1 });
    await createTestBug(testUser.id, { summary: 'Bug 3', status: 'RESOLVED', resolution: 'FIXED', product_id: 1 });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/bugs?status=CONFIRMED&product_id=1&page=1&limit=5',
      headers: { cookie: authCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.bugs.length).toBe(2);
    expect(body.total).toBe(2);
    expect(body.bugs.every((b: any) => b.status === 'CONFIRMED' && b.product_id === 1)).toBe(true);
  });
});
