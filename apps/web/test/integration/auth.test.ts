import { describe, it, expect } from 'vitest';
import { POST as quickLoginPost } from '@/app/api/v1/auth/quick-login/route';
import { POST as loginPost } from '@/app/api/v1/auth/login/route';
import { POST as signupPost } from '@/app/api/v1/auth/signup/route';

describe('Auth Route Handlers Integration', () => {
  it('should support 1-Click Fast Persona quick-login for alice_dev', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/quick-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: 'alice_dev' }),
    });

    const res = await quickLoginPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('alice@mozilla.com');
    expect(data.user.username).toBe('alice_dev');
    expect(data.token).toBeDefined();
  });

  it('should support 1-Click Fast Persona quick-login for carol (short key)', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/quick-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: 'carol' }),
    });

    const res = await quickLoginPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user.email).toBe('carol@mozilla.com');
  });

  it('should support 1-Click Fast Persona quick-login for admin (short key)', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/quick-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: 'admin' }),
    });

    const res = await quickLoginPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user.email).toBe('admin@mantis.local');
  });

  it('should authenticate user with valid email and password', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mantis.local', password: 'password123' }),
    });

    const res = await loginPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user.is_admin).toBe(true);
  });

  it('should reject invalid password', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mantis.local', password: 'wrongpassword' }),
    });

    const res = await loginPost(req);
    expect(res.status).toBe(401);
  });

  it('should register a new account with email and password', async () => {
    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    const req = new Request('http://localhost:3000/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'securePassword123',
        display_name: 'Test Engineer',
        username: `tester_${Date.now()}`,
      }),
    });

    const res = await signupPost(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(uniqueEmail);
    expect(data.user.display_name).toBe('Test Engineer');
    expect(data.token).toBeDefined();
  });

  it('should reject duplicate signup for existing email', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@mozilla.com',
        password: 'anotherPassword123',
        display_name: 'Duplicate Alice',
      }),
    });

    const res = await signupPost(req);
    expect(res.status).toBe(409);

    const data = await res.json();
    expect(data.error).toBe('EMAIL_ALREADY_EXISTS');
  });
});
