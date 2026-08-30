import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Demo personas that must always be preserved
const DEMO_EMAILS = [
  'admin@mantis.local',
  'alice@mozilla.com',
  'bob@mozilla.com',
  'carol@mozilla.com',
  'dave@mozilla.com',
  'eve@mozilla.com',
  'frank@mozilla.com',
  'grace@mozilla.com',
  'heidi@mozilla.com',
  'ivan@mozilla.com',
];

const SEED_PASSWORD_HASH = bcrypt.hashSync('password123', 8);

/**
 * Runs on every PostgreSQL connection:
 * 1. Ensures all tables exist (schema migration)
 * 2. Removes ALL non-demo user accounts and their associated data
 * 3. Seeds judge demo accounts and bugs if they are missing
 */
export async function initPostgresDb(pool: any) {
  console.log('🔧 Running PostgreSQL schema setup and demo data sync...');

  // Step 1: Ensure schema exists
  await pool.query(`
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
      priority_rank INTEGER DEFAULT 100,
      onboarded BOOLEAN NOT NULL DEFAULT FALSE,
      team_name VARCHAR(255),
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

    CREATE TABLE IF NOT EXISTS team_invites (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      email VARCHAR(255),
      token VARCHAR(64) NOT NULL UNIQUE,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      groups TEXT[] NOT NULL DEFAULT '{}',
      invited_by UUID,
      priority_rank INTEGER DEFAULT 100,
      is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      accepted_by UUID,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      default_milestone VARCHAR(64) NOT NULL DEFAULT '---',
      team_name VARCHAR(255)
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

    CREATE TABLE IF NOT EXISTS bug_cc (
      bug_id INTEGER NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      PRIMARY KEY (bug_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS keyword_defs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(64) NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS bug_keywords (
      bug_id INTEGER NOT NULL,
      keyword_id INTEGER NOT NULL,
      PRIMARY KEY (bug_id, keyword_id)
    );

    CREATE TABLE IF NOT EXISTS named_queries (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(64) NOT NULL,
      query_json JSONB NOT NULL
    );

    ALTER TABLE products ADD COLUMN IF NOT EXISTS team_name VARCHAR(255);
    UPDATE products 
    SET team_name = TRIM(SUBSTRING(description FROM 'Main product for (.*)'))
    WHERE (team_name IS NULL OR team_name = '') AND description LIKE 'Main product for %';
    UPDATE products
    SET team_name = 'Mozilla'
    WHERE (team_name IS NULL OR team_name = '') AND (id IN (1, 2, 3) OR LOWER(name) IN ('firefox', 'thunderbird', 'core'));
  `);

  // Step 2: Wipe ALL non-demo user data (sessions, flags, bugs, group memberships, team invites, then users)
  console.log('🧹 Clearing non-demo user accounts and their data...');

  const demoEmailList = DEMO_EMAILS.map((e) => `'${e}'`).join(', ');
  const nonDemoUserIds = await pool.query(
    `SELECT id FROM users WHERE email NOT IN (${demoEmailList})`
  );

  if (nonDemoUserIds.rows.length > 0) {
    const ids = nonDemoUserIds.rows.map((r: any) => r.id);
    const idList = ids.map((id: string) => `'${id}'`).join(', ');

    // Delete in dependency order (no FK cascade in all envs)
    await pool.query(`DELETE FROM sessions WHERE user_id IN (${idList})`);
    await pool.query(`DELETE FROM notifications WHERE user_id IN (${idList})`);
    await pool.query(`DELETE FROM comment_mentions WHERE mentioned_user_id IN (${idList})`);
    await pool.query(`DELETE FROM user_group_map WHERE user_id IN (${idList})`);

    // Bugs filed by non-demo users
    const nonDemoBugs = await pool.query(
      `SELECT id FROM bugs WHERE reporter_id IN (${idList})`
    );
    if (nonDemoBugs.rows.length > 0) {
      const bugIds = nonDemoBugs.rows.map((r: any) => r.id).join(', ');
      await pool.query(`DELETE FROM flags WHERE bug_id IN (${bugIds})`);
      await pool.query(`DELETE FROM bug_comments WHERE bug_id IN (${bugIds})`);
      await pool.query(`DELETE FROM bugs_activity WHERE bug_id IN (${bugIds})`);
      await pool.query(`DELETE FROM bug_group_map WHERE bug_id IN (${bugIds})`);
      await pool.query(`DELETE FROM bug_commits WHERE bug_id IN (${bugIds})`);
      await pool.query(`DELETE FROM bug_pull_requests WHERE bug_id IN (${bugIds})`);
      await pool.query(`DELETE FROM bug_dependencies WHERE blocking_bug_id IN (${bugIds}) OR blocked_bug_id IN (${bugIds})`);
      await pool.query(`DELETE FROM bugs WHERE id IN (${bugIds})`);
    }

    await pool.query(`DELETE FROM users WHERE id IN (${idList})`);
    console.log(`✓ Removed ${ids.length} non-demo user account(s) and their data.`);
  } else {
    console.log('✓ No non-demo accounts found — workspace already clean.');
  }

  // Also clear expired/all team invites (they belong to removed users)
  await pool.query(`DELETE FROM team_invites WHERE invited_by NOT IN (SELECT id FROM users) OR invited_by IS NULL`);

  // Step 3: Seed judge demo accounts if missing
  await seedDemoDataIfMissing(pool);

  console.log('✅ PostgreSQL ready: judge demo data preserved, non-demo data cleared.');
}

async function seedDemoDataIfMissing(pool: any) {
  // Check if admin already exists
  const { rows: existingAdmin } = await pool.query(
    `SELECT id FROM users WHERE email = 'admin@mantis.local'`
  );
  if (existingAdmin.length > 0) {
    console.log('✓ Judge demo seed accounts already present — skipping seed.');
    return;
  }

  console.log('🌱 Seeding judge demo accounts and baseline bugs...');

  // Classifications & Products
  await pool.query(`
    INSERT INTO classifications (id, name, sortkey) VALUES (1, 'Mozilla Products', 1)
    ON CONFLICT DO NOTHING
  `);
  await pool.query(`
    INSERT INTO products (id, name, classification_id, description, default_milestone, team_name) VALUES
      (1, 'Firefox', 1, 'Mozilla flagship browser', '128.0', 'Mozilla'),
      (2, 'Thunderbird', 1, 'Desktop email client', '115.0', 'Mozilla'),
      (3, 'Core', 1, 'Shared platform engine and graphics', '---', 'Mozilla')
    ON CONFLICT DO NOTHING
  `);

  // Components
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
    await pool.query(
      `INSERT INTO components (id, name, product_id, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [c.id, c.name, c.prod, c.desc]
    );
  }

  // Users
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
    await pool.query(
      `INSERT INTO users (id, email, display_name, username, password_hash, is_admin, onboarded)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, is_admin = EXCLUDED.is_admin, onboarded = TRUE
       RETURNING id`,
      [id, u.email, u.name, u.username, SEED_PASSWORD_HASH, u.is_admin]
    );
    // Re-fetch to get actual id (in case of conflict update)
    const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [u.email]);
    userIds[u.username] = rows[0].id;
  }

  // Groups
  const groupsData = ['security-team', 'qa-team', 'dev-team'];
  const groupIds: Record<string, string> = {};
  for (const g of groupsData) {
    const gid = crypto.randomUUID();
    await pool.query(
      `INSERT INTO groups (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
      [gid, g, `${g} group`]
    );
    const { rows } = await pool.query(`SELECT id FROM groups WHERE name = $1`, [g]);
    groupIds[g] = rows[0].id;
  }

  // Group memberships
  const memberships = [
    { user: 'carol_sec', group: 'security-team' },
    { user: 'ivan_sec', group: 'security-team' },
    { user: 'admin', group: 'security-team' },
    { user: 'bob_qa', group: 'qa-team' },
    { user: 'heidi_qa', group: 'qa-team' },
    { user: 'alice_dev', group: 'dev-team' },
    { user: 'frank_dev', group: 'dev-team' },
    { user: 'dave_eng', group: 'dev-team' },
  ];
  for (const m of memberships) {
    await pool.query(
      `INSERT INTO user_group_map (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userIds[m.user], groupIds[m.group]]
    );
  }

  // Seed bugs
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
    { s: 'Heap snapshot diff reveals 200MB leak in MediaDecoder pipeline', p: 'P1', sev: 'blocker', st: 'IN_PROGRESS', r: '', c: 4, pr: 3, rep: 'carol_sec', ass: 'frank_dev' },
    { s: 'Implement structured clone transfer for SharedArrayBuffer in workers', p: 'P2', sev: 'enhancement', st: 'IN_PROGRESS', r: '', c: 2, pr: 3, rep: 'frank_dev', ass: 'alice_dev' },
    { s: 'Sanitize untrusted HTML in mail compose editor via DOMPurify', p: 'P2', sev: 'major', st: 'IN_PROGRESS', r: '', c: 5, pr: 2, rep: 'ivan_sec', ass: 'carol_sec' },
    { s: 'Use-after-free in nsDocShell during rapid tab switching', p: 'P1', sev: 'blocker', st: 'RESOLVED', r: 'FIXED', c: 7, pr: 1, rep: 'carol_sec', ass: 'alice_dev' },
    { s: 'Fix IndexedDB transaction deadlock during concurrent worker writes', p: 'P1', sev: 'critical', st: 'RESOLVED', r: 'FIXED', c: 4, pr: 3, rep: 'dave_eng', ass: 'frank_dev' },
    { s: 'Correct CSS font-palette rendering for colored emoji glyphs', p: 'P3', sev: 'normal', st: 'VERIFIED', r: 'FIXED', c: 3, pr: 3, rep: 'bob_qa', ass: 'alice_dev' },
    { s: 'Patch Thunderbird OpenPGP decryption key selection dialog crash', p: 'P1', sev: 'blocker', st: 'VERIFIED', r: 'FIXED', c: 5, pr: 2, rep: 'ivan_sec', ass: 'carol_sec' },
    { s: 'Thunderbird calendar recurrent meeting invites duplicate in inbox', p: 'P2', sev: 'major', st: 'VERIFIED', r: 'FIXED', c: 6, pr: 2, rep: 'heidi_qa', ass: 'dave_eng' },
    { s: 'Fast-path integer multiplication in SpiderMonkey WarpBuilder', p: 'P3', sev: 'enhancement', st: 'VERIFIED', r: 'FIXED', c: 2, pr: 3, rep: 'frank_dev', ass: 'frank_dev' },
  ];

  for (const b of bugDefs) {
    const isSecurity = b.sev === 'blocker' && b.c === 8;
    const isEmbargoed = b.sev === 'blocker' && (b.st === 'IN_PROGRESS' || b.st === 'CONFIRMED');
    const cvssScore = b.sev === 'blocker' ? 9.1 : b.sev === 'critical' ? 7.5 : b.sev === 'major' ? 5.3 : null;
    const cvssVector = cvssScore ? 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N' : null;
    const cvssSev = cvssScore && cvssScore >= 9 ? 'CRITICAL' : cvssScore && cvssScore >= 7 ? 'HIGH' : cvssScore ? 'MEDIUM' : null;

    await pool.query(
      `INSERT INTO bugs (summary, description, status, resolution, priority, severity, product_id, component_id,
        reporter_id, assignee_id, is_embargoed, embargo_until, cvss_vector, cvss_score, cvss_severity,
        estimated_time, remaining_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        b.s,
        `Detailed reproduction steps and stack trace for "${b.s}". Investigated by engineering team.`,
        b.st, b.r, b.p, b.sev, b.pr, b.c,
        userIds[b.rep],
        b.ass ? userIds[b.ass] : null,
        isEmbargoed,
        isEmbargoed ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null,
        cvssVector, cvssScore, cvssSev,
        4.0,
        b.st === 'RESOLVED' || b.st === 'VERIFIED' || b.st === 'CLOSED' ? 0 : 2.5,
      ]
    );
  }

  // Seed flag types
  await pool.query(`
    INSERT INTO flag_types (id, name, description, target_type) VALUES
    (1, 'needinfo', 'Request more information from author/reporter', 'b'),
    (2, 'review', 'Code review approval request for patch', 'b'),
    (3, 'approval', 'Release management sign-off for uplift', 'b')
    ON CONFLICT DO NOTHING
  `);

  // Seed Keywords, CC & Named Queries
  await pool.query(`
    INSERT INTO keyword_defs (name, description) VALUES
    ('crash', 'Causes application or subsystem crash'),
    ('regression', 'Broken functionality that used to work in previous release'),
    ('sec-audit', 'Security vulnerability under review by security group'),
    ('perf', 'Performance degradation or memory leak'),
    ('blocked', 'Blocked by external dependency or upstream vendor'),
    ('topcrash', 'High frequency crash reported in telemetry'),
    ('good-first-bug', 'Accessible for onboarding new contributors'),
    ('ui-review', 'Pending user experience and design approval')
    ON CONFLICT DO NOTHING;

    INSERT INTO bug_keywords (bug_id, keyword_id) VALUES
    (1, 1), (1, 4),
    (2, 2),
    (3, 3), (3, 1),
    (4, 4),
    (5, 5)
    ON CONFLICT DO NOTHING;

    INSERT INTO bug_cc (bug_id, user_id) VALUES
    (1, '${userIds['alice']}'),
    (1, '${userIds['bob']}'),
    (2, '${userIds['dave']}'),
    (3, '${userIds['carol']}')
    ON CONFLICT DO NOTHING;

    INSERT INTO named_queries (user_id, name, query_json) VALUES
    ('${userIds['admin']}', 'All Open Defects', '{"status":"all","priority":"all","severity":"all","embargo":"all"}'),
    ('${userIds['admin']}', 'P1 Blockers', '{"status":"all","priority":"P1","severity":"all","embargo":"all"}'),
    ('${userIds['admin']}', 'Security Embargoed', '{"status":"all","priority":"all","severity":"all","embargo":"embargoed"}'),
    ('${userIds['admin']}', 'Needs Triage (Unconfirmed)', '{"status":"UNCONFIRMED","priority":"all","severity":"all","embargo":"all"}')
    ON CONFLICT DO NOTHING;
  `);

  console.log('✅ Judge demo data seeded successfully.');
}
