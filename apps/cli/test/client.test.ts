import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest, CliApiError } from '../src/client.js';
import { config } from '../src/config.js';

describe('CLI API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should format URL and attach custom cookies', async () => {
    config.save({ apiUrl: 'http://localhost:3000', sessionId: 'test-session-123' });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true }),
    } as any);

    const res = await apiRequest('/api/v1/auth/me');
    expect(res).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: expect.stringContaining('sessionId=test-session-123'),
        }),
      })
    );
  });

  it('should throw CliApiError on 4xx/5xx responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: async () => ({ message: 'Unauthorized session' }),
    } as any);

    await expect(apiRequest('/api/v1/auth/me')).rejects.toThrow('Unauthorized session');
  });
});
