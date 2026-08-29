import chalk from 'chalk';
import Table from 'cli-table3';
import { DependencyGraphPayload } from '@bugzilla/shared';

export function formatDependencyGraph(payload: DependencyGraphPayload, isJson: boolean = false): void {
  if (isJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const { nodes, edges, criticalPathIds } = payload;
  const criticalSet = new Set(criticalPathIds || []);

  console.log(chalk.bold.cyan('\n📊 CPM Dependency Graph & Critical Path Analysis'));
  console.log(chalk.dim('─'.repeat(60)));

  // Critical Path Summary
  if (criticalSet.size > 0) {
    console.log(`${chalk.bgRed.white.bold(' CRITICAL PATH ')}: ${Array.from(criticalSet).map((id) => chalk.red.bold(`#${id}`)).join(' ➔ ')}`);
  } else {
    console.log(chalk.green('✔ No critical path bottlenecks detected'));
  }

  console.log('\n' + chalk.bold('Nodes Summary:'));
  const table = new Table({
    head: [chalk.bold('Bug ID'), chalk.bold('Status'), chalk.bold('Priority'), chalk.bold('Critical?'), chalk.bold('Summary')],
    colWidths: [10, 15, 10, 12, 35],
  });

  for (const n of nodes) {
    const isCrit = criticalSet.has(String(n.id));
    table.push([
      chalk.bold(`#${n.id}`),
      n.status,
      n.priority,
      isCrit ? chalk.red.bold('YES [CRIT]') : chalk.gray('No'),
      n.summary.length > 32 ? n.summary.substring(0, 29) + '...' : n.summary,
    ]);
  }
  console.log(table.toString());

  if (edges && edges.length > 0) {
    console.log('\n' + chalk.bold('Dependency Edges (Blocker ➔ Blocked):'));
    for (const edge of edges) {
      const isCrit = edge.isCritical || (criticalSet.has(String(edge.source)) && criticalSet.has(String(edge.target)));
      const arrow = isCrit ? chalk.red.bold(' ═════[CRITICAL]════> ') : chalk.dim(' ───────> ');
      console.log(`  Bug #${edge.source}${arrow}Bug #${edge.target}`);
    }
  } else {
    console.log(chalk.dim('No dependency edges exist for this graph context.'));
  }
}
