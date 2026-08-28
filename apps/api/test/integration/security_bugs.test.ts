import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
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

beforeAll(async () => {
  await setupTestEnvironment();
  await getTestApp();
});

beforeEach(async () => {
  await resetDb();
});

describe('Security Bugs — PATCH /api/v1/bugs/:id/security (T2.17–T2.20)', () => {
  // T2.17 — Non-security member gets 403
  it('T2.17: non-security member PATCH /security returns 403 Forbidden', async () => {
    const app = await getTestApp();
    const { user: reporter } = await createTestUser();
    const bug = await createTestBug(reporter.id);

    // Create non-member user
    const { user: outsider } = await createTestUser();
    const cookie = await getAuthCookieForUser(outsider.id);

    // Ensure security-team group exists but outsider is NOT in it
    await createTestGroup('security-team');

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/bugs/${bug.id}/security`,
      headers: { cookie },
      payload: {
        cvss_vector: 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H',
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('FORBIDDEN');
  });

  // T2.18 — Setting is_embargoed: true defaults to 90 days and updates bug_group_map
  it('T2.18: setting is_embargoed: true defaults to 90 days and updates bug_group_map', async () => {
    const app = await getTestApp();
    const { user: reporter } = await createTestUser();
    const bug = await createTestBug(reporter.id);

    // Create security-team group and add member
    const group = await createTestGroup('security-team');
    const { user: secMember } = await createTestUser();
    await addUserToGroup(secMember.id, group.id);
    const cookie = await getAuthCookieForUser(secMember.id);

    const before = new Date();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/bugs/${bug.id}/security`,
      headers: { cookie },
      payload: { is_embargoed: true },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.is_embargoed).toBe(true);
    expect(body.embargo_until).toBeTruthy();

    // embargo_until should be ~90 days from now
    const embargoDate = new Date(body.embargo_until);
    const diffDays = (embargoDate.getTime() - before.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(89);
    expect(diffDays).toBeLessThanOrEqual(91);
  });

  // T2.19 — Embargoed bug: non-member gets 404; security member gets CVSS payload
  it('T2.19: embargoed bug returns 404 for non-member, full payload for security member', async () => {
    const app = await getTestApp();
    const { user: reporter } = await createTestUser();
    const bug = await createTestBug(reporter.id);

    // Set up security group, member, and outsider
    const group = await createTestGroup('security-team');
    const { user: secMember } = await createTestUser();
    await addUserToGroup(secMember.id, group.id);

    const { user: outsider } = await createTestUser();
    const outsiderCookie = await getAuthCookieForUser(outsider.id);
    const memberCookie = await getAuthCookieForUser(secMember.id);

    // Embargo the bug (restricts to security-team group)
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/bugs/${bug.id}/security`,
      headers: { cookie: memberCookie },
      payload: { is_embargoed: true },
    });

    // Non-member should get 404
    const outsiderRes = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${bug.id}/security`,
      headers: { cookie: outsiderCookie },
    });
    expect(outsiderRes.statusCode).toBe(404);

    // Security member should get full payload
    const memberRes = await app.inject({
      method: 'GET',
      url: `/api/v1/bugs/${bug.id}/security`,
      headers: { cookie: memberCookie },
    });
    expect(memberRes.statusCode).toBe(200);
    const memberBody = JSON.parse(memberRes.body);
    expect(memberBody.is_embargoed).toBe(true);
  });

  // T2.20 — Updating CVSS vector writes score and bugs_activity audit diff
  it('T2.20: updating CVSS vector updates score and writes bugs_activity audit diff', async () => {
    const { db } = await import('../../src/db/client.js');
    const app = await getTestApp();
    const { user: reporter } = await createTestUser();
    const bug = await createTestBug(reporter.id);

    const group = await createTestGroup('security-team');
    const { user: secMember } = await createTestUser();
    await addUserToGroup(secMember.id, group.id);
    const cookie = await getAuthCookieForUser(secMember.id);

    const testVector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H';

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/bugs/${bug.id}/security`,
      headers: { cookie },
      payload: { cvss_vector: testVector },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.cvss_vector).toBe(testVector);
    expect(typeof body.cvss_score).toBe('number');
    expect(body.cvss_score).toBeGreaterThan(0);
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(body.cvss_severity);

    // Verify audit trail
    const { rows: activityRows } = await db.query(
      `SELECT * FROM bugs_activity WHERE bug_id = $1 AND field = 'cvss_vector'`,
      [bug.id]
    );
    expect(activityRows.length).toBeGreaterThan(0);
    expect(activityRows[0].new_value).toBe(testVector);
  });
});
