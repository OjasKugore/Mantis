import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import {
  getTestApp,
  resetDb,
  setupTestEnvironment,
  createTestUser,
  getAuthCookieForUser,
  createTestBug,
  createTestDependency,
} from '../helpers/setup.js';

describe('Integration: Graph View API (T2.21 - T2.24)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('T2.21 — Graph API payload returns full node metadata required by React Flow', async () => {
    const { user } = await createTestUser();
    const cookie = await getAuthCookieForUser(user.id);
    const bugA = await createTestBug(user.id, { summary: 'Root Bug A' });
    const bugB = await createTestBug(user.id, { summary: 'Blocked Bug B' });
    await createTestDependency(bugA.id, bugB.id, user.id);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${bugA.id}/graph`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const { nodes } = res.json();
    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes.length).toBeGreaterThan(0);

    // Every node must have fields required by React Flow DependencyGraph component
    for (const n of nodes) {
      expect(n).toHaveProperty('id');
      expect(n).toHaveProperty('summary');
      expect(n).toHaveProperty('status');
      expect(n).toHaveProperty('priority');
      expect(n).toHaveProperty('estimated_time');
    }
  });

  it('T2.22 — Subgraph pruning: isolated bugs do not appear in disconnected bug graph payload', async () => {
    const { user } = await createTestUser();
    const cookie = await getAuthCookieForUser(user.id);
    const bugA = await createTestBug(user.id, { summary: 'Connected Bug A' });
    const bugB = await createTestBug(user.id, { summary: 'Connected Bug B' });
    const isolatedBug = await createTestBug(user.id, { summary: 'Completely isolated bug — no edges' });

    await createTestDependency(bugA.id, bugB.id, user.id);
    // isolatedBug has NO dependencies — should not appear in bugA's graph

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${bugA.id}/graph`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const { nodes } = res.json();
    const nodeIds = nodes.map((n: any) => Number(n.id));
    expect(nodeIds).toContain(bugA.id);
    expect(nodeIds).toContain(bugB.id);
    expect(nodeIds).not.toContain(isolatedBug.id);
  });

  it('T2.23 — GET /bugs/:id/graph on a bug with no deps returns just that single node', async () => {
    const { user } = await createTestUser();
    const cookie = await getAuthCookieForUser(user.id);
    const lonelyBug = await createTestBug(user.id, { summary: 'Solo bug with no connections' });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${lonelyBug.id}/graph`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const { nodes, edges, criticalPathIds } = res.json();
    expect(nodes).toHaveLength(1);
    expect(Number(nodes[0].id)).toBe(lonelyBug.id);
    expect(edges).toHaveLength(0);
    expect(criticalPathIds).toHaveLength(1);
    expect(criticalPathIds[0]).toBe(lonelyBug.id);
  });

  it('T2.24 — End-to-end dependency addition and graph retrieval round-trip', async () => {
    const { user } = await createTestUser();
    const cookie = await getAuthCookieForUser(user.id);
    const bugA = await createTestBug(user.id, { summary: 'Bug A — blocks B' });
    const bugB = await createTestBug(user.id, { summary: 'Bug B — blocked by A' });

    // Add dependency via API
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bugA.id}/dependencies`,
      headers: { cookie },
      payload: { blocked_bug_id: bugB.id },
    });
    expect(addRes.statusCode).toBe(201);

    // Fetch graph and verify edge appears
    const graphRes = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${bugA.id}/graph`,
      headers: { cookie },
    });

    expect(graphRes.statusCode).toBe(200);
    const { edges, criticalPathIds } = graphRes.json();
    expect(edges).toContainEqual(
      expect.objectContaining({ blockingId: bugA.id, blockedId: bugB.id })
    );
    expect(Array.isArray(criticalPathIds)).toBe(true);
    expect(criticalPathIds.length).toBeGreaterThan(0);
  });
});
