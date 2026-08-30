import pc from 'picocolors';

export interface GraphNode {
  id: string | number;
  summary: string;
  status: string;
  priority?: string;
  is_critical?: boolean;
}

export interface GraphEdge {
  blocking_bug_id: number;
  blocked_bug_id: number;
  is_critical?: boolean;
}

export interface DependencyGraphData {
  bug: {
    id: number;
    summary: string;
    status: string;
    priority: string;
  };
  blocks: Array<{ id: number; summary: string; status: string; priority: string }>;
  depends_on: Array<{ id: number; summary: string; status: string; priority: string }>;
  critical_path?: number[];
}

export function renderAsciiGraph(data: DependencyGraphData): string {
  const lines: string[] = [];
  const rootId = data.bug.id;
  const isCritical = data.critical_path?.includes(rootId);

  lines.push(pc.bold(pc.cyan(`\n═══ Mantis Critical Path Dependency Tree (CPM) ═══`)));

  // Upstream blockers (Depends On)
  if (data.depends_on && data.depends_on.length > 0) {
    lines.push(pc.yellow(`\n▲ Upstream Blockers (Must be resolved first):`));
    data.depends_on.forEach((dep, i) => {
      const isLast = i === data.depends_on.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const depCrit = data.critical_path?.includes(dep.id);
      const critBadge = depCrit ? pc.bgRed(pc.white(pc.bold(' CRITICAL PATH '))) : '';
      lines.push(`  ${prefix}#${dep.id} [${dep.status}] ${dep.summary} ${critBadge}`);
    });
  } else {
    lines.push(pc.gray(`\n▲ Upstream Blockers: None (Ready for development)`));
  }

  // Root Node
  const rootCritBadge = isCritical ? pc.bgRed(pc.white(pc.bold(' CRITICAL PATH '))) : '';
  lines.push(`\n  ${pc.bold(pc.green('● TARGET BUG:'))} #${data.bug.id} [${data.bug.status}] ${pc.bold(data.bug.summary)} ${rootCritBadge}`);

  // Downstream dependants (Blocks)
  if (data.blocks && data.blocks.length > 0) {
    lines.push(pc.yellow(`\n▼ Downstream Impact (Blocked by this bug):`));
    data.blocks.forEach((blk, i) => {
      const isLast = i === data.blocks.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const blkCrit = data.critical_path?.includes(blk.id);
      const critBadge = blkCrit ? pc.bgRed(pc.white(pc.bold(' CRITICAL PATH '))) : '';
      lines.push(`  ${prefix}#${blk.id} [${blk.status}] ${blk.summary} ${critBadge}`);
    });
  } else {
    lines.push(pc.gray(`\n▼ Downstream Impact: None`));
  }

  lines.push('');
  return lines.join('\n');
}
