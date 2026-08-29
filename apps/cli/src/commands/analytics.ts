import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { apiGet } from '../apiClient.js';

export function registerAnalyticsCommands(program: Command) {
  const metrics = program.command('metrics').description('Engineering velocity & release metrics');

  // metrics velocity
  metrics
    .command('velocity')
    .description('Display MTTR and resolution throughput velocity metrics')
    .action(async () => {
      const parentOpts = program.opts();
      try {
        const data = await apiGet<{ velocity: any[] }>('/api/v1/analytics/velocity');
        if (parentOpts.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        console.log(chalk.bold.cyan('\n🚀 Engineering Velocity & MTTR Metrics'));
        console.log(chalk.dim('─'.repeat(55)));

        if (!data.velocity || data.velocity.length === 0) {
          console.log(chalk.yellow('ℹ No resolved bug activity recorded yet for velocity metrics.'));
          return;
        }

        const table = new Table({
          head: [
            chalk.bold('Product'),
            chalk.bold('Resolved Bugs'),
            chalk.bold('Avg MTTR (Days)'),
            chalk.bold('Median MTTR'),
            chalk.bold('P1/P2 Resolved'),
          ],
        });

        for (const item of data.velocity) {
          table.push([
            item.product_name,
            item.total_resolved,
            item.avg_mttr_days,
            item.median_mttr_days,
            item.high_priority_resolved,
          ]);
        }

        console.log(table.toString());
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to fetch velocity metrics: ${err.message}`));
        process.exit(1);
      }
    });

  // readiness <milestoneId>
  program
    .command('readiness <milestoneId>')
    .description('Calculate 0-100% Release Readiness Engine score for a target milestone')
    .action(async (milestoneId) => {
      const parentOpts = program.opts();
      try {
        const res = await apiGet<{ milestone_id: string; score: number; level: string; breakdown: any[] }>(
          `/api/v1/milestones/${milestoneId}/readiness`
        );

        if (parentOpts.json) {
          console.log(JSON.stringify(res, null, 2));
          return;
        }

        console.log(chalk.bold.cyan(`\n🎯 Release Readiness Score: Milestone "${res.milestone_id}"`));
        console.log(chalk.dim('─'.repeat(60)));

        const scoreColor = res.score >= 80 ? chalk.green : res.score >= 50 ? chalk.yellow : chalk.red;
        const progressBar = '█'.repeat(Math.round(res.score / 5)) + '░'.repeat(20 - Math.round(res.score / 5));

        console.log(`Score:  ${scoreColor.bold(`${res.score} / 100`)} [${progressBar}] (${res.level})`);

        if (res.breakdown && res.breakdown.length > 0) {
          console.log('\n' + chalk.bold('Penalty Breakdown:'));
          for (const item of res.breakdown) {
            console.log(`  ${chalk.red('•')} ${item.label}: ${chalk.red(`-${item.penalty} pts`)}`);
          }
        } else {
          console.log(chalk.green('✔ No release readiness penalties applied! Target ready for deployment.'));
        }
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to calculate readiness for milestone "${milestoneId}": ${err.message}`));
        process.exit(1);
      }
    });
}
