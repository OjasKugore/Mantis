import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import {
  getTestApp,
  resetDb,
  setupTestEnvironment,
  createTestUser,
  getAuthCookieForUser,
  createTestBug,
  createTestFlagType,
} from '../helpers/setup.js';
import { db } from '../../src/db/client.js';

describe('Integration: Three-State Flags (T1.20 - T1.21)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('T1.20 — POST /flags: creates review? targeting requestee', async () => {
    const { user: alice } = await createTestUser({ email: 'alice@example.com', display_name: 'Alice' });
    const { user: bob } = await createTestUser({ email: 'bob@example.com', display_name: 'Bob' });
    const cookie = await getAuthCookieForUser(alice.id);

    const bug = await createTestBug(alice.id, { summary: 'Bug needing review' });
    const flagType = await createTestFlagType({ name: 'review', target_type: 'b' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bug.id}/flags`,
      headers: { cookie },
      payload: {
        type_id: flagType.id,
        status: '?',
        requestee_id: bob.id,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({
      status: '?',
      requestee_id: bob.id,
      type_id: flagType.id,
      bug_id: bug.id,
    });
  });

  it('T1.21 — PATCH /flags/:id: ? → + does not mutate bugs.status', async () => {
    const { user: alice } = await createTestUser({ email: 'alice@example.com', display_name: 'Alice' });
    const { user: bob } = await createTestUser({ email: 'bob@example.com', display_name: 'Bob' });
    const aliceCookie = await getAuthCookieForUser(alice.id);
    const bobCookie = await getAuthCookieForUser(bob.id);

    // Bug in CONFIRMED status
    const bug = await createTestBug(alice.id, { summary: 'Confirmed bug', status: 'CONFIRMED' });
    const flagType = await createTestFlagType({ name: 'review', target_type: 'b' });

    // Request review
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bug.id}/flags`,
      headers: { cookie: aliceCookie },
      payload: {
        type_id: flagType.id,
        status: '?',
        requestee_id: bob.id,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const flagId = createRes.json().id;

    // Bob grants review (+)
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/flags/${flagId}`,
      headers: { cookie: bobCookie },
      payload: {
        status: '+',
      },
    });

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().status).toBe('+');

    // Verify bugs.status is STILL 'CONFIRMED' and not modified
    const bugRow = await db.query(`SELECT status FROM bugs WHERE id = $1`, [bug.id]);
    expect(bugRow.rows[0].status).toBe('CONFIRMED');
  });
});
