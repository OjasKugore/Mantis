import { describe, it, expect } from 'vitest';
import { GET as getFlags } from '@/app/api/v1/bugs/[id]/flags/route';

describe('Flags Integration', () => {
  it('should list flags for Bug #1', async () => {
    const req = new Request('http://localhost:3000/api/v1/bugs/1/flags');
    const res = await getFlags(req, { params: { id: '1' } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].type_name).toBeDefined();
    expect(data[0].status).toBe('?');
  });
});
