import { describe, it, expect } from 'vitest';
import { POST as triagePost } from '@/app/api/v1/bugs/[id]/ai-triage/route';

describe('AI Triage Integration', () => {
  it('should synthesize root cause analysis and recommendations for Bug #1', async () => {
    const req = new Request('http://localhost:3000/api/v1/bugs/1/ai-triage', {
      method: 'POST',
    });
    const res = await triagePost(req, { params: { id: '1' } });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(data.suggested_priority).toBeDefined();
    expect(data.confidence_reason).toBeDefined();
    expect(Array.isArray(data.next_steps)).toBe(true);
    expect(['gemini-2.0-flash', 'local-heuristic-engine']).toContain(data.source);
  });
});
