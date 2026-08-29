import Table from 'cli-table3';
import boxen from 'boxen';
import chalk from 'chalk';
import { Bug, BugComment } from '@bugzilla/shared';

export function getStatusBadge(status: string): string {
  switch (status) {
    case 'UNCONFIRMED':
      return chalk.yellow('UNCONFIRMED');
    case 'CONFIRMED':
      return chalk.cyan('CONFIRMED');
    case 'IN_PROGRESS':
      return chalk.blue.bold('IN_PROGRESS');
    case 'RESOLVED':
      return chalk.green('RESOLVED');
    case 'VERIFIED':
      return chalk.green.bold('VERIFIED');
    case 'CLOSED':
      return chalk.gray('CLOSED');
    default:
      return status;
  }
}

export function getPriorityBadge(priority: string): string {
  switch (priority) {
    case 'P1':
      return chalk.red.bold('P1');
    case 'P2':
      return chalk.magenta('P2');
    case 'P3':
      return chalk.yellow('P3');
    case 'P4':
      return chalk.blue('P4');
    default:
      return chalk.gray(priority);
  }
}

export function formatBugList(bugs: Bug[], isJson: boolean = false): void {
  if (isJson) {
    console.log(JSON.stringify(bugs, null, 2));
    return;
  }

  if (bugs.length === 0) {
    console.log(chalk.yellow('ℹ No bugs found matching criteria.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Priority'),
      chalk.bold('Severity'),
      chalk.bold('Status'),
      chalk.bold('Summary'),
    ],
    colWidths: [8, 10, 12, 16, 45],
  });

  for (const bug of bugs) {
    table.push([
      chalk.dim(`#${bug.id}`),
      getPriorityBadge(bug.priority),
      bug.severity,
      getStatusBadge(bug.status),
      bug.summary.length > 42 ? bug.summary.substring(0, 39) + '...' : bug.summary,
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`Total: ${bugs.length} issue(s)`));
}

export function formatBugDetail(bug: Bug & { comments?: BugComment[] }, isJson: boolean = false): void {
  if (isJson) {
    console.log(JSON.stringify(bug, null, 2));
    return;
  }

  const header = `${chalk.bold.cyan(`Bug #${bug.id}`)}: ${chalk.bold(bug.summary)}`;
  let meta = [
    `Status:      ${getStatusBadge(bug.status)}${bug.resolution ? ` (${bug.resolution})` : ''}`,
    `Priority:    ${getPriorityBadge(bug.priority)} | Severity: ${bug.severity}`,
    `Milestone:   ${bug.target_milestone || '---'} | Version: ${bug.version || '---'}`,
    `Assignee:    ${bug.assignee_id || 'Unassigned'}`,
  ].join('\n');

  if (bug.cvss_score) {
    meta += `\nCVSS 4.0:    ${chalk.bold.red(bug.cvss_score.toFixed(1))} (${bug.cvss_severity || 'HIGH'}) [Vector: ${bug.cvss_vector}]`;
  }

  if (bug.is_embargoed) {
    meta += `\nEMBARGO:     ${chalk.bgRed.white.bold(' EMBARGOED ')} Until: ${bug.embargo_until}`;
  }

  const cardContent = `${header}\n${chalk.dim('─'.repeat(50))}\n${meta}\n\n${chalk.bold('Description:')}\n${bug.description}`;

  console.log(boxen(cardContent, { padding: 1, margin: 1, borderColor: 'blue' }));

  if (bug.comments && bug.comments.length > 0) {
    console.log(chalk.bold.underline(`\nComments (${bug.comments.length}):`));
    for (const comment of bug.comments) {
      console.log(`\n${chalk.cyan(comment.author_username || 'User')} ${chalk.dim(`(${comment.created_at})`)}:`);
      console.log(`  ${comment.body.replace(/\n/g, '\n  ')}`);
    }
  }
}
