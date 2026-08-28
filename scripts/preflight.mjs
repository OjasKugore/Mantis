#!/usr/bin/env node
/**
 * BugzillaRevamp — Preflight Check Script
 * Run with: npm run preflight
 *
 * Catches every known failure mode BEFORE migrate/seed/dev so that
 * a first-time user gets a clear, actionable error — not a cryptic stack trace.
 *
 * Checks:
 *   1. Node.js version >= 18
 *   2. npm present
 *   3. Docker CLI present
 *   4. Docker daemon running
 *   5. Port 5432 — free / ours / foreign (THE #1 cause of "wrong password" errors)
 *   6. Port 3001 — free for Fastify
 *   7. node_modules installed (root + apps/api)
 *   8. Live DB connectivity + auth + database existence
 */

import { execSync }                     from 'child_process';
import net                              from 'net';
import { existsSync }                   from 'fs';
import { join, dirname }                from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM    = (s) => `\x1b[2m${s}\x1b[0m`;
const CYAN   = (s) => `\x1b[36m${s}\x1b[0m`;

const PASS = GREEN('  ✔'); const FAIL = RED('  ✘'); const WARN = YELLOW('  ⚠');

let errors = 0, warnings = 0;

function pass(msg)      { console.log(`${PASS}  ${msg}`); }
function fail(msg, fix) { console.log(`${FAIL}  ${RED(BOLD(msg))}`); printFix(fix); errors++;   }
function warn(msg, fix) { console.log(`${WARN}  ${YELLOW(msg)}`);   printFix(fix); warnings++; }
function printFix(fix) {
  if (!fix) return;
  (Array.isArray(fix) ? fix : [fix]).forEach((l, i) =>
    console.log(`${i === 0 ? `       ${YELLOW('→ FIX:')} ` : '               '}${l}`)
  );
}
function cmd(c) { try { return execSync(c, { stdio: 'pipe' }).toString().trim(); } catch { return null; } }

function portFree(port) {
  return new Promise((r) => {
    const s = net.createServer();
    s.once('error', () => r(false));
    s.once('listening', () => { s.close(); r(true); });
    s.listen(port, '127.0.0.1');
  });
}
function portReachable(port) {
  return new Promise((r) => {
    const s = net.createConnection({ port, host: '127.0.0.1' });
    s.setTimeout(1500);
    s.once('connect', () => { s.destroy(); r(true);  });
    s.once('error',   () => { s.destroy(); r(false); });
    s.once('timeout', () => { s.destroy(); r(false); });
  });
}

// ─── Banner ───────────────────────────────────────────────────────────────────
console.log();
console.log(BOLD(CYAN('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
console.log(BOLD(CYAN('  BugzillaRevamp — Pre-flight Environment Check')));
console.log(BOLD(CYAN('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
console.log();

// ── 1. Node.js ────────────────────────────────────────────────────────────────
console.log(BOLD('1. Runtime'));
const nodeMajor = parseInt(process.version.slice(1));
if (nodeMajor >= 18) pass(`Node.js ${process.version}  ${DIM('(>= 18 required)')}`);
else fail(`Node.js ${process.version} is too old (minimum: v18)`, 'Download Node.js 20 LTS from https://nodejs.org');

const npmVer = cmd('npm --version');
if (npmVer) pass(`npm v${npmVer}`);
else fail('npm not found', 'Install Node.js (npm is bundled): https://nodejs.org');

// ── 2. Docker ─────────────────────────────────────────────────────────────────
console.log(); console.log(BOLD('2. Docker'));
const dockerVer = cmd('docker --version');
if (!dockerVer) {
  fail('Docker CLI not found', [
    'Install Docker Desktop: https://www.docker.com/products/docker-desktop/',
    'Windows users: enable WSL2 backend during installation.',
  ]);
} else {
  pass(`Docker CLI found  ${DIM('(' + dockerVer + ')')}`);
  const engineVer = cmd('docker info --format "{{.ServerVersion}}"');
  if (!engineVer) {
    fail('Docker Desktop is installed but NOT running', [
      'Open Docker Desktop from Start Menu / Applications.',
      'Wait ~30s until the icon turns green (Engine running).',
      'Windows: if stuck, run in PowerShell (Admin):  wsl --update',
    ]);
  } else {
    pass(`Docker engine running  ${DIM('(v' + engineVer + ')')}`);
  }
}

// ── 3. Port 5432 — the #1 failure point ──────────────────────────────────────
console.log(); console.log(BOLD('3. Port 5432  (PostgreSQL)'));
const p5432Free      = await portFree(5432);
const p5432Reachable = await portReachable(5432);
let ourDockerDbUp    = false;

if (p5432Free) {
  warn('Nothing is listening on port 5432 yet', 'Start the database: docker compose up -d db');
} else if (p5432Reachable) {
  const dockerPs = cmd('docker ps --filter "publish=5432" --format "{{.Image}}"');
  if (dockerPs && dockerPs.includes('postgres')) {
    pass('Port 5432 is owned by our Docker PostgreSQL container ✓');
    ourDockerDbUp = true;
  } else {
    fail('Port 5432 is occupied by a FOREIGN PostgreSQL service — NOT our Docker container!', [
      'This is the exact cause of: "password authentication failed for user bz"',
      'A local (non-Docker) PostgreSQL is intercepting the connection.',
      '',
      'Step 1 — Stop the local PostgreSQL service:',
      '  Windows (Git Bash as Admin):  net stop postgresql-x64-16',
      '  macOS:                        brew services stop postgresql@16',
      '  Linux:                        sudo systemctl stop postgresql',
      '',
      'Step 2 — Reset Docker volume and restart:',
      '  docker compose down -v',
      '  docker compose up -d db',
      '  npm run migrate',
    ]);
  }
}

// ── 4. Port 3001 ──────────────────────────────────────────────────────────────
console.log(); console.log(BOLD('4. Port 3001  (Fastify API)'));
const p3001Free = await portFree(3001);
if (p3001Free) pass('Port 3001 is free — Fastify API will start cleanly');
else warn('Port 3001 is already in use — Fastify may fail to start', [
  'Find the blocking process:',
  '  macOS/Linux:  lsof -i :3001',
  '  Windows:      netstat -ano | findstr 3001',
]);

// ── 5. node_modules ───────────────────────────────────────────────────────────
console.log(); console.log(BOLD('5. Dependencies'));
const rootMods = existsSync(join(ROOT, 'node_modules'));
const apiMods  = existsSync(join(ROOT, 'apps', 'api', 'node_modules'));
if (rootMods && apiMods) pass('node_modules installed (root + apps/api)');
else fail(
  `node_modules missing: ${[!rootMods && 'root', !apiMods && 'apps/api'].filter(Boolean).join(', ')}`,
  'Run: npm install   (from the repository root)'
);

// ── 6. Live DB connectivity ───────────────────────────────────────────────────
console.log(); console.log(BOLD('6. Database Connectivity'));
if (!ourDockerDbUp) {
  warn('Skipping DB connectivity check — Docker PostgreSQL not confirmed running');
} else {
  try {
    const require = createRequire(import.meta.url);
    const pg      = require(join(ROOT, 'apps', 'api', 'node_modules', 'pg'));
    const connStr = process.env.DATABASE_URL || 'postgresql://bz:bz@localhost:5432/bugzilla';
    const pool    = new pg.Pool({ connectionString: connStr, connectionTimeoutMillis: 3000 });
    await pool.query('SELECT 1');
    await pool.end();
    pass(`Connected successfully  ${DIM(connStr)}`);
  } catch (e) {
    const code = e.code || '';
    if (code === '28P01')   fail('Wrong password — stale Docker volume has old credentials', ['docker compose down -v', 'docker compose up -d db', 'npm run migrate']);
    else if (code === 'ECONNREFUSED') fail('Connection refused on :5432', 'docker compose up -d db');
    else if (code === '3D000') fail('Database "bugzilla" does not exist yet', 'npm run migrate');
    else if (code === '42P01') warn('Tables not yet created', 'npm run migrate');
    else fail(`DB error (${code}): ${e.message}`, 'Check: docker compose ps');
  }
}

// ── Final summary ─────────────────────────────────────────────────────────────
console.log();
console.log(BOLD(CYAN('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
if (errors === 0 && warnings === 0) {
  console.log(GREEN(BOLD('  ✔  All checks passed! Environment is ready.')));
  console.log(DIM('     Next:  npm run migrate  →  npm run seed  →  npm run dev'));
} else if (errors === 0) {
  console.log(YELLOW(BOLD(`  ⚠  ${warnings} warning(s) — review above, then continue.`)));
} else {
  console.log(RED(BOLD(`  ✘  ${errors} error(s) — fix the issues above, then re-run: npm run preflight`)));
}
console.log(BOLD(CYAN('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
console.log();

process.exit(errors > 0 ? 1 : 0);
