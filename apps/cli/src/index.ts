#!/usr/bin/env node

import { Command } from 'commander';
import { theme } from './theme.js';
import { config } from './config.js';
import { loginCommand, meCommand } from './commands/auth.js';
import { listBugsCommand, viewBugCommand, createBugCommand, statusBugCommand } from './commands/bug.js';
import { listCommentsCommand, addCommentCommand } from './commands/comment.js';
import { graphCommand, addDependencyCommand, removeDependencyCommand } from './commands/dep.js';
import { cvssCommand, updateSecurityCommand } from './commands/security.js';
import { triageCommand } from './commands/triage.js';
import { metricsCommand, readinessCommand } from './commands/metrics.js';
import { inboxCommand } from './commands/inbox.js';

const program = new Command();

program
  .name('mantis')
  .description('Mantis CLI — Stealthy monitoring, precise triage')
  .version('3.0.0')
  .option('--api-url <url>', 'Override backend API base URL')
  .hook('preAction', (thisCommand: Command) => {
    const opts = thisCommand.opts();
    if (opts.apiUrl) {
      config.save({ apiUrl: opts.apiUrl });
    }
  });

// Top-level Banner on --help
program.addHelpText('before', theme.banner());

// 1. Auth Group
const auth = program.command('auth').description('Authentication and session management');
auth
  .command('login')
  .description('Log into Mantis with an evaluator persona or credentials')
  .option('-p, --persona <name>', 'Quick-login persona: admin, alice, bob, carol, dave, eve')
  .option('-e, --email <email>', 'User email address')
  .option('--password <password>', 'User password')
  .action(loginCommand);

auth
  .command('me')
  .description('Inspect currently active session credentials')
  .action(meCommand);

// 2. Bug Group (also aliased top-level commands)
const bug = program.command('bug').description('Bug tracking, filing, and status transitions');
bug
  .command('list')
  .alias('ls')
  .description('List and filter bugs')
  .option('-s, --status <status>', 'Filter by bug status (UNCONFIRMED, CONFIRMED, IN_PROGRESS, RESOLVED, VERIFIED, CLOSED)')
  .option('-p, --priority <priority>', 'Filter by priority (P1, P2, P3, P4, P5)')
  .option('-l, --limit <number>', 'Maximum bugs to return', '50')
  .option('--json', 'Output results as JSON')
  .action(listBugsCommand);

bug
  .command('view <id>')
  .description('View detailed bug dossier')
  .option('--json', 'Output bug data as JSON')
  .action(viewBugCommand);

bug
  .command('create')
  .description('File a new bug report')
  .requiredOption('-s, --summary <summary>', 'Bug title/summary')
  .option('-d, --description <description>', 'Detailed reproduction steps and description')
  .option('--product-id <id>', 'Target product ID', '1')
  .option('--component-id <id>', 'Target component ID', '1')
  .option('-p, --priority <priority>', 'Bug priority (P1–P5)', 'P3')
  .option('--severity <severity>', 'Bug severity (blocker, critical, major, normal, minor, trivial)', 'normal')
  .action(createBugCommand);

bug
  .command('status <id> <status>')
  .description('Update bug status lifecycle')
  .option('-r, --resolution <resolution>', 'Resolution (FIXED, INVALID, WONTFIX, DUPLICATE, WORKSFORME, INCOMPLETE)')
  .action(statusBugCommand);

// Top level aliases
program
  .command('ls')
  .description('Alias for `mantis bug list`')
  .option('-s, --status <status>')
  .option('-p, --priority <priority>')
  .option('--json')
  .action(listBugsCommand);

program
  .command('view <id>')
  .description('Alias for `mantis bug view <id>`')
  .option('--json')
  .action(viewBugCommand);

// 3. Comments Group
const comment = program.command('comment').description('Bug discussions, comments, and stream piping');
comment
  .command('list <id>')
  .description('View all comments on a bug')
  .option('--json', 'Output raw comments JSON')
  .action(listCommentsCommand);

comment
  .command('add <id> [text]')
  .description('Add a new comment (supports reading piped stdin)')
  .action(addCommentCommand);

// 4. Dependencies & Graph
const dep = program.command('dep').description('Bug dependency trees and blocking links');
dep
  .command('add <blocking_id> <blocked_id>')
  .description('Add dependency (blocking_id blocks blocked_id)')
  .action(addDependencyCommand);

dep
  .command('remove <blocking_id> <blocked_id>')
  .description('Remove dependency edge')
  .action(removeDependencyCommand);

program
  .command('graph <id>')
  .description('Render visual ASCII CPM critical path dependency graph')
  .option('--json', 'Output raw graph JSON')
  .action(graphCommand);

// 5. Security & CVSS
program
  .command('cvss <vector>')
  .description('Calculate FIRST.org CVSS v4.0 vulnerability score offline')
  .option('--json', 'Output CVSS metrics as JSON')
  .action(cvssCommand);

const security = program.command('security').description('Vulnerability embargo & security management');
security
  .command('update <id>')
  .description('Update CVSS vector, embargo date, or security classification')
  .option('-v, --vector <vector>', 'CVSS v4.0 vector string')
  .option('-s, --security <boolean>', 'Mark as security-sensitive (true/false)')
  .option('-e, --embargo <date>', 'Embargo expiration date (YYYY-MM-DD)')
  .action(updateSecurityCommand);

// 6. Gemini AI Triage
program
  .command('triage <id>')
  .description('Run Gemini 2.0 Flash AI triage synthesis on a bug')
  .option('--json', 'Output AI triage analysis as JSON')
  .action(triageCommand);

// 7. Metrics & Release Readiness
const metrics = program.command('metrics').description('Velocity, MTTR, and analytics');
metrics
  .command('velocity')
  .description('Check throughput and mean time to resolve (MTTR)')
  .option('--json')
  .action((opts) => metricsCommand('velocity', opts));

program
  .command('readiness <milestone>')
  .description('Calculate 0–100% release readiness score for a milestone')
  .option('--json')
  .action(readinessCommand);

// 8. Inbox
program
  .command('inbox')
  .description('Launch terminal standup triage inbox')
  .option('--json')
  .action(inboxCommand);

program.parse(process.argv);
