import { describe, it, expect } from 'vitest';
import { renderAsciiGraph, DependencyGraphData } from '../src/graph.js';

describe('Dependency & CPM Graph Renderer', () => {
  it('should render ASCII CPM tree with upstream and downstream nodes', () => {
    const mockData: DependencyGraphData = {
      bug: {
        id: 101,
        summary: 'Core WebSocket Crash',
        status: 'IN_PROGRESS',
        priority: 'P1',
      },
      blocks: [
        { id: 102, summary: 'Live notification sync fails', status: 'CONFIRMED', priority: 'P2' },
      ],
      depends_on: [
        { id: 100, summary: 'TLS certificate renegotiation bug', status: 'CONFIRMED', priority: 'P1' },
      ],
      critical_path: [100, 101, 102],
    };

    const output = renderAsciiGraph(mockData);

    expect(output).toContain('Mantis Critical Path Dependency Tree (CPM)');
    expect(output).toContain('#101');
    expect(output).toContain('#100');
    expect(output).toContain('#102');
    expect(output).toContain('CRITICAL PATH');
  });

  it('should render cleanly with no upstream blockers', () => {
    const mockData: DependencyGraphData = {
      bug: {
        id: 1,
        summary: 'Root Task',
        status: 'CONFIRMED',
        priority: 'P3',
      },
      blocks: [],
      depends_on: [],
    };

    const output = renderAsciiGraph(mockData);
    expect(output).toContain('None (Ready for development)');
  });
});
