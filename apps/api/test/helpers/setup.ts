import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { db, setPool } from '../../src/db/client.js';
import { buildApp } from '../../src/app.js';
import { hashPassword } from '../../src/lib/argon.js';
import { newDb } from 'pg-mem';

let testApp: FastifyInstance | null = null;

export async function setupTestEnvironment() {
  const memDb = newDb();

  // Register gen_random_uuid
  memDb.public.registerFunction({
    name: 'gen_random_uuid',
    returns: memDb.public.getType('uuid' as any) || (undefined as any),
    impure: true,
    implementation: () => crypto.randomUUID(),
  });

  // Register similarity function mock for pg_trgm
  memDb.public.registerFunction({
    name: 'similarity',
    args: [memDb.public.getType('text' as any), memDb.public.getType('text' as any)],
    returns: memDb.public.getType('float' as any) || (undefined as any),
    implementation: (a: string, b: string) => {
      if (!a || !b) return 0;
      if (a.toLowerCase() === b.toLowerCase()) return 1.0;
      if (a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase())) return 0.6;
      return 0;
    },
  });

  memDb.public.none(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      display_name VARCHAR(255) NOT NULL,
      username VARCHAR(64) NOT NULL UNIQUE,
      avatar_url TEXT,
      password_hash VARCHAR(255),
      github_id VARCHAR(255) UNIQUE,
      google_id VARCHAR(255) UNIQUE,
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

    CREATE TABLE IF NOT EXISTS groups (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      is_buggroup BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_group_map (
      user_id UUID NOT NULL,
      group_id UUID NOT NULL,
      can_bless BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (user_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS classifications (
      id INTEGER PRIMARY KEY,
      name VARCHAR(64) NOT NULL UNIQUE,
      sortkey SMALLINT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name VARCHAR(64) NOT NULL UNIQUE,
      classification_id INTEGER,
      description TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      default_milestone VARCHAR(64) NOT NULL DEFAULT '---'
    );

    CREATE TABLE IF NOT EXISTS components (
      id INTEGER PRIMARY KEY,
      name VARCHAR(64) NOT NULL,
      product_id INTEGER NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      default_owner_id UUID,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS bugs (
      id SERIAL PRIMARY KEY,
      summary VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status VARCHAR(32) NOT NULL DEFAULT 'UNCONFIRMED',
      resolution VARCHAR(32) NOT NULL DEFAULT '',
      priority VARCHAR(8) NOT NULL DEFAULT 'P3',
      severity VARCHAR(32) NOT NULL DEFAULT 'normal',
      product_id INTEGER NOT NULL,
      component_id INTEGER NOT NULL,
      version VARCHAR(64) NOT NULL DEFAULT 'unspecified',
      target_milestone VARCHAR(64) NOT NULL DEFAULT '---',
      reporter_id UUID NOT NULL,
      assignee_id UUID,
      qa_contact_id UUID,
      duplicate_of INTEGER,
      estimated_time DECIMAL NOT NULL DEFAULT 0,
      remaining_time DECIMAL NOT NULL DEFAULT 0,
      deadline TIMESTAMPTZ,
      is_embargoed BOOLEAN NOT NULL DEFAULT FALSE,
      embargo_until TIMESTAMPTZ,
      cvss_vector VARCHAR(128),
      cvss_score DECIMAL,
      cvss_severity VARCHAR(16),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bugs_activity (
      id SERIAL PRIMARY KEY,
      bug_id INTEGER NOT NULL,
      who_id UUID NOT NULL,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      field VARCHAR(64) NOT NULL,
      old_value TEXT,
      new_value TEXT,
      comment TEXT
    );

    CREATE TABLE IF NOT EXISTS bug_group_map (
      bug_id INTEGER NOT NULL,
      group_id UUID NOT NULL,
      PRIMARY KEY (bug_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS flag_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      target_type CHAR(1) NOT NULL DEFAULT 'b',
      is_requestable BOOLEAN NOT NULL DEFAULT TRUE,
      is_requesteeble BOOLEAN NOT NULL DEFAULT TRUE,
      grant_group_id UUID
    );

    CREATE TABLE IF NOT EXISTS flags (
      id SERIAL PRIMARY KEY,
      type_id INTEGER NOT NULL,
      status CHAR(1) NOT NULL,
      bug_id INTEGER NOT NULL,
      attach_id INTEGER,
      setter_id UUID NOT NULL,
      requestee_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bug_comments (
      id SERIAL PRIMARY KEY,
      bug_id INTEGER NOT NULL,
      author_id UUID NOT NULL,
      body TEXT NOT NULL,
      format VARCHAR(16) NOT NULL DEFAULT 'markdown',
      is_private BOOLEAN NOT NULL DEFAULT FALSE,
      parent_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comment_mentions (
      id SERIAL PRIMARY KEY,
      comment_id INTEGER NOT NULL,
      mentioned_user_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      type VARCHAR(32) NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bug_dependencies (
      blocking_bug_id INTEGER NOT NULL,
      blocked_bug_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by UUID,
      PRIMARY KEY (blocking_bug_id, blocked_bug_id)
    );

    CREATE TABLE IF NOT EXISTS bug_commits (
      id SERIAL PRIMARY KEY,
      bug_id INTEGER NOT NULL,
      repo_full_name VARCHAR(256) NOT NULL,
      commit_sha VARCHAR(40) NOT NULL,
      commit_message TEXT NOT NULL,
      author_name VARCHAR(256),
      author_email VARCHAR(256),
      committed_at TIMESTAMPTZ,
      html_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (bug_id, commit_sha)
    );

    CREATE TABLE IF NOT EXISTS bug_pull_requests (
      id SERIAL PRIMARY KEY,
      bug_id INTEGER NOT NULL,
      repo_full_name VARCHAR(256) NOT NULL,
      pr_number INTEGER NOT NULL,
      pr_title TEXT NOT NULL,
      pr_state VARCHAR(16) NOT NULL,
      pr_url TEXT NOT NULL,
      merged_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (bug_id, repo_full_name, pr_number)
    );
  `);

  const pgAdapter = memDb.adapters.createPg();
  const memPool = new pgAdapter.Pool();

  setPool(memPool);
}

export async function getTestApp(): Promise<FastifyInstance> {
  if (!testApp) {
    (process.env as any).NODE_ENV = 'test';
    testApp = await buildApp();
    await testApp.ready();
  }
  return testApp;
}

export async function resetDb() {
  try {
    await db.query('DELETE FROM bug_dependencies;');
    await db.query('DELETE FROM notifications;');
    await db.query('DELETE FROM comment_mentions;');
    await db.query('DELETE FROM bug_comments;');
    await db.query('DELETE FROM flags;');
    await db.query('DELETE FROM flag_types;');
    await db.query('DELETE FROM bug_group_map;');
    await db.query('DELETE FROM bugs_activity;');
    await db.query('DELETE FROM bugs;');
    await db.query('DELETE FROM user_group_map;');
    await db.query('DELETE FROM groups;');
    await db.query('DELETE FROM components;');
    await db.query('DELETE FROM products;');
    await db.query('DELETE FROM classifications;');
    await db.query('DELETE FROM sessions;');
    await db.query('DELETE FROM users;');

    // Seed base product and component for testing
    await db.query(`INSERT INTO classifications (id, name) VALUES (1, 'Mozilla') ON CONFLICT DO NOTHING;`);
    await db.query(`INSERT INTO products (id, name, classification_id, is_active) VALUES (1, 'Firefox', 1, TRUE) ON CONFLICT DO NOTHING;`);
    await db.query(`INSERT INTO components (id, name, product_id, is_active) VALUES (1, 'Networking', 1, TRUE) ON CONFLICT DO NOTHING;`);
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
  const username = overrides.username || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
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

export async function createTestGroup(name: string = 'security-team') {
  const groupId = crypto.randomUUID();
  const { rows } = await db.query(
    `INSERT INTO groups (id, name, description)
     VALUES ($1, $2, 'Security Team Group')
     RETURNING id, name`,
    [groupId, name]
  );
  return rows[0];
}

export async function addUserToGroup(userId: string, groupId: string) {
  await db.query(
    `INSERT INTO user_group_map (user_id, group_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, groupId]
  );
}

export async function restrictBugToGroup(bugId: number, groupId: string) {
  await db.query(
    `INSERT INTO bug_group_map (bug_id, group_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [bugId, groupId]
  );
}

export async function createTestBug(
  reporterId: string,
  overrides: {
    summary?: string;
    description?: string;
    product_id?: number;
    component_id?: number;
    status?: string;
    resolution?: string;
    priority?: string;
    severity?: string;
    version?: string;
    target_milestone?: string;
    estimated_time?: number;
    remaining_time?: number;
    is_embargoed?: boolean;
    cvss_score?: number;
    cvss_severity?: string;
  } = {}
) {
  const summary = overrides.summary || 'Test bug summary';
  const description = overrides.description || 'Test bug description';
  const product_id = overrides.product_id || 1;
  const component_id = overrides.component_id || 1;
  const status = overrides.status || 'UNCONFIRMED';
  const resolution = overrides.resolution || '';
  const priority = overrides.priority || 'P3';
  const severity = overrides.severity || 'normal';
  const version = overrides.version || 'unspecified';
  const target_milestone = overrides.target_milestone || '---';
  const estimated_time = overrides.estimated_time || 0;
  const remaining_time = overrides.remaining_time || 0;
  const is_embargoed = overrides.is_embargoed || false;
  const cvss_score = overrides.cvss_score || null;
  const cvss_severity = overrides.cvss_severity || null;

  const { rows } = await db.query(
    `INSERT INTO bugs (
      summary, description, status, resolution, priority, severity,
      version, target_milestone, estimated_time, remaining_time,
      product_id, component_id, reporter_id, is_embargoed, cvss_score, cvss_severity
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      summary,
      description,
      status,
      resolution,
      priority,
      severity,
      version,
      target_milestone,
      estimated_time,
      remaining_time,
      product_id,
      component_id,
      reporterId,
      is_embargoed,
      cvss_score,
      cvss_severity,
    ]
  );

  const bug = rows[0];
  bug.id = Number(bug.id);
  bug.product_id = Number(bug.product_id);
  bug.component_id = Number(bug.component_id);

  await db.query(
    `INSERT INTO bugs_activity (bug_id, who_id, field, old_value, new_value, comment)
     VALUES ($1, $2, 'status', NULL, $3, 'Bug created')`,
    [bug.id, reporterId, status]
  );

  return bug;
}

export async function createTestFlagType(overrides: {
  name?: string;
  target_type?: 'b' | 'a';
  grant_group_id?: string | null;
} = {}) {
  const name = overrides.name || `review_${crypto.randomBytes(3).toString('hex')}`;
  const target_type = overrides.target_type || 'b';
  const grant_group_id = overrides.grant_group_id ?? null;

  const { rows } = await db.query(
    `INSERT INTO flag_types (name, description, target_type, grant_group_id)
     VALUES ($1, 'Test Flag Type Description', $2, $3)
     RETURNING id, name, target_type, grant_group_id`,
    [name, target_type, grant_group_id]
  );

  return {
    ...rows[0],
    id: Number(rows[0].id),
  };
}

export async function createTestDependency(blockingBugId: number, blockedBugId: number, userId: string) {
  await db.query(
    `INSERT INTO bug_dependencies (blocking_bug_id, blocked_bug_id, created_by)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [blockingBugId, blockedBugId, userId]
  );
}


