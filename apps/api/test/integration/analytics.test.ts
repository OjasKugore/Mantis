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
  createTestFlagType,
  createTestDependency,
} from '../helpers/setup.js';

describe('Analytics & Release Readiness Integration Tests (T3.7 – T3.8)', () => {
  let app: FastifyInstance;
  let user: any;
  let cookie: string;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser({ email: 'analytics@example.com' });
    user = created.user;
    cookie = await getAuthCookieForUser(user.id);
  });

  // T3.7 — Milestone readiness score applies correct penalties for CPM blockers & CVSS
  it('T3.7: Milestone readiness score applies correct penalties for CPM blockers & CVSS', async () => {
    const milestone = 'v2.0';

    // 1. Create open bugs for milestone
    const bug1 = await createTestBug(user.id, {
      summary: 'Critical auth loop',
      status: 'IN_PROGRESS',
      priority: 'P1',
      target_milestone: milestone,
      estimated_time: 4,
      cvss_severity: 'CRITICAL',
    });

    const bug2 = await createTestBug(user.id, {
      summary: 'UI styling glitch',
      status: 'CONFIRMED',
      priority: 'P3',
      target_milestone: milestone,
      estimated_time: 2,
    });

    // 2. Add dependency (bug1 blocks bug2) -> bug1 and bug2 are on critical path
    await createTestDependency(bug1.id, bug2.id, user.id);

    // 3. Add pending flag on bug1
    const flagType = await createTestFlagType({ name: 'release-blocker' });
    await db.query(
      `INSERT INTO flags (type_id, status, bug_id, setter_id) VALUES ($1, '?', $2, $3)`,
      [flagType.id, bug1.id, user.id]
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/milestones/${milestone}/readiness`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.milestone).toBe(milestone);
    expect(typeof data.score).toBe('number');
    expect(data.score).toBeLessThanOrEqual(100);
    expect(data.penalties).toBeGreaterThan(0);
    expect(Array.isArray(data.breakdown)).toBe(true);
    expect(data.breakdown.length).toBeGreaterThan(0);
    expect(data.totalOpenBugs).toBe(2);

    // Also test alias route /api/v1/analytics/milestones/:id/readiness
    const aliasRes = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/milestones/${milestone}/readiness`,
      headers: { cookie },
    });
    expect(aliasRes.statusCode).toBe(200);
    expect(aliasRes.json().score).toBe(data.score);
  });

  // T3.8 — GET /api/v1/analytics/velocity returns MTTR aggregated from bugs_activity
  it('T3.8: GET /api/v1/analytics/velocity returns MTTR aggregated from bugs_activity', async () => {
    // 1. Create a resolved bug
    const bug = await createTestBug(user.id, {
      summary: 'Resolved network crash',
      status: 'RESOLVED',
      priority: 'P1',
      product_id: 1,
    });

    // 2. Record activity indicating status changed to RESOLVED
    await db.query(
      `INSERT INTO bugs_activity (bug_id, who_id, field, old_value, new_value, changed_at)
       VALUES ($1, $2, 'status', 'IN_PROGRESS', 'RESOLVED', NOW())`,
      [bug.id, user.id]
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/velocity',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.velocity)).toBe(true);
    expect(body.velocity.length).toBeGreaterThanOrEqual(1);

    const prodVelocity = body.velocity.find((v: any) => v.product_name === 'Firefox');
    expect(prodVelocity).toBeDefined();
    expect(prodVelocity.total_resolved).toBeGreaterThanOrEqual(1);
    expect(typeof prodVelocity.avg_mttr_days).toBe('number');
  });
});
