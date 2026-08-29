import { describe, it, expect } from 'vitest';
import { GET as getGraph } from '@/app/api/v1/bugs/[id]/graph/route';

describe('Dependencies DAG Integration', () => {
  it('should fetch DAG graph data and critical path for Bug #1', async () => {
    const req = new Request('http://localhost:3000/api/v1/bugs/1/graph');
    const res = await getGraph(req, { params: { id: '1' } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.nodes).toBeDefined();
    expect(data.edges).toBeDefined();
    expect(data.criticalPathIds).toBeDefined();
    expect(Array.isArray(data.criticalPathIds)).toBe(true);
    expect(data.criticalPathIds.length).toBeGreaterThan(0);
  });
});
