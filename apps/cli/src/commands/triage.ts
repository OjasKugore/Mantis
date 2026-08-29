import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { apiPost } from '../apiClient.js';
import { TriageResult } from '@bugzilla/shared';

export function registerTriageCommands(program: Command) {
  program
    .command('triage <bugId>')
    .description('Trigger Gemini 2.0 Flash AI Triage Assistant for a bug thread')
    .action(async (bugId) => {
      const parentOpts = program.opts();
      const spinner = !parentOpts.json ? ora(`Synthesizing thread and analyzing Bug #${bugId} with Gemini AI...`).start() : null;

      try {
        const result = await apiPost<TriageResult>(`/api/v1/bugs/${bugId}/ai-triage`);

        if (spinner) {
          spinner.succeed(`AI Triage complete for Bug #${bugId}`);
        }

        if (parentOpts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const content = [
          chalk.bold.magenta('✨ Gemini AI Triage Synthesis'),
          chalk.dim('─'.repeat(55)),
          `${chalk.bold('Summary:')}             ${result.summary}`,
          `${chalk.bold('Suggested Priority:')}  ${chalk.yellow.bold(result.suggested_priority)}`,
          `${chalk.bold('Suggested Component:')} ${result.suggested_component}`,
          `${chalk.bold('Confidence Reason:')}   ${result.confidence_reason}`,
          '',
          chalk.bold('Recommended Action Plan:'),
          ...result.next_steps.map((step, idx) => `  ${idx + 1}. ${step}`),
        ].join('\n');

        console.log(boxen(content, { padding: 1, margin: 1, borderColor: 'magenta' }));
      } catch (err: any) {
        if (spinner) {
          spinner.fail(`AI Triage failed for Bug #${bugId}`);
        }
        console.error(chalk.red(`✖ Error: ${err.message}`));
        process.exit(1);
      }
    });
}
