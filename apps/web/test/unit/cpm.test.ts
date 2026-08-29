import { describe, it, expect } from 'vitest';
import { computeCPM } from '@/lib/services/cpm';

describe('Critical Path Method (CPM) DAG Calculation Engine', () => {
  it('should return the single node for a 1-node graph', () => {
    const nodes = [{ id: 1, estimatedTime: 4, status: 'CONFIRMED' }];
    const edges: any[] = [];
    const criticalPath = computeCPM(nodes, edges);
    expect(criticalPath).toEqual([1]);
  });

  it('should compute the longest dependency path in a linear chain', () => {
    const nodes = [
      { id: 1, estimatedTime: 2, status: 'CONFIRMED' },
      { id: 2, estimatedTime: 4, status: 'CONFIRMED' },
      { id: 3, estimatedTime: 3, status: 'CONFIRMED' },
    ];
    const edges = [
      { blockingId: 1, blockedId: 2 },
      { blockingId: 2, blockedId: 3 },
    ];
    const criticalPath = computeCPM(nodes, edges);
    expect(criticalPath).toEqual([1, 2, 3]);
  });

  it('should select the bottleneck branch when multiple parallel paths exist', () => {
    const nodes = [
      { id: 1, estimatedTime: 1, status: 'CONFIRMED' },
      { id: 2, estimatedTime: 8, status: 'CONFIRMED' }, // Longer path (1 -> 2 -> 4 = 14h)
      { id: 3, estimatedTime: 2, status: 'CONFIRMED' }, // Shorter path (1 -> 3 -> 4 = 8h)
      { id: 4, estimatedTime: 5, status: 'CONFIRMED' },
    ];
    const edges = [
      { blockingId: 1, blockedId: 2 },
      { blockingId: 1, blockedId: 3 },
      { blockingId: 2, blockedId: 4 },
      { blockingId: 3, blockedId: 4 },
    ];
    const criticalPath = computeCPM(nodes, edges);
    expect(criticalPath).toEqual([1, 2, 4]);
  });
});
