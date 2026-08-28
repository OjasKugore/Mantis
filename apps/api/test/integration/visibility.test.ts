import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import {
  getTestApp,
  resetDb,
  setupTestEnvironment,
  createTestUser,
  getAuthCookieForUser,
  createTestBug,
  createTestGroup,
  addUserToGroup,
  restrictBugToGroup,
} from '../helpers/setup.js';

describe('Integration: Group Visibility & 404 Secrecy (T1.17 - T1.19)', () => {
  let app: FastifyInstance;
  let regularUser: any;
  let regularCookie: string;
  let secUser: any;
  let secCookie: string;
  let secGroup: any;
  let secBug: any;
  let publicBug: any;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();

    // 1. Regular user (not in security group)
    const u1 = await createTestUser({ email: 'regular@example.com', username: 'regular_user' });
    regularUser = u1.user;
    regularCookie = await getAuthCookieForUser(regularUser.id);

    // 2. Security user (member of security group)
    const u2 = await createTestUser({ email: 'sec@example.com', username: 'sec_user' });
    secUser = u2.user;
    secCookie = await getAuthCookieForUser(secUser.id);

    // 3. Security group
    secGroup = await createTestGroup('security-team');
    await addUserToGroup(secUser.id, secGroup.id);

    // 4. Public bug vs Security-restricted bug
    publicBug = await createTestBug(regularUser.id, { summary: 'Public general UI issue' });
    secBug = await createTestBug(secUser.id, { summary: 'Critical RCE vulnerability in auth' });
    await restrictBugToGroup(secBug.id, secGroup.id);
  });

  it('T1.17 — Non-member GET on group-restricted bug returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${secBug.id}`,
      headers: { cookie: regularCookie },
    });

    // Must return 404 NOT FOUND (never 403 Forbidden) to prevent enumeration of bug existence
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('T1.18 — Non-member bug list excludes restricted bug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/bugs',
      headers: { cookie: regularCookie },
    });

    expect(res.statusCode).toBe(200);
    const bugIds = res.json().bugs.map((b: any) => b.id);
    expect(bugIds).toContain(publicBug.id);
    expect(bugIds).not.toContain(secBug.id);
  });

  it('T1.19 — Security-team member can access restricted bug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${secBug.id}`,
      headers: { cookie: secCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(secBug.id);
    expect(body.summary).toBe('Critical RCE vulnerability in auth');
  });
});
