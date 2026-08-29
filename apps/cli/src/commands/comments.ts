import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import { apiGet, apiPost } from '../apiClient.js';
import { BugComment } from '@bugzilla/shared';

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}

export function registerCommentCommands(program: Command) {
  const comment = program.command('comment').description('Bug comment management');

  // comment list
  comment
    .command('list <bugId>')
    .description('List comments for a bug')
    .action(async (bugId) => {
      const parentOpts = program.opts();
      try {
        const comments = await apiGet<BugComment[]>(`/api/v1/bugs/${bugId}/comments`);
        if (parentOpts.json) {
          console.log(JSON.stringify(comments, null, 2));
          return;
        }

        if (comments.length === 0) {
          console.log(chalk.yellow(`ℹ No comments found for Bug #${bugId}.`));
          return;
        }

        console.log(chalk.bold.underline(`Comments for Bug #${bugId}:`));
        for (const c of comments) {
          console.log(`\n${chalk.cyan(c.author_username || 'User')} ${chalk.dim(`(${c.created_at})`)}:`);
          console.log(`  ${c.body.replace(/\n/g, '\n  ')}`);
        }
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to fetch comments: ${err.message}`));
        process.exit(1);
      }
    });

  // comment add
  comment
    .command('add <bugId> [body]')
    .description('Add a comment to a bug (accepts body argument or stdin piping)')
    .option('--format <format>', 'Comment format (plain or markdown)', 'markdown')
    .action(async (bugId, body, options) => {
      const parentOpts = program.opts();
      try {
        let text = body;
        if (!text) {
          if (process.stdin.isTTY) {
            console.error(chalk.red('✖ Comment body required. Pass argument or pipe stdin (e.g. `cat file | bz comment add 104`)'));
            process.exit(1);
          }
          text = await readStdin();
        }

        if (!text) {
          console.error(chalk.red('✖ Empty comment body provided.'));
          process.exit(1);
        }

        const created = await apiPost<BugComment>(`/api/v1/bugs/${bugId}/comments`, {
          body: text,
          format: options.format,
        });

        if (parentOpts.json) {
          console.log(JSON.stringify(created, null, 2));
        } else {
          console.log(chalk.green(`✔ Added comment to Bug #${bugId} (ID: ${created.id})`));
        }
      } catch (err: any) {
        console.error(chalk.red(`✖ Failed to add comment: ${err.message}`));
        process.exit(1);
      }
    });
}
