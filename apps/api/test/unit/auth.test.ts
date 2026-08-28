import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from '../../src/lib/argon.js';

describe('Unit: Authentication & Password Hashing (T1.1 - T1.4)', () => {
  it('T1.1 — Argon2id hash is not plaintext and starts with $argon2id', async () => {
    const plain = 'hunter2';
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(hash.startsWith('$argon2id')).toBe(true);
  });

  it('T1.2 — Correct password verifies as true', async () => {
    const plain = 'hunter2';
    const hash = await hashPassword(plain);
    const isValid = await verifyPassword(hash, plain);
    expect(isValid).toBe(true);
  });

  it('T1.3 — Wrong password verifies as false', async () => {
    const plain = 'hunter2';
    const hash = await hashPassword(plain);
    const isValid = await verifyPassword(hash, 'wrongpass');
    expect(isValid).toBe(false);
  });

  it('T1.4 — SHA-256 session token hash is 64 hex chars and differs from raw token', () => {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(token);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });
});
