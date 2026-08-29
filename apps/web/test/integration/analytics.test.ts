import { describe, it, expect } from 'vitest';
import { GET as getBurndown } from '@/app/api/v1/analytics/burndown/route';
import { GET as getVelocity } from '@/app/api/v1/analytics/velocity/route';

describe('Analytics Integration', () => {
  it('should generate sprint burndown ideal and actual trajectory', async () => {
    const req = new Request('http://localhost:3000/api/v1/analytics/burndown?milestone=128.0');
    const res = await getBurndown(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.milestone).toBe('128.0');
    expect(data.trajectory).toBeDefined();
    expect(Array.isArray(data.trajectory)).toBe(true);
    expect(data.trajectory.length).toBe(15); // Day 0 to Day 14
    expect(data.trajectory[0].ideal).toBeGreaterThan(0);
  });

  it('should calculate sprint velocity across releases', async () => {
    const res = await getVelocity();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.sprints).toBeDefined();
    expect(Array.isArray(data.sprints)).toBe(true);
    expect(data.averageVelocity).toBeGreaterThan(0);
  });
});
