import { describe, it, expect } from 'vitest';
import { GET as getBugs } from '@/app/api/v1/bugs/route';
import { GET as getBugDetail } from '@/app/api/v1/bugs/[id]/route';

describe('Bugs Route Handlers Integration', () => {
  it('should list seed bugs with pagination', async () => {
    const req = new Request('http://localhost:3000/api/v1/bugs?limit=10&page=1');
    const res = await getBugs(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.bugs).toBeDefined();
    expect(Array.isArray(data.bugs)).toBe(true);
    expect(data.bugs.length).toBeGreaterThan(0);
    expect(data.total).toBeGreaterThan(0);
  });

  it('should filter bugs by priority', async () => {
    const req = new Request('http://localhost:3000/api/v1/bugs?priority=P1');
    const res = await getBugs(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    for (const b of data.bugs) {
      expect(b.priority).toBe('P1');
    }
  });

  it('should fetch bug #1 detail with activity and metadata', async () => {
    const req = new Request('http://localhost:3000/api/v1/bugs/1');
    const res = await getBugDetail(req, { params: { id: '1' } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.id).toBe(1);
    expect(data.summary).toBeDefined();
    expect(data.product_name).toBeDefined();
    expect(data.component_name).toBeDefined();
  });
});
