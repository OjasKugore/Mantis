#!/usr/bin/env node
import { Command } from 'commander';
import { saveConfig } from './config.js';
import { registerAuthCommands } from './commands/auth.js';
import { registerBugCommands } from './commands/bugs.js';
import { registerCommentCommands } from './commands/comments.js';
import { registerDependencyCommands } from './commands/dependencies.js';
import { registerSecurityCommands } from './commands/security.js';
import { registerTriageCommands } from './commands/triage.js';
import { registerAnalyticsCommands } from './commands/analytics.js';
import { registerInboxCommands } from './commands/inbox.js';

const program = new Command();

program
  .name('bz')
  .description('BugzillaRevamp Command Line Interface')
  .version('1.0.0')
  .option('--api-url <url>', 'Override Bugzilla API Base URL')
  .option('--json', 'Output results in JSON format');

program.hook('preAction', (thisCommand: Command) => {
  const opts = thisCommand.opts();
  if (opts.apiUrl) {
    saveConfig({ apiUrl: opts.apiUrl });
  }
});

// Register all command modules
registerAuthCommands(program);
registerBugCommands(program);
registerCommentCommands(program);
registerDependencyCommands(program);
registerSecurityCommands(program);
registerTriageCommands(program);
registerAnalyticsCommands(program);
registerInboxCommands(program);

program.parse(process.argv);
