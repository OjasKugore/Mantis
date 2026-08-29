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
import { buildTriagePrompt, callLLMTriage } from '../../src/services/aiTriage.js';
import { Bug, BugComment } from '@bugzilla/shared';

describe('AI Triage Assistant Integration Tests (T3.9 – T3.13)', () => {
  let app: FastifyInstance;
  let user: any;
  let cookie: string;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser({ email: 'aitriage@example.com' });
    user = created.user;
    cookie = await getAuthCookieForUser(user.id);
  });

  // T3.9 — buildTriagePrompt includes bug summary, description, and comments
  it('T3.9: buildTriagePrompt includes bug summary, description, and comments', () => {
    const bug: Bug = {
      id: 101,
      summary: 'Buffer overflow in HTTP parser',
      description: 'Memory corruption when parsing chunked headers',
      status: 'CONFIRMED',
      resolution: '',
      priority: 'P1',
      severity: 'critical',
      product_id: 1,
      component_id: 1,
      version: '1.0',
      target_milestone: 'v1.0',
      reporter_id: 'user-1',
      estimated_time: 2,
      remaining_time: 2,
      is_embargoed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const comments: BugComment[] = [
      {
        id: 1,
        bug_id: 101,
        author_id: 'user-1',
        author_username: 'alice',
        body: 'Reproduced on Linux x86_64',
        format: 'plain',
        is_private: false,
        created_at: new Date().toISOString(),
      },
    ];

    const prompt = buildTriagePrompt(bug, comments);

    expect(prompt).toContain('Bug #101');
    expect(prompt).toContain('Buffer overflow in HTTP parser');
    expect(prompt).toContain('Memory corruption when parsing chunked headers');
    expect(prompt).toContain('Reproduced on Linux x86_64');
  });

  // T3.10 — callLLMTriage handles empty API key safely
  it('T3.10: callLLMTriage handles empty API key safely by returning null', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const bug: Bug = {
      id: 102,
      summary: 'Crash on launch',
      description: 'App crashes immediately',
      status: 'CONFIRMED',
      resolution: '',
      priority: 'P2',
      severity: 'major',
      product_id: 1,
      component_id: 1,
      version: '1.0',
      target_milestone: 'v1.0',
      reporter_id: 'user-1',
      estimated_time: 1,
      remaining_time: 1,
      is_embargoed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await callLLMTriage(bug, []);
    expect(result).toBeNull();

    if (origKey) process.env.GEMINI_API_KEY = origKey;
  });

  // T3.11 — AbortController timeout handling
  it('T3.11: callLLMTriage returns null on network failure / abort signal', async () => {
    process.env.GEMINI_API_KEY = 'invalid-fake-key-for-test';

    const bug: Bug = {
      id: 103,
      summary: 'Network timeout test',
      description: 'Testing abort controller',
      status: 'CONFIRMED',
      resolution: '',
      priority: 'P3',
      severity: 'normal',
      product_id: 1,
      component_id: 1,
      version: '1.0',
      target_milestone: 'v1.0',
      reporter_id: 'user-1',
      estimated_time: 1,
      remaining_time: 1,
      is_embargoed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await callLLMTriage(bug, []);
    expect(result).toBeNull();
  });

  // T3.12 — Missing GEMINI_API_KEY returns fallback: true cleanly
  it('T3.12: POST /api/v1/bugs/:id/ai-triage returns HTTP 200 with fallback: true when key is missing', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const bug = await createTestBug(user.id, { summary: 'Memory leak in worker pool' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${bug.id}/ai-triage`,
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.fallback).toBe(true);
    expect(json.error).toBe('AI_SERVICE_UNAVAILABLE');

    if (origKey) process.env.GEMINI_API_KEY = origKey;
  });

  // T3.13 — Group secrecy: 404 returned for unauthorized user on restricted bug
  it('T3.13: Group secrecy: POST /api/v1/bugs/:id/ai-triage returns 404 for non-group member', async () => {
    const secGroup = await createTestGroup('security-team');
    const restrictedBug = await createTestBug(user.id, { summary: 'Zero-day vulnerability' });

    // Restrict bug to security group
    await db.query(`INSERT INTO bug_group_map (bug_id, group_id) VALUES ($1, $2)`, [
      restrictedBug.id,
      secGroup.id,
    ]);

    // Create a regular user who is NOT in security group
    const otherUser = await createTestUser({ email: 'other@example.com' });
    const otherCookie = await getAuthCookieForUser(otherUser.user.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bugs/${restrictedBug.id}/ai-triage`,
      headers: { cookie: otherCookie },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('NOT_FOUND');
  });
});
