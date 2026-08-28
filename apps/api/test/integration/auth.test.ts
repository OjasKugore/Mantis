import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getTestApp, resetDb, setupTestEnvironment } from '../helpers/setup.js';
import { FastifyInstance } from 'fastify';

function extractSessionCookie(res: any): string {
  const setCookie = res.headers['set-cookie'];
  if (Array.isArray(setCookie)) {
    return setCookie[0].split(';')[0];
  }
  if (typeof setCookie === 'string') {
    return setCookie.split(';')[0];
  }
  return '';
}

describe('Integration: Authentication Routes (T1.5 - T1.9)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestEnvironment();
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it('T1.5 — POST /signup: 201 with body and HttpOnly Set-Cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: 'alice@example.com',
        password: 'password123',
        display_name: 'Alice',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({
      email: 'alice@example.com',
      display_name: 'Alice',
    });
    expect(body).toHaveProperty('id');
    expect(res.headers['set-cookie']).toBeDefined();
    const cookieStr = String(res.headers['set-cookie']);
    expect(cookieStr).toMatch(/session=[a-f0-9]+/i);
    expect(cookieStr).toMatch(/HttpOnly/i);
  });

  it('T1.6 — POST /signup: duplicate email returns 409 EMAIL_ALREADY_EXISTS', async () => {
    // Initial signup
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: 'alice@example.com',
        password: 'password123',
        display_name: 'Alice',
      },
    });

    // Duplicate signup attempt
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: 'alice@example.com',
        password: 'password456',
        display_name: 'Alice Two',
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'EMAIL_ALREADY_EXISTS' });
  });

  it('T1.7 — POST /login: valid creds return 200 with HttpOnly cookie', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: 'alice@example.com',
        password: 'password123',
        display_name: 'Alice',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'alice@example.com',
        password: 'password123',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      email: 'alice@example.com',
      display_name: 'Alice',
    });
    expect(res.headers['set-cookie']).toBeDefined();
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/i);
  });

  it('T1.8 — POST /login: wrong password returns 401 INVALID_CREDENTIALS', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: 'alice@example.com',
        password: 'password123',
        display_name: 'Alice',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'alice@example.com',
        password: 'wrongpassword',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: 'INVALID_CREDENTIALS' });
  });

  it('T1.9 — GET /me: valid session returns user; missing session returns 401', async () => {
    // Signup and login
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        email: 'alice@example.com',
        password: 'password123',
        display_name: 'Alice',
      },
    });

    const cookie = extractSessionCookie(signupRes);

    // Authenticated request with session cookie
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        cookie,
      },
    });

    expect(meRes.statusCode).toBe(200);
    expect(meRes.json()).toMatchObject({
      email: 'alice@example.com',
      display_name: 'Alice',
    });

    // Unauthenticated request without session cookie
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(unauthRes.statusCode).toBe(401);
    expect(unauthRes.json()).toMatchObject({ error: 'UNAUTHORIZED' });
  });
});
