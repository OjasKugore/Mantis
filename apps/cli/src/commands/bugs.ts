import { Command } from 'commander';
import chalk from 'chalk';
import { apiGet, apiPost, apiPatch } from '../apiClient.js';
import { formatBugList, formatBugDetail } from '../formatters/bugFormatter.js';
import { Bug, BugComment } from '@bugzilla/shared';

export function registerBugCommands(program: Command) {
  const bug = program.command('bug').description('Bug tracking & management');

  // bug list
  bug
    .command('list')
    .alias('ls')
    .description('List and filter bugs')
    .option('--product <id>', 'Filter by Product ID')
    .option('--component <id>', 'Filter by Component ID')
    .option('--status <status>', 'Filter by Bug Status')
    .option('--priority <priority>', 'Filter by Priority')
    .option('--assignee <id>', 'Filter by Assignee User ID')
    .action(async (options) => {
      const parentOpts = program.opts();
      try {
        const query: Record<string, any> = {};
        if (options.product) query.product_id = options.product;
        if (options.component) query.component_id = options.component;
        if (options.status) query.status = options.status;
        if (options.priority) query.priority = options.priority;
        if (options.assignee) query.assignee_id = options.assignee;

        const bugs = await apiGet<Bug[]>('/api/v1/bugs', query);
        formatBugList(bugs, parentOpts.json);
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to list bugs: ${err.message}`));
        process.exit(1);
      }
    });

  // bug view <id>
  bug
    .command('view <id>')
    .alias('get')
    .description('View detailed bug report and comments')
    .action(async (id) => {
      const parentOpts = program.opts();
      try {
        const bugData = await apiGet<Bug>(`/api/v1/bugs/${id}`);
        let comments: BugComment[] = [];
        try {
          comments = await apiGet<BugComment[]>(`/api/v1/bugs/${id}/comments`);
        } catch {
          // ignore if comments fail
        }

        formatBugDetail({ ...bugData, comments }, parentOpts.json);
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to fetch bug #${id}: ${err.message}`));
        process.exit(1);
      }
    });

  // bug create
  bug
    .command('create')
    .alias('new')
    .description('File a new bug report')
    .requiredOption('-s, --summary <summary>', 'Bug summary title')
    .requiredOption('-d, --description <description>', 'Detailed reproduction steps / description')
    .option('--product-id <id>', 'Product ID', '1')
    .option('--component-id <id>', 'Component ID', '1')
    .option('--priority <priority>', 'Priority (P1-P5)', 'P3')
    .option('--severity <severity>', 'Severity (blocker, critical, major, normal, minor, trivial)', 'normal')
    .option('--version <version>', 'Target version', '128.0')
    .action(async (options) => {
      const parentOpts = program.opts();
      try {
        // Check duplicate candidates
        const duplicates = await apiGet<Bug[]>('/api/v1/bugs/duplicates', { summary: options.summary });
        if (duplicates && duplicates.length > 0 && !parentOpts.json) {
          console.log(chalk.yellow(`⚠️ Warning: Found ${duplicates.length} potential duplicate bug(s):`));
          for (const d of duplicates.slice(0, 3)) {
            console.log(chalk.dim(`  - #${d.id} [${d.status}]: ${d.summary}`));
          }
        }

        const newBug = await apiPost<Bug>('/api/v1/bugs', {
          summary: options.summary,
          description: options.description,
          product_id: parseInt(options.productId, 10),
          component_id: parseInt(options.componentId, 10),
          priority: options.priority,
          severity: options.severity,
          version: options.version,
        });

        if (parentOpts.json) {
          console.log(JSON.stringify(newBug, null, 2));
        } else {
          console.log(chalk.green(`✔ Created Bug #${newBug.id}: ${newBug.summary}`));
        }
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to create bug: ${err.message}`));
        process.exit(1);
      }
    });

  // bug status <id> <status>
  bug
    .command('status <id> <newStatus>')
    .description('Transition bug status (UNCONFIRMED, CONFIRMED, IN_PROGRESS, RESOLVED, CLOSED)')
    .option('-r, --resolution <resolution>', 'Resolution (FIXED, WONTFIX, DUPLICATE, INVALID, WORKSFORME)')
    .action(async (id, newStatus, options) => {
      const parentOpts = program.opts();
      try {
        const payload: Record<string, any> = { status: newStatus.toUpperCase() };
        if (options.resolution) {
          payload.resolution = options.resolution.toUpperCase();
        }

        const updated = await apiPatch<Bug>(`/api/v1/bugs/${id}/status`, payload);
        if (parentOpts.json) {
          console.log(JSON.stringify(updated, null, 2));
        } else {
          console.log(chalk.green(`✔ Bug #${id} status updated to ${updated.status}${updated.resolution ? ` (${updated.resolution})` : ''}`));
        }
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to update status for Bug #${id}: ${err.message}`));
        process.exit(1);
      }
    });

  // bug duplicates <summary>
  bug
    .command('duplicates <summary>')
    .description('Find potential semantic duplicate bugs')
    .action(async (summary) => {
      const parentOpts = program.opts();
      try {
        const duplicates = await apiGet<Bug[]>('/api/v1/bugs/duplicates', { summary });
        formatBugList(duplicates, parentOpts.json);
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to search duplicates: ${err.message}`));
        process.exit(1);
      }
    });
}
