import { Command } from 'commander';
import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import { apiGet, apiPatch, apiPost } from '../apiClient.js';
import { formatBugDetail } from '../formatters/bugFormatter.js';
import { Bug } from '@bugzilla/shared';

export function registerInboxCommands(program: Command) {
  program
    .command('inbox')
    .description('Interactive terminal Triage Inbox session')
    .action(async () => {
      try {
        console.log(chalk.bold.cyan('\n📥 Bugzilla Triage Inbox'));
        console.log(chalk.dim('Fetching active bugs for triage...'));

        const bugs = await apiGet<Bug[]>('/api/v1/bugs', { status: 'UNCONFIRMED' });
        if (!bugs || bugs.length === 0) {
          console.log(chalk.green('✔ Inbox zero! No UNCONFIRMED bugs pending triage.'));
          return;
        }

        const choices = bugs.slice(0, 10).map((b) => ({
          name: `#${b.id} [${b.priority}] ${b.summary}`,
          value: b.id,
        }));

        choices.push({ name: chalk.dim('Exit Inbox'), value: -1 });

        const selectedId = await select({
          message: 'Select a bug to triage:',
          choices,
        });

        if (selectedId === -1) {
          console.log(chalk.dim('Exited Triage Inbox.'));
          return;
        }

        const bug = await apiGet<Bug>(`/api/v1/bugs/${selectedId}`);
        formatBugDetail(bug);

        const action = await select({
          message: `Triage Action for Bug #${selectedId}:`,
          choices: [
            { name: 'Confirm Bug (UNCONFIRMED ➔ CONFIRMED)', value: 'confirm' },
            { name: 'Start Progress (➔ IN_PROGRESS)', value: 'start' },
            { name: 'Run Gemini AI Triage Assistant', value: 'ai' },
            { name: 'Skip / Next', value: 'skip' },
          ],
        });

        if (action === 'confirm') {
          await apiPatch(`/api/v1/bugs/${selectedId}/status`, { status: 'CONFIRMED' });
          console.log(chalk.green(`✔ Bug #${selectedId} confirmed.`));
        } else if (action === 'start') {
          await apiPatch(`/api/v1/bugs/${selectedId}/status`, { status: 'IN_PROGRESS' });
          console.log(chalk.green(`✔ Bug #${selectedId} moved to IN_PROGRESS.`));
        } else if (action === 'ai') {
          const res = await apiPost(`/api/v1/bugs/${selectedId}/ai-triage`);
          console.log(chalk.magenta('\n✨ AI Triage Result:'), res);
        }
      } catch (err: any) {
        console.error(chalk.red(`✖ Inbox session error: ${err.message}`));
      }
    });
}
