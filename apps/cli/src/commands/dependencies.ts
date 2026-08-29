import { Command } from 'commander';
import chalk from 'chalk';
import { apiGet, apiPost, apiDelete } from '../apiClient.js';
import { formatDependencyGraph } from '../formatters/graphFormatter.js';
import { DependencyGraphPayload } from '@bugzilla/shared';

export function registerDependencyCommands(program: Command) {
  const dep = program.command('dep').description('Dependency graph & CPM critical path operations');

  // dep add <bugId> <blockedBugId>
  dep
    .command('add <bugId> <blockedBugId>')
    .description('Add dependency link (Bug <bugId> blocks Bug <blockedBugId>)')
    .action(async (bugId, blockedBugId) => {
      const parentOpts = program.opts();
      try {
        const res = await apiPost(`/api/v1/bugs/${bugId}/dependencies`, {
          blocked_bug_id: parseInt(blockedBugId, 10),
        });

        if (parentOpts.json) {
          console.log(JSON.stringify(res, null, 2));
        } else {
          console.log(chalk.green(`✔ Added dependency edge: Bug #${bugId} ➔ blocks ➔ Bug #${blockedBugId}`));
        }
      } catch (err: any) {
        if (err.code === 'CYCLIC_DEPENDENCY_DETECTED') {
          console.error(chalk.red.bold(`✖ CYCLIC DEPENDENCY ERROR: Cannot add link because Bug #${blockedBugId} already directly or indirectly blocks Bug #${bugId}.`));
        } else {
          console.error(chalk.red(`✖ Failed to add dependency: ${err.message}`));
        }
        process.exit(1);
      }
    });

  // dep remove <bugId> <blockedBugId>
  dep
    .command('remove <bugId> <blockedBugId>')
    .description('Remove dependency link')
    .action(async (bugId, blockedBugId) => {
      const parentOpts = program.opts();
      try {
        const res = await apiDelete(`/api/v1/bugs/${bugId}/dependencies/${blockedBugId}`);
        if (parentOpts.json) {
          console.log(JSON.stringify(res, null, 2));
        } else {
          console.log(chalk.green(`✔ Removed dependency edge between Bug #${bugId} and Bug #${blockedBugId}`));
        }
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to remove dependency: ${err.message}`));
        process.exit(1);
      }
    });

  // bz graph <bugId>
  program
    .command('graph <bugId>')
    .description('Display CPM Dependency Graph and Critical Path analysis for a bug')
    .action(async (bugId) => {
      const parentOpts = program.opts();
      try {
        const graphData = await apiGet<DependencyGraphPayload>(`/api/v1/bugs/${bugId}/graph`);
        formatDependencyGraph(graphData, parentOpts.json);
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to fetch dependency graph for Bug #${bugId}: ${err.message}`));
        process.exit(1);
      }
    });
}
