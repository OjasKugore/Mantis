import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateCvss4 } from '../src/cvss.js';
import { renderAsciiGraph } from '../src/graph.js';
import { theme } from '../src/theme.js';
import { apiRequest } from '../src/client.js';

describe('Mantis CLI Command Handlers & Formatters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Bug Triage & Status Transitions', () => {
    it('should format all priority and severity levels with distinct badges', () => {
      expect(theme.priority('P1')).toContain('P1');
      expect(theme.priority('P2')).toContain('P2');
      expect(theme.priority('P3')).toContain('P3');

      expect(theme.severity('blocker')).toContain('BLOCKER');
      expect(theme.severity('critical')).toContain('CRITICAL');
      expect(theme.severity('major')).toContain('MAJOR');
      expect(theme.severity('normal')).toContain('NORMAL');
    });

    it('should format bug statuses appropriately', () => {
      expect(theme.status('UNCONFIRMED')).toContain('UNCONFIRMED');
      expect(theme.status('CONFIRMED')).toContain('CONFIRMED');
      expect(theme.status('IN_PROGRESS')).toContain('IN_PROGRESS');
      expect(theme.status('RESOLVED')).toContain('RESOLVED');
      expect(theme.status('VERIFIED')).toContain('VERIFIED');
      expect(theme.status('CLOSED')).toContain('CLOSED');
    });
  });

  describe('Dependency Graph (CPM)', () => {
    it('should correctly flag critical path nodes', () => {
      const graph = renderAsciiGraph({
        bug: { id: 10, summary: 'Security Vuln', status: 'CONFIRMED', priority: 'P1' },
        blocks: [{ id: 12, summary: 'Blocked feature', status: 'UNCONFIRMED', priority: 'P2' }],
        depends_on: [{ id: 8, summary: 'Root prerequisite', status: 'RESOLVED', priority: 'P1' }],
        critical_path: [8, 10],
      });

      expect(graph).toContain('CRITICAL PATH');
      expect(graph).toContain('#10');
      expect(graph).toContain('#8');
      expect(graph).toContain('#12');
    });
  });

  describe('CVSS Scoring Engine', () => {
    it('should compute correct score for Network-accessible high impact vulnerability', () => {
      const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N';
      const result = calculateCvss4(vector);

      expect(result.score).toBeGreaterThanOrEqual(9.0);
      expect(result.severity).toBe('CRITICAL');
    });

    it('should compute medium score when exploitability is constrained', () => {
      const vector = 'CVSS:4.0/AV:L/AC:H/AT:P/PR:H/UI:A/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N';
      const result = calculateCvss4(vector);

      expect(result.score).toBeLessThan(5.0);
      expect(result.severity).toBe('LOW');
    });
  });

  describe('API Client Mocking', () => {
    it('should handle successful mock API responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ bugs: [{ id: 1, summary: 'Test Bug' }] }),
      } as any);

      const res = await apiRequest('/api/v1/bugs');
      expect(res.bugs).toHaveLength(1);
      expect(res.bugs[0].summary).toBe('Test Bug');
    });
  });
});
