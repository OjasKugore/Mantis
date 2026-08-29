import crypto from 'crypto';
import { setPool, db } from './client.js';
import { hashPassword } from '../lib/argon.js';
import { newDb } from 'pg-mem';

export async function initInMemoryFallbackDb() {
  console.log('⚡ Initializing high-speed in-memory PostgreSQL engine (pg-mem)...');
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

  // Now seed baseline data
  await seedFallbackData();
  console.log('✓ In-memory database populated with 10 seed users, products, components, and 30 bugs!');
}

async function seedFallbackData() {
  const passwordHash = await hashPassword('password123');

  // 1. Classification & Products
  await db.query(`INSERT INTO classifications (id, name, sortkey) VALUES (1, 'Mozilla Products', 1)`);
  await db.query(`INSERT INTO products (id, name, classification_id, description, default_milestone) VALUES 
    (1, 'Firefox', 1, 'Mozilla flagship browser', '128.0'),
    (2, 'Thunderbird', 1, 'Desktop email client', '115.0'),
    (3, 'Core', 1, 'Shared platform engine and graphics', '---')`);

  // 2. Components
  const compData = [
    { id: 1, name: 'Networking', prod: 1, desc: 'HTTP/3, Necko, WebSockets' },
    { id: 2, name: 'JS Engine', prod: 3, desc: 'SpiderMonkey runtime and JIT' },
    { id: 3, name: 'CSS', prod: 3, desc: 'Gecko layout and style engine' },
    { id: 4, name: 'Storage', prod: 3, desc: 'IndexedDB, SQLite, Cache API' },
    { id: 5, name: 'Mail', prod: 2, desc: 'IMAP, POP3, SMTP protocol' },
    { id: 6, name: 'Calendar', prod: 2, desc: 'CalDAV and Lightning scheduler' },
    { id: 7, name: 'General', prod: 1, desc: 'Browser chrome, tabs, omnibox' },
    { id: 8, name: 'Security', prod: 3, desc: 'NSS, TLS certificates, sandbox' },
  ];
  for (const c of compData) {
    await db.query(`INSERT INTO components (id, name, product_id, description) VALUES ($1, $2, $3, $4)`, [
      c.id,
      c.name,
      c.prod,
      c.desc,
    ]);
  }

  // 3. Users
  const usersData = [
    { username: 'admin', email: 'admin@mantis.local', name: 'System Administrator', is_admin: true },
    { username: 'alice_dev', email: 'alice@mozilla.com', name: 'Alice Developer', is_admin: false },
    { username: 'bob_qa', email: 'bob@mozilla.com', name: 'Bob QA Engineer', is_admin: false },
    { username: 'carol_sec', email: 'carol@mozilla.com', name: 'Carol Security Lead', is_admin: false },
    { username: 'dave_eng', email: 'dave@mozilla.com', name: 'Dave Performance Eng', is_admin: false },
    { username: 'eve_triage', email: 'eve@mozilla.com', name: 'Eve Triage Coordinator', is_admin: false },
    { username: 'frank_dev', email: 'frank@mozilla.com', name: 'Frank Engine Dev', is_admin: false },
    { username: 'grace_lead', email: 'grace@mozilla.com', name: 'Grace Tech Lead', is_admin: true },
    { username: 'heidi_qa', email: 'heidi@mozilla.com', name: 'Heidi Automation QA', is_admin: false },
    { username: 'ivan_sec', email: 'ivan@mozilla.com', name: 'Ivan Security Analyst', is_admin: false },
  ];

  const userIds: Record<string, string> = {};
  for (const u of usersData) {
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO users (id, email, display_name, username, password_hash, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, u.email, u.name, u.username, passwordHash, u.is_admin]
    );
    userIds[u.username] = id;
  }

  // 4. Groups
  const groupsData = ['security-team', 'qa-team', 'dev-team'];
  const groupIds: Record<string, string> = {};
  for (const g of groupsData) {
    const gid = crypto.randomUUID();
    await db.query(`INSERT INTO groups (id, name, description) VALUES ($1, $2, $3)`, [gid, g, `${g} group`]);
    groupIds[g] = gid;
  }

  // User Group Map
  await db.query(`INSERT INTO user_group_map (user_id, group_id) VALUES ($1, $2)`, [
    userIds['carol_sec'],
    groupIds['security-team'],
  ]);
  await db.query(`INSERT INTO user_group_map (user_id, group_id) VALUES ($1, $2)`, [
    userIds['ivan_sec'],
    groupIds['security-team'],
  ]);
  await db.query(`INSERT INTO user_group_map (user_id, group_id) VALUES ($1, $2)`, [
    userIds['admin'],
    groupIds['security-team'],
  ]);

  // 5. 30 Seed Bugs
  const bugDefs = [
    { s: 'HTTP/3 connection timeout under lossy WiFi networks', p: 'P2', sev: 'major', st: 'UNCONFIRMED', r: '', c: 1, pr: 1, rep: 'alice_dev', ass: 'frank_dev' },
    { s: 'Tab drag tearoff causes momentary black flicker on Wayland', p: 'P3', sev: 'normal', st: 'UNCONFIRMED', r: '', c: 7, pr: 1, rep: 'bob_qa', ass: 'alice_dev' },
    { s: 'IMAP folder sync stalls when headers exceed 4KB', p: 'P2', sev: 'major', st: 'UNCONFIRMED', r: '', c: 5, pr: 2, rep: 'heidi_qa', ass: null },
    { s: 'IndexedDB transaction commit triggers unexpected abort error', p: 'P1', sev: 'critical', st: 'UNCONFIRMED', r: '', c: 4, pr: 3, rep: 'dave_eng', ass: 'frank_dev' },
    { s: 'CSS subgrid column alignment offset by 1px in nested flexbox', p: 'P4', sev: 'minor', st: 'UNCONFIRMED', r: '', c: 3, pr: 3, rep: 'eve_triage', ass: null },

    { s: 'SpiderMonkey IonMonkey bailout loop during array destructuring', p: 'P1', sev: 'blocker', st: 'CONFIRMED', r: '', c: 2, pr: 3, rep: 'alice_dev', ass: 'frank_dev' },
    { s: 'WebSockets handshake fails with custom proxy headers', p: 'P2', sev: 'major', st: 'CONFIRMED', r: '', c: 1, pr: 1, rep: 'bob_qa', ass: 'alice_dev' },
    { s: 'Calendar event alarm triggers at UTC instead of local timezone', p: 'P3', sev: 'normal', st: 'CONFIRMED', r: '', c: 6, pr: 2, rep: 'heidi_qa', ass: 'dave_eng' },
    { s: 'High memory usage when caching large blob URLs in worker', p: 'P2', sev: 'major', st: 'CONFIRMED', r: '', c: 4, pr: 3, rep: 'dave_eng', ass: 'frank_dev' },
    { s: 'Container tab color indicator disappears after session restore', p: 'P4', sev: 'minor', st: 'CONFIRMED', r: '', c: 7, pr: 1, rep: 'eve_triage', ass: 'alice_dev' },

    { s: 'Optimize baseline interpreter opcode dispatch with direct threading', p: 'P2', sev: 'enhancement', st: 'IN_PROGRESS', r: '', c: 2, pr: 3, rep: 'frank_dev', ass: 'frank_dev' },
    { s: 'Address bar autocomplete dropdown lag during rapid keystrokes', p: 'P3', sev: 'normal', st: 'IN_PROGRESS', r: '', c: 7, pr: 1, rep: 'bob_qa', ass: 'alice_dev' },
    { s: 'Refactor Necko socket thread polling to epoll on Linux', p: 'P1', sev: 'major', st: 'IN_PROGRESS', r: '', c: 1, pr: 1, rep: 'alice_dev', ass: 'alice_dev' },
    { s: 'CSS container queries fail to re-evaluate on dynamic resize', p: 'P2', sev: 'major', st: 'IN_PROGRESS', r: '', c: 3, pr: 3, rep: 'dave_eng', ass: 'frank_dev' },
    { s: 'Thunderbird OAuth2 refresh token expiration unhandled in background', p: 'P2', sev: 'critical', st: 'IN_PROGRESS', r: '', c: 5, pr: 2, rep: 'heidi_qa', ass: 'dave_eng' },

    { s: 'Fix crash in JSON.parse when encountering nested surrogate pairs', p: 'P1', sev: 'critical', st: 'RESOLVED', r: 'FIXED', c: 2, pr: 3, rep: 'bob_qa', ass: 'frank_dev' },
    { s: 'Prevent buffer overflow in TLS certificate name constraint parsing', p: 'P1', sev: 'blocker', st: 'RESOLVED', r: 'FIXED', c: 8, pr: 3, rep: 'carol_sec', ass: 'carol_sec' },
    { s: 'Fix memory leak in HTTP/2 stream multiplexer on connection abort', p: 'P2', sev: 'major', st: 'RESOLVED', r: 'FIXED', c: 1, pr: 1, rep: 'alice_dev', ass: 'alice_dev' },
    { s: 'Restore missing dark mode contrast in Thunderbird message compose', p: 'P3', sev: 'normal', st: 'RESOLVED', r: 'FIXED', c: 5, pr: 2, rep: 'heidi_qa', ass: 'dave_eng' },
    { s: 'Fix IndexedDB transaction deadlock during concurrent worker writes', p: 'P1', sev: 'critical', st: 'RESOLVED', r: 'FIXED', c: 4, pr: 3, rep: 'dave_eng', ass: 'frank_dev' },

    { s: 'Correct CSS font-palette rendering for colored emoji glyphs', p: 'P3', sev: 'normal', st: 'VERIFIED', r: 'FIXED', c: 3, pr: 3, rep: 'bob_qa', ass: 'alice_dev' },
    { s: 'Address heap-use-after-free in WebGL shader compilation pipeline', p: 'P1', sev: 'critical', st: 'VERIFIED', r: 'FIXED', c: 8, pr: 3, rep: 'ivan_sec', ass: 'carol_sec' },
    { s: 'Thunderbird calendar recurrent meeting invites duplicate in inbox', p: 'P2', sev: 'major', st: 'VERIFIED', r: 'FIXED', c: 6, pr: 2, rep: 'heidi_qa', ass: 'dave_eng' },
    { s: 'Fast-path integer multiplication in SpiderMonkey WarpBuilder', p: 'P3', sev: 'enhancement', st: 'VERIFIED', r: 'FIXED', c: 2, pr: 3, rep: 'frank_dev', ass: 'frank_dev' },
    { s: 'Prevent DNS rebinding attack via fallback socket retry', p: 'P1', sev: 'blocker', st: 'VERIFIED', r: 'FIXED', c: 8, pr: 3, rep: 'carol_sec', ass: 'carol_sec' },
  ];

  for (const b of bugDefs) {
    const isSecurity = b.c === 8;
    const isEmbargoed = isSecurity;
    const cvssScore = isSecurity ? 8.5 : null;
    const cvssSev = isSecurity ? 'HIGH' : null;
    const cvssVector = isSecurity ? 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N' : null;

    const res = await db.query(
      `INSERT INTO bugs (
         summary, description, status, resolution, priority, severity,
         product_id, component_id, reporter_id, assignee_id,
         is_embargoed, embargo_until, cvss_vector, cvss_score, cvss_severity,
         estimated_time, remaining_time
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id`,
      [
        b.s,
        `Detailed reproduction steps and stack trace for "${b.s}". Investigated by engineering team.`,
        b.st,
        b.r,
        b.p,
        b.sev,
        b.pr,
        b.c,
        userIds[b.rep],
        b.ass ? userIds[b.ass] : null,
        isEmbargoed,
        isEmbargoed ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null,
        cvssVector,
        cvssScore,
        cvssSev,
        4.0,
        b.st === 'RESOLVED' || b.st === 'VERIFIED' || b.st === 'CLOSED' ? 0 : 2.5,
      ]
    );

    const bugId = Number(res.rows[0].id);
    if (isSecurity) {
      await db.query(`INSERT INTO bug_group_map (bug_id, group_id) VALUES ($1, $2)`, [
        bugId,
        groupIds['security-team'],
      ]);
    }
  }

  // 6. Seed Realistic Blocker Dependencies for Rich Multi-Node DAG & CPM
  const depChains = [
    { blocking: 1, blocked: 2 },
    { blocking: 2, blocked: 6 },
    { blocking: 3, blocked: 6 },
    { blocking: 4, blocked: 3 },
    { blocking: 6, blocked: 11 },
    { blocking: 7, blocked: 11 },
    { blocking: 11, blocked: 16 },
  ];

  for (const dep of depChains) {
    await db.query(
      `INSERT INTO bug_dependencies (blocking_bug_id, blocked_bug_id, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [dep.blocking, dep.blocked, userIds['admin']]
    );
  }
}
