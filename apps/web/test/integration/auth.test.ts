import { describe, it, expect } from 'vitest';
import { POST as quickLoginPost } from '@/app/api/v1/auth/quick-login/route';
import { POST as loginPost } from '@/app/api/v1/auth/login/route';

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
});
