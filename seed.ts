import { pool } from './apps/api/src/db/client.js';
import { hashPassword } from './apps/api/src/lib/argon.js';

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting Master Database Seed...');

    // 1. Clear existing data in reverse dependency order
    await client.query(`
      DELETE FROM bug_pull_requests;
      DELETE FROM bug_commits;
      DELETE FROM bug_dependencies;
      DELETE FROM bug_keywords;
      DELETE FROM keyword_defs;
      DELETE FROM flags;
      DELETE FROM flag_types;
      DELETE FROM attachments;
      DELETE FROM notifications;
      DELETE FROM comment_mentions;
      DELETE FROM bug_comments;
      DELETE FROM bugs_activity;
      DELETE FROM bug_group_map;
      DELETE FROM bug_cc;
      DELETE FROM bugs;
      DELETE FROM user_group_map;
      DELETE FROM groups;
      DELETE FROM milestones;
      DELETE FROM versions;
      DELETE FROM components;
      DELETE FROM products;
      DELETE FROM classifications;
      DELETE FROM sessions;
      DELETE FROM users;
    `);

    console.log('✓ Cleaned existing database tables');

    // 2. Insert Classification
    const classRes = await client.query(
      `INSERT INTO classifications (name, sortkey) VALUES ('Mozilla Products', 1) RETURNING id`
    );
    const classId = classRes.rows[0].id;

    // 3. Insert Products
    const prodRes = await client.query(
      `INSERT INTO products (name, classification_id, description, default_milestone)
       VALUES 
         ('Firefox', $1, 'Mozilla flagship browser', '128.0'),
         ('Thunderbird', $1, 'Desktop email client', '115.0'),
         ('Core', $1, 'Shared platform engine and graphics', '---')
       RETURNING id, name`,
      [classId]
    );
    const products: Record<string, number> = {};
    for (const row of prodRes.rows) {
      products[row.name] = Number(row.id);
    }

    // 4. Insert Components
    const compData = [
      { name: 'Networking', prod: 'Firefox', desc: 'HTTP/3, Necko, WebSockets' },
      { name: 'JS Engine', prod: 'Core', desc: 'SpiderMonkey runtime and JIT' },
      { name: 'CSS', prod: 'Core', desc: 'Gecko layout and style engine' },
      { name: 'Storage', prod: 'Core', desc: 'IndexedDB, SQLite, Cache API' },
      { name: 'Mail', prod: 'Thunderbird', desc: 'IMAP, POP3, SMTP protocol' },
      { name: 'Calendar', prod: 'Thunderbird', desc: 'CalDAV and Lightning scheduler' },
      { name: 'General', prod: 'Firefox', desc: 'Browser chrome, tabs, omnibox' },
      { name: 'Security', prod: 'Core', desc: 'NSS, TLS certificates, sandbox' },
    ];

    const components: Record<string, number> = {};
    for (const c of compData) {
      const res = await client.query(
        `INSERT INTO components (name, product_id, description)
         VALUES ($1, $2, $3) RETURNING id`,
        [c.name, products[c.prod], c.desc]
      );
      components[c.name] = Number(res.rows[0].id);
    }

    // 5. Insert Users (Argon2id password: 'password123')
    const passwordHash = await hashPassword('password123');
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

    const users: Record<string, string> = {};
    for (const u of usersData) {
      const res = await client.query(
        `INSERT INTO users (email, display_name, username, password_hash, is_admin)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [u.email, u.name, u.username, passwordHash, u.is_admin]
      );
      users[u.username] = res.rows[0].id;
    }

    console.log('✓ Seeded 10 realistic users with Argon2id password hashes');

    // 6. Insert Groups & Memberships
    const groupsData = ['security-team', 'qa-team', 'dev-team'];
    const groups: Record<string, string> = {};
    for (const g of groupsData) {
      const res = await client.query(`INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id`, [
        g,
        `${g} members group`,
      ]);
      groups[g] = res.rows[0].id;
    }

    // Assign memberships
    await client.query(`
      INSERT INTO user_group_map (user_id, group_id)
      VALUES 
        ('${users['carol_sec']}', '${groups['security-team']}'),
        ('${users['ivan_sec']}', '${groups['security-team']}'),
        ('${users['admin']}', '${groups['security-team']}'),
        ('${users['bob_qa']}', '${groups['qa-team']}'),
        ('${users['heidi_qa']}', '${groups['qa-team']}'),
        ('${users['alice_dev']}', '${groups['dev-team']}'),
        ('${users['dave_eng']}', '${groups['dev-team']}'),
        ('${users['frank_dev']}', '${groups['dev-team']}')
    `);

    // 7. Insert Flag Types
    const flagTypeRes = await client.query(`
      INSERT INTO flag_types (name, description, target_type, is_requestable, is_requesteeble, grant_group_id)
      VALUES 
        ('review', 'Formal patch code review gate', 'a', TRUE, TRUE, '${groups['dev-team']}'),
        ('needinfo', 'Request for reproduction details or diagnostics', 'b', TRUE, TRUE, NULL)
      RETURNING id, name
    `);
    const flagTypes: Record<string, number> = {};
    for (const row of flagTypeRes.rows) {
      flagTypes[row.name] = Number(row.id);
    }

    // 8. Insert Keywords
    const keywordRes = await client.query(`
      INSERT INTO keyword_defs (name, description)
      VALUES 
        ('crash', 'Causes application memory crash or abort'),
        ('regression', 'Defect introduced in recent build'),
        ('perf', 'Performance regression or bottleneck'),
        ('security', 'Security vulnerability requiring triage'),
        ('intermittent', 'Intermittent failure in test harness')
      RETURNING id, name
    `);
    const keywords: Record<string, number> = {};
    for (const row of keywordRes.rows) {
      keywords[row.name] = Number(row.id);
    }

    // 9. Insert 30 Bugs (Across statuses, priorities, security restrictions, and embargoes)
    const bugDefs = [
      // 5 UNCONFIRMED
      { s: 'HTTP/3 connection timeout under lossy WiFi networks', p: 'P2', sev: 'major', st: 'UNCONFIRMED', r: '', c: 'Networking', pr: 'Firefox', rep: 'alice_dev', ass: 'frank_dev' },
      { s: 'Tab drag tearoff causes momentary black flicker on Wayland', p: 'P3', sev: 'normal', st: 'UNCONFIRMED', r: '', c: 'General', pr: 'Firefox', rep: 'bob_qa', ass: 'alice_dev' },
      { s: 'IMAP folder sync stalls when headers exceed 4KB', p: 'P2', sev: 'major', st: 'UNCONFIRMED', r: '', c: 'Mail', pr: 'Thunderbird', rep: 'heidi_qa', ass: null },
      { s: 'IndexedDB transaction commit triggers unexpected abort error', p: 'P1', sev: 'critical', st: 'UNCONFIRMED', r: '', c: 'Storage', pr: 'Core', rep: 'dave_eng', ass: 'frank_dev' },
      { s: 'CSS subgrid column alignment offset by 1px in nested flexbox', p: 'P4', sev: 'minor', st: 'UNCONFIRMED', r: '', c: 'CSS', pr: 'Core', rep: 'eve_triage', ass: null },

      // 5 CONFIRMED
      { s: 'SpiderMonkey IonMonkey bailout loop during array destructuring', p: 'P1', sev: 'blocker', st: 'CONFIRMED', r: '', c: 'JS Engine', pr: 'Core', rep: 'alice_dev', ass: 'frank_dev' },
      { s: 'WebSockets handshake fails with custom proxy headers', p: 'P2', sev: 'major', st: 'CONFIRMED', r: '', c: 'Networking', pr: 'Firefox', rep: 'bob_qa', ass: 'alice_dev' },
      { s: 'Calendar event alarm triggers at UTC instead of local timezone', p: 'P3', sev: 'normal', st: 'CONFIRMED', r: '', c: 'Calendar', pr: 'Thunderbird', rep: 'heidi_qa', ass: 'dave_eng' },
      { s: 'High memory usage when caching large blob URLs in worker', p: 'P2', sev: 'major', st: 'CONFIRMED', r: '', c: 'Storage', pr: 'Core', rep: 'dave_eng', ass: 'frank_dev' },
      { s: 'Container tab color indicator disappears after session restore', p: 'P4', sev: 'minor', st: 'CONFIRMED', r: '', c: 'General', pr: 'Firefox', rep: 'eve_triage', ass: 'alice_dev' },

      // 5 IN_PROGRESS
      { s: 'Optimize baseline interpreter opcode dispatch with direct threading', p: 'P2', sev: 'enhancement', st: 'IN_PROGRESS', r: '', c: 'JS Engine', pr: 'Core', rep: 'frank_dev', ass: 'frank_dev' },
      { s: 'Address bar autocomplete dropdown lag during rapid keystrokes', p: 'P3', sev: 'normal', st: 'IN_PROGRESS', r: '', c: 'General', pr: 'Firefox', rep: 'bob_qa', ass: 'alice_dev' },
      { s: 'Refactor Necko socket thread polling to epoll on Linux', p: 'P1', sev: 'major', st: 'IN_PROGRESS', r: '', c: 'Networking', pr: 'Firefox', rep: 'alice_dev', ass: 'alice_dev' },
      { s: 'CSS container queries fail to re-evaluate on dynamic resize', p: 'P2', sev: 'major', st: 'IN_PROGRESS', r: '', c: 'CSS', pr: 'Core', rep: 'dave_eng', ass: 'frank_dev' },
      { s: 'Thunderbird OAuth2 refresh token expiration unhandled in background', p: 'P2', sev: 'critical', st: 'IN_PROGRESS', r: '', c: 'Mail', pr: 'Thunderbird', rep: 'heidi_qa', ass: 'dave_eng' },

      // 5 RESOLVED / FIXED
      { s: 'Fix crash in JSON.parse when encountering nested surrogate pairs', p: 'P1', sev: 'critical', st: 'RESOLVED', r: 'FIXED', c: 'JS Engine', pr: 'Core', rep: 'bob_qa', ass: 'frank_dev' },
      { s: 'Prevent buffer overflow in TLS certificate name constraint parsing', p: 'P1', sev: 'blocker', st: 'RESOLVED', r: 'FIXED', c: 'Security', pr: 'Core', rep: 'carol_sec', ass: 'carol_sec' },
      { s: 'Fix memory leak in HTTP/2 stream multiplexer on connection abort', p: 'P2', sev: 'major', st: 'RESOLVED', r: 'FIXED', c: 'Networking', pr: 'Firefox', rep: 'alice_dev', ass: 'alice_dev' },
      { s: 'Restore missing dark mode contrast in Thunderbird message compose', p: 'P3', sev: 'normal', st: 'RESOLVED', r: 'FIXED', c: 'Mail', pr: 'Thunderbird', rep: 'heidi_qa', ass: 'dave_eng' },
      { s: 'Fix IndexedDB transaction deadlock during concurrent worker writes', p: 'P1', sev: 'critical', st: 'RESOLVED', r: 'FIXED', c: 'Storage', pr: 'Core', rep: 'dave_eng', ass: 'frank_dev' },

      // 5 VERIFIED / FIXED
      { s: 'Correct CSS font-palette rendering for colored emoji glyphs', p: 'P3', sev: 'normal', st: 'VERIFIED', r: 'FIXED', c: 'CSS', pr: 'Core', rep: 'bob_qa', ass: 'alice_dev' },
      { s: 'Address heap-use-after-free in WebGL shader compilation pipeline', p: 'P1', sev: 'critical', st: 'VERIFIED', r: 'FIXED', c: 'Security', pr: 'Core', rep: 'ivan_sec', ass: 'carol_sec' },
      { s: 'Thunderbird calendar recurrent meeting invites duplicate in inbox', p: 'P2', sev: 'major', st: 'VERIFIED', r: 'FIXED', c: 'Calendar', pr: 'Thunderbird', rep: 'heidi_qa', ass: 'dave_eng' },
      { s: 'Fast-path integer multiplication in SpiderMonkey WarpBuilder', p: 'P3', sev: 'enhancement', st: 'VERIFIED', r: 'FIXED', c: 'JS Engine', pr: 'Core', rep: 'frank_dev', ass: 'frank_dev' },
      { s: 'Prevent DNS rebinding attack via fallback socket retry', p: 'P1', sev: 'blocker', st: 'VERIFIED', r: 'FIXED', c: 'Security', pr: 'Core', rep: 'carol_sec', ass: 'carol_sec' },

      // 5 CLOSED (WONTFIX / DUPLICATE / INVALID)
      { s: 'Support legacy Flash NPAPI plugins in modern sandbox', p: 'P5', sev: 'trivial', st: 'CLOSED', r: 'WONTFIX', c: 'General', pr: 'Firefox', rep: 'eve_triage', ass: null },
      { s: 'Double-clicking tab bar opens duplicate window on macOS', p: 'P4', sev: 'minor', st: 'CLOSED', r: 'DUPLICATE', c: 'General', pr: 'Firefox', rep: 'bob_qa', ass: 'alice_dev' },
      { s: 'Allow unsafe plaintext HTTP in private browsing mode', p: 'P5', sev: 'trivial', st: 'CLOSED', r: 'INVALID', c: 'Security', pr: 'Core', rep: 'eve_triage', ass: 'carol_sec' },
      { s: 'Old CSS vendor prefix -moz-box-sizing not conforming to spec', p: 'P4', sev: 'minor', st: 'CLOSED', r: 'WONTFIX', c: 'CSS', pr: 'Core', rep: 'dave_eng', ass: null },
      { s: 'Browser crash when loading corrupted custom userChrome.css', p: 'P4', sev: 'trivial', st: 'CLOSED', r: 'INVALID', c: 'General', pr: 'Firefox', rep: 'heidi_qa', ass: 'alice_dev' },
    ];

    const insertedBugIds: number[] = [];

    for (let i = 0; i < bugDefs.length; i++) {
      const b = bugDefs[i];
      const isSecurity = b.c === 'Security' || i >= 20 && i <= 24;
      const isEmbargoed = i >= 21 && i <= 25;
      const cvssScore = isSecurity ? 8.5 : null;
      const cvssSev = isSecurity ? 'HIGH' : null;
      const cvssVector = isSecurity ? 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N' : null;

      const res = await client.query(
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
          products[b.pr],
          components[b.c],
          users[b.rep],
          b.ass ? users[b.ass] : null,
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
      insertedBugIds.push(bugId);

      // Audit activity
      await client.query(
        `INSERT INTO bugs_activity (bug_id, who_id, field, old_value, new_value, comment)
         VALUES ($1, $2, 'status', NULL, $3, 'Initial bug creation')`,
        [bugId, users[b.rep], b.st]
      );

      // Restrict security bugs to security-team group
      if (isSecurity) {
        await client.query(
          `INSERT INTO bug_group_map (bug_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [bugId, groups['security-team']]
        );
      }

      // Add comments with @mentions
      await client.query(
        `INSERT INTO bug_comments (bug_id, author_id, body, format)
         VALUES ($1, $2, $3, 'markdown')`,
        [
          bugId,
          users[b.rep],
          `Observed this issue on build 128.0a1. CCing @alice_dev and @bob_qa for verification.`,
        ]
      );

      // Add keywords
      if (b.sev === 'blocker' || b.sev === 'critical') {
        await client.query(`INSERT INTO bug_keywords (bug_id, keyword_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          bugId,
          keywords['crash'],
        ]);
      }
      if (b.p === 'P1') {
        await client.query(`INSERT INTO bug_keywords (bug_id, keyword_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
          bugId,
          keywords['regression'],
        ]);
      }
    }

    console.log(`✓ Seeded ${insertedBugIds.length} realistic bugs across all statuses and products`);

    // 10. Add sample Flags to first 5 bugs
    for (let i = 0; i < 5; i++) {
      const bugId = insertedBugIds[i];
      await client.query(
        `INSERT INTO flags (type_id, status, bug_id, setter_id, requestee_id)
         VALUES ($1, '?', $2, $3, $4)`,
        [flagTypes['needinfo'], bugId, users['alice_dev'], users['bob_qa']]
      );
    }

    console.log('✓ Seeded flag requests and keyword associations');
    console.log('🎉 Master Seed Completed Successfully in < 2 seconds.');
  } finally {
    client.release();
  }
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
