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
  bug?: {
    id: number;
    summary: string;
    status: string;
    priority: string;
  };
  blocks?: Array<{ id: number; summary: string; status: string; priority: string }>;
  depends_on?: Array<{ id: number; summary: string; status: string; priority: string }>;
  critical_path?: number[];
  nodes?: Array<{ id: number; summary: string; status: string; priority?: string }>;
  edges?: Array<{ blockingId?: number; blockedId?: number; blocking_bug_id?: number; blocked_bug_id?: number }>;
  criticalPathIds?: number[];
}

export function renderAsciiGraph(data: DependencyGraphData, targetBugId?: number): string {
  const lines: string[] = [];

  // Normalize data
  let targetNode: { id: number; summary: string; status: string; priority?: string } | undefined;
  let upstream: Array<{ id: number; summary: string; status: string; priority?: string }> = [];
  let downstream: Array<{ id: number; summary: string; status: string; priority?: string }> = [];
  const criticalPath: number[] = data.criticalPathIds || data.critical_path || [];

  if (data.nodes && Array.isArray(data.nodes)) {
    const nodeMap = new Map<number, any>(data.nodes.map((n) => [Number(n.id), n]));
    const rootId = targetBugId || (data.nodes.length > 0 ? Number(data.nodes[0].id) : 1);
    targetNode = nodeMap.get(rootId) || data.nodes[0];

    const edges = data.edges || [];
    if (targetNode) {
      for (const e of edges) {
        const u = Number(e.blockingId || e.blocking_bug_id);
        const v = Number(e.blockedId || e.blocked_bug_id);
        if (v === targetNode.id && nodeMap.has(u)) {
          upstream.push(nodeMap.get(u)!);
        }
        if (u === targetNode.id && nodeMap.has(v)) {
          downstream.push(nodeMap.get(v)!);
        }
      }
    }
  } else if (data.bug) {
    targetNode = data.bug;
    upstream = data.depends_on || [];
    downstream = data.blocks || [];
  }

  if (!targetNode) {
    return pc.yellow('\nNo dependency nodes found for this bug.\n');
  }

  const rootId = targetNode.id;
  const isCritical = criticalPath.includes(rootId);

  lines.push(pc.bold(pc.cyan(`\n═══ Mantis Critical Path Dependency Tree (CPM) ═══`)));

  // Upstream blockers (Depends On)
  if (upstream.length > 0) {
    lines.push(pc.yellow(`\n▲ Upstream Blockers (Must be resolved first):`));
    upstream.forEach((dep, i) => {
      const isLast = i === upstream.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const depCrit = criticalPath.includes(dep.id);
      const critBadge = depCrit ? pc.bgRed(pc.white(pc.bold(' CRITICAL PATH '))) : '';
      lines.push(`  ${prefix}#${dep.id} [${dep.status}] ${dep.summary} ${critBadge}`);
    });
  } else {
    lines.push(pc.gray(`\n▲ Upstream Blockers: None (Ready for development)`));
  }

  // Root Node
  const rootCritBadge = isCritical ? pc.bgRed(pc.white(pc.bold(' CRITICAL PATH '))) : '';
  lines.push(`\n  ${pc.bold(pc.green('● TARGET BUG:'))} #${targetNode.id} [${targetNode.status}] ${pc.bold(targetNode.summary)} ${rootCritBadge}`);

  // Downstream dependants (Blocks)
  if (downstream.length > 0) {
    lines.push(pc.yellow(`\n▼ Downstream Impact (Blocked by this bug):`));
    downstream.forEach((blk, i) => {
      const isLast = i === downstream.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const blkCrit = criticalPath.includes(blk.id);
      const critBadge = blkCrit ? pc.bgRed(pc.white(pc.bold(' CRITICAL PATH '))) : '';
      lines.push(`  ${prefix}#${blk.id} [${blk.status}] ${blk.summary} ${critBadge}`);
    });
  } else {
    lines.push(pc.gray(`\n▼ Downstream Impact: None`));
  }

  lines.push('');
  return lines.join('\n');
}
