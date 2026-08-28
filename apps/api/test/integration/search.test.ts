import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import {
  setupTestEnvironment,
  getTestApp,
  resetDb,
  createTestUser,
  getAuthCookieForUser,
  createTestBug,
  createTestGroup,
  addUserToGroup,
  restrictBugToGroup,
} from '../helpers/setup.js';

describe('Search & Duplicate Detection Integration Tests (T3.1 – T3.6)', () => {
  let app: FastifyInstance;
  let user: any;
  let cookie: string;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser({ email: 'searcher@example.com' });
    user = created.user;
    cookie = await getAuthCookieForUser(user.id);
  });

  // T3.1 — Stemming: 'parse' query matches bug with 'parsing' in summary
  it('T3.1: Stemming — parse query matches bug with parsing in summary', async () => {
    await createTestBug(user.id, { summary: 'NullPointerException when parsing HTTP headers' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/bugs/search?q=parse',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.bugs.length).toBeGreaterThanOrEqual(1);
    expect(body.bugs.some((b: any) => b.summary.includes('parsing'))).toBe(true);
  });

  // T3.2 — Unrelated query returns empty bugs array
  it('T3.2: Unrelated query returns empty bugs array', async () => {
    await createTestBug(user.id, { summary: 'Memory leak in renderer loop' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/bugs/search?q=zzzzunrelatedquery',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.bugs).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  // T3.3 — Results ranked: more-relevant bug appears first
  it('T3.3: Results ranked — more-relevant bug appears first', async () => {
    const bug1 = await createTestBug(user.id, { summary: 'crash crash crash in renderer process' });
    const bug2 = await createTestBug(user.id, { summary: 'minor crash in storage module' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/bugs/search?q=crash+renderer',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.bugs.length).toBeGreaterThanOrEqual(2);
    expect(body.bugs[0].summary).toContain('renderer');
    expect(body.bugs[0].id).toBe(bug1.id);
  });

  // T3.4 — Group-restricted bug never appears in search for non-member
  it('T3.4: Group-restricted bug never appears in search for non-member', async () => {
    const regularUser = (await createTestUser({ email: 'regular@example.com' })).user;
    const regularCookie = await getAuthCookieForUser(regularUser.id);

    const secGroup = await createTestGroup('security-team');
    const restrictedBug = await createTestBug(user.id, {
      summary: 'critical security auth bypass vulnerability',
      is_embargoed: true,
    });
    await restrictBugToGroup(restrictedBug.id, secGroup.id);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/bugs/search?q=security+bypass',
      headers: { cookie: regularCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.bugs.every((b: any) => b.id !== restrictedBug.id)).toBe(true);

    // Verify security group member DOES see it
    const secUser = (await createTestUser({ email: 'sec@example.com' })).user;
    await addUserToGroup(secUser.id, secGroup.id);
    const secCookie = await getAuthCookieForUser(secUser.id);

    const secRes = await app.inject({
      method: 'GET',
      url: '/api/v1/bugs/search?q=security+bypass',
      headers: { cookie: secCookie },
    });

    expect(secRes.statusCode).toBe(200);
    expect(secRes.json().bugs.some((b: any) => b.id === restrictedBug.id)).toBe(true);
  });

  // T3.5 — Response includes ts_headline with mark tags
  it('T3.5: Response includes ts_headline with mark tags', async () => {
    await createTestBug(user.id, { summary: 'parsing error in HTTP module' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/bugs/search?q=parsing',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.bugs.length).toBeGreaterThanOrEqual(1);
    expect(body.bugs[0].headline).toContain('<mark>');
  });

  // T3.6 — GET /api/v1/bugs/duplicates returns similarity matches > 0.28
  it('T3.6: GET /api/v1/bugs/duplicates returns similarity matches > 0.28', async () => {
    await createTestBug(user.id, { summary: 'Crash in networking auth module' });
    await createTestBug(user.id, { summary: 'Unrelated database timeout' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/bugs/duplicates?summary=Crash in networking auth module',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.duplicates)).toBe(true);
    expect(body.duplicates.length).toBeGreaterThanOrEqual(1);
    expect(body.duplicates[0].score).toBeGreaterThan(0.28);
    expect(body.duplicates[0].summary).toContain('Crash in networking auth');
  });
});
