export interface GraphNode {
  id: number;
  estimatedTime: number;
  status: string;
}

export interface GraphEdge {
  blockingId: number;
  blockedId: number;
}

export function computeCPM(nodes: GraphNode[], edges: GraphEdge[]): number[] {
  if (nodes.length === 0 || edges.length === 0) return [];

  // 1. Build adjacency maps
  const outgoing = new Map<number, number[]>();
  const incoming = new Map<number, number[]>();
  for (const n of nodes) {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  }
  for (const e of edges) {
    outgoing.get(e.blockingId)?.push(e.blockedId);
    incoming.get(e.blockedId)?.push(e.blockingId);
  }

  // 2. Kahn's topological sort (cycles are rejected server-side before this runs)
  const inDegree = new Map(nodes.map(n => [n.id, (incoming.get(n.id) ?? []).length]));
  const queue = nodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
  const topoOrder: number[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    topoOrder.push(cur);
    for (const next of outgoing.get(cur) ?? []) {
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  // If isolated nodes or disconnected subgraphs exist, ensure all nodes are covered
  for (const n of nodes) {
    if (!topoOrder.includes(n.id)) topoOrder.push(n.id);
  }

  // 3. Dynamic Programming: Compute Earliest Finish Time (EFT) per node
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const eft = new Map<number, number>();
  for (const id of topoOrder) {
    const node = nodeMap.get(id)!;
    const duration = Number(node.estimatedTime) > 0 ? Number(node.estimatedTime) : 1;
    const maxPredEFT = Math.max(0, ...(incoming.get(id) ?? []).map(p => eft.get(p) ?? 0));
    eft.set(id, maxPredEFT + duration);
  }

  // 4. Backtrack from max-EFT sink node to find critical path chain
  const maxEFT = Math.max(...Array.from(eft.values()));
  const sinkEntries = Array.from(eft.entries()).filter(([, v]) => v === maxEFT);
  if (sinkEntries.length === 0) return [];

  let current = sinkEntries[0][0];
  const path: number[] = [current];
  while ((incoming.get(current) ?? []).length > 0) {
    const preds = incoming.get(current)!;
    const bestPred = preds.reduce((best, p) => ((eft.get(p) ?? 0) > (eft.get(best) ?? 0) ? p : best), preds[0]);
    path.unshift(bestPred);
    current = bestPred;
  }
  return path;
}
