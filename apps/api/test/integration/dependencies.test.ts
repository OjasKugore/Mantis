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

describe('Integration: Dependency Management & Graph Engine (T2.6 - T2.11)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('T2.6 — Self-link 101→101: HTTP 400 (self-link rejected)', async () => {
    const { user } = await createTestUser();
    const cookie = await getAuthCookieForUser(user.id);
    const bugA = await createTestBug(user.id, { summary: 'Bug A' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bugA.id}/dependencies`,
      headers: { cookie },
      payload: { blocked_bug_id: bugA.id },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'INVALID_DEPENDENCY' });
  });

  it('T2.7 — Valid dependency insertion 101→102: HTTP 201 and creates audit log', async () => {
    const { user } = await createTestUser();
    const cookie = await getAuthCookieForUser(user.id);
    const bugA = await createTestBug(user.id, { summary: 'Bug A' });
    const bugB = await createTestBug(user.id, { summary: 'Bug B' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bugA.id}/dependencies`,
      headers: { cookie },
      payload: { blocked_bug_id: bugB.id },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      blocking_bug_id: bugA.id,
      blocked_bug_id: bugB.id,
    });

    const act = await db.query(
      `SELECT * FROM bugs_activity WHERE bug_id = $1 AND field = 'blocks'`,
      [bugA.id]
    );
    expect(act.rows.length).toBeGreaterThan(0);
    expect(act.rows[0].new_value).toBe(String(bugB.id));
  });

  it('T2.8 — Direct cycle 101→102 then 102→101: HTTP 422 and DB rolled back', async () => {
    const { user } = await createTestUser();
    const cookie = await getAuthCookieForUser(user.id);
    const bugA = await createTestBug(user.id, { summary: 'Bug A' });
    const bugB = await createTestBug(user.id, { summary: 'Bug B' });

    // 101 blocks 102
    await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bugA.id}/dependencies`,
      headers: { cookie },
      payload: { blocked_bug_id: bugB.id },
    });

    // Attempt 102 blocks 101 (Direct Cycle)
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bugB.id}/dependencies`,
      headers: { cookie },
      payload: { blocked_bug_id: bugA.id },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: 'CYCLIC_DEPENDENCY_DETECTED' });

    const check = await db.query(
      `SELECT * FROM bug_dependencies WHERE blocking_bug_id = $1 AND blocked_bug_id = $2`,
      [bugB.id, bugA.id]
    );
    expect(check.rows).toHaveLength(0);
  });

  it('T2.9 — Multi-hop cycle 101→102→103 then 103→101: HTTP 422', async () => {
    const { user } = await createTestUser();
    const cookie = await getAuthCookieForUser(user.id);
    const bugA = await createTestBug(user.id, { summary: 'Bug A' });
    const bugB = await createTestBug(user.id, { summary: 'Bug B' });
    const bugC = await createTestBug(user.id, { summary: 'Bug C' });

    // 101 -> 102
    await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bugA.id}/dependencies`,
      headers: { cookie },
      payload: { blocked_bug_id: bugB.id },
    });

    // 102 -> 103
    await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bugB.id}/dependencies`,
      headers: { cookie },
      payload: { blocked_bug_id: bugC.id },
    });

    // 103 -> 101 (Multi-hop cycle)
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bugC.id}/dependencies`,
      headers: { cookie },
      payload: { blocked_bug_id: bugA.id },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: 'CYCLIC_DEPENDENCY_DETECTED' });
  });

  it('T2.10 — DELETE /dependencies removes edge and records audit activity', async () => {
    const { user } = await createTestUser();
    const cookie = await getAuthCookieForUser(user.id);
    const bugA = await createTestBug(user.id, { summary: 'Bug A' });
    const bugB = await createTestBug(user.id, { summary: 'Bug B' });

    // Create dependency
    await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bugA.id}/dependencies`,
      headers: { cookie },
      payload: { blocked_bug_id: bugB.id },
    });

    // Delete dependency
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/bugs/${bugA.id}/dependencies/${bugB.id}`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(204);

    const check = await db.query(
      `SELECT * FROM bug_dependencies WHERE blocking_bug_id = $1 AND blocked_bug_id = $2`,
      [bugA.id, bugB.id]
    );
    expect(check.rows).toHaveLength(0);
  });

  it('T2.11 — GET /bugs/:id/graph: returns nodes, edges, and non-empty criticalPathIds', async () => {
    const { user } = await createTestUser();
    const cookie = await getAuthCookieForUser(user.id);
    const bugA = await createTestBug(user.id, { summary: 'Bug A', estimated_time: 2 });
    const bugB = await createTestBug(user.id, { summary: 'Bug B', estimated_time: 4 });

    // A blocks B
    await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bugA.id}/dependencies`,
      headers: { cookie },
      payload: { blocked_bug_id: bugB.id },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${bugA.id}/graph`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const { nodes, edges, criticalPathIds } = res.json();
    expect(Array.isArray(nodes)).toBe(true);
    expect(Array.isArray(edges)).toBe(true);
    expect(Array.isArray(criticalPathIds)).toBe(true);
    expect(criticalPathIds).toContain(bugA.id);
    expect(criticalPathIds).toContain(bugB.id);
  });
});
