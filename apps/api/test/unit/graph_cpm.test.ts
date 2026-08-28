import { describe, it, expect } from 'vitest';
import { computeCPM } from '../../src/services/cpm.js';

describe('Unit: Critical Path Method (CPM) Algorithm (T2.1 - T2.5)', () => {
  it('T2.1 — Two-path DAG identifies correct critical path (7h path vs 4h path)', () => {
    // Path A: 101(2h) -> 102(4h) -> 104(1h) = 7h (Critical)
    // Path B: 101(2h) -> 103(1h) -> 104(1h) = 4h
    const nodes = [
      { id: 101, estimatedTime: 2, status: 'IN_PROGRESS' },
      { id: 102, estimatedTime: 4, status: 'IN_PROGRESS' },
      { id: 103, estimatedTime: 1, status: 'IN_PROGRESS' },
      { id: 104, estimatedTime: 1, status: 'IN_PROGRESS' },
    ];
    const edges = [
      { blockingId: 101, blockedId: 102 },
      { blockingId: 101, blockedId: 103 },
      { blockingId: 102, blockedId: 104 },
      { blockingId: 103, blockedId: 104 },
    ];

    expect(computeCPM(nodes, edges)).toEqual([101, 102, 104]);
  });

  it('T2.2 — Single-node graph returns that node without crash', () => {
    expect(computeCPM([{ id: 101, estimatedTime: 3, status: 'CONFIRMED' }], [])).toEqual([101]);
  });

  it('T2.3 — Disconnected nodes (no edges) returns node with highest estimated time', () => {
    const nodes = [
      { id: 101, estimatedTime: 1, status: 'CONFIRMED' },
      { id: 102, estimatedTime: 5, status: 'CONFIRMED' },
    ];
    expect(computeCPM(nodes, [])).toEqual([102]);
  });

  it('T2.4 — Diamond DAG with multiple parallel paths computes longest path', () => {
    const nodes = [
      { id: 1, estimatedTime: 3, status: 'CONFIRMED' },
      { id: 2, estimatedTime: 2, status: 'CONFIRMED' },
      { id: 3, estimatedTime: 6, status: 'CONFIRMED' },
      { id: 4, estimatedTime: 2, status: 'CONFIRMED' },
    ];
    const edges = [
      { blockingId: 1, blockedId: 2 },
      { blockingId: 1, blockedId: 3 },
      { blockingId: 2, blockedId: 4 },
      { blockingId: 3, blockedId: 4 },
    ];
    expect(computeCPM(nodes, edges)).toEqual([1, 3, 4]); // 3 + 6 + 2 = 11h
  });

  it('T2.5 — Zero estimated time / empty graph handles edge cases safely', () => {
    expect(computeCPM([], [])).toEqual([]);
    const zeroNode = [{ id: 99, estimatedTime: 0, status: 'UNCONFIRMED' }];
    expect(computeCPM(zeroNode, [])).toEqual([99]);
  });
});
