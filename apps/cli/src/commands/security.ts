import { Command } from 'commander';
import chalk from 'chalk';
import { apiPatch } from '../apiClient.js';
import { computeCvss4 } from '../services/cvss4.js';

export function registerSecurityCommands(program: Command) {
  const sec = program.command('security').description('Security bug & CVSS v4.0 calculator');

  // cvss calc <vector>
  program
    .command('cvss <vector>')
    .description('Calculate FIRST.org CVSS v4.0 vector score')
    .action((vector) => {
      const parentOpts = program.opts();
      try {
        const result = computeCvss4(vector);
        if (parentOpts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.bold.cyan('\n🔒 CVSS v4.0 Score Calculation'));
        console.log(chalk.dim('─'.repeat(45)));
        console.log(`Vector:   ${result.vector}`);
        console.log(`Score:    ${chalk.bold.red(result.score.toFixed(1))}`);
        console.log(`Severity: ${chalk.bold(result.severity)}`);
      } catch (err: any) {
        console.error(chalk.red(`✖ Invalid CVSS v4.0 vector: ${err.message}`));
        process.exit(1);
      }
    });

  // security update <bugId>
  sec
    .command('update <bugId>')
    .description('Update bug security settings, CVSS 4.0 vector, or embargo date')
    .option('--vector <vector>', 'CVSS 4.0 vector string')
    .option('--embargo <date>', 'Embargo end date (YYYY-MM-DD)')
    .option('--security <boolean>', 'Mark bug as security restricted (true/false)')
    .action(async (bugId, options) => {
      const parentOpts = program.opts();
      try {
        const body: Record<string, any> = {};
        if (options.vector) body.cvss_vector = options.vector;
        if (options.embargo) body.embargo_until = options.embargo;
        if (options.security !== undefined) body.is_security = options.security === 'true';

        const updated = await apiPatch(`/api/v1/bugs/${bugId}/security`, body);
        if (parentOpts.json) {
          console.log(JSON.stringify(updated, null, 2));
        } else {
          console.log(chalk.green(`✔ Updated security metadata for Bug #${bugId}`));
        }
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to update security settings for Bug #${bugId}: ${err.message}`));
        process.exit(1);
      }
    });
}
