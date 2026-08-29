import { describe, it, expect } from 'vitest';
import { POST as webhookPost } from '@/app/api/v1/webhooks/github/route';

describe('GitHub Webhook Integration', () => {
  it('should process GitHub push webhook and link commit', async () => {
    const payload = {
      repository: { full_name: 'mozilla/gecko-dev' },
      commits: [
        {
          id: 'c0ffeebabe1',
          message: 'Fixes #3 - improve IMAP header sync',
          author: { name: 'Alice Developer', email: 'alice@mozilla.com' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const req = new Request('http://localhost:3000/api/v1/webhooks/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push',
      },
      body: JSON.stringify(payload),
    });

    const res = await webhookPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.processed_bugs).toContain(3);
  });
});
