import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { db, setPool } from '../../src/db/client.js';
import { buildApp } from '../../src/app.js';
import { hashPassword } from '../../src/lib/argon.js';
import { newDb } from 'pg-mem';

let testApp: FastifyInstance | null = null;

export async function setupTestEnvironment() {
  const memDb = newDb();

  // Register gen_random_uuid as impure function so it generates a fresh UUID every time
  memDb.public.registerFunction({
    name: 'gen_random_uuid',
    returns: memDb.public.getType('uuid' as any) || (undefined as any),
    impure: true,
    implementation: () => crypto.randomUUID(),
  });

  memDb.public.none(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      display_name VARCHAR(255) NOT NULL,
      username VARCHAR(64) NOT NULL UNIQUE,
      avatar_url TEXT,
      password_hash VARCHAR(255) NOT NULL,
      is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      token_hash VARCHAR(128) NOT NULL UNIQUE,
      ip_addr TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const pgAdapter = memDb.adapters.createPg();
  const memPool = new pgAdapter.Pool();

  setPool(memPool);
}

export async function getTestApp(): Promise<FastifyInstance> {
  if (!testApp) {
    process.env.NODE_ENV = 'test';
    testApp = await buildApp();
    await testApp.ready();
  }
  return testApp;
}

export async function resetDb() {
  try {
    await db.query('DELETE FROM sessions;');
    await db.query('DELETE FROM users;');
  } catch (err) {
    // Ignore if empty
  }
}

export async function createTestUser(overrides: {
  email?: string;
  password?: string;
  display_name?: string;
  username?: string;
  is_admin?: boolean;
} = {}) {
  const email = overrides.email || `user_${crypto.randomBytes(4).toString('hex')}@example.com`;
  const password = overrides.password || 'password123';
  const display_name = overrides.display_name || 'Test User';
  const username = overrides.username || email.split('@')[0];
  const is_admin = overrides.is_admin || false;
  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  const { rows } = await db.query(
    `INSERT INTO users (id, email, display_name, username, password_hash, is_admin)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, display_name, username, is_admin, is_enabled, created_at`,
    [userId, email, display_name, username, passwordHash, is_admin]
  );

  return { user: rows[0], password, rawToken: '' };
}

export async function getAuthCookieForUser(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return `session=${rawToken}`;
}
