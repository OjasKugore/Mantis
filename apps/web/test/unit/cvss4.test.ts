import { describe, it, expect } from 'vitest';
import { computeCvss4, parseCvssVector } from '@/lib/services/cvss4';

describe('CVSS v4.0 Calculation Engine', () => {
  it('should correctly parse mandatory CVSS v4.0 vector components', () => {
    const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N';
    const metrics = parseCvssVector(vector);
    expect(metrics.AV).toBe('N');
    expect(metrics.AC).toBe('L');
    expect(metrics.AT).toBe('N');
    expect(metrics.PR).toBe('N');
    expect(metrics.UI).toBe('N');
    expect(metrics.VC).toBe('H');
  });

  it('should compute CRITICAL score (>= 9.0) for unauthenticated remote vulnerability', () => {
    const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N';
    const res = computeCvss4(vector);
    expect(res.score).toBeGreaterThanOrEqual(9.0);
    expect(res.severity).toBe('CRITICAL');
  });

  it('should compute HIGH severity score for high impact with low privileges', () => {
    const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N';
    const res = computeCvss4(vector);
    expect(res.score).toBeGreaterThanOrEqual(7.0);
    expect(res.score).toBeLessThanOrEqual(9.5);
    expect(['HIGH', 'CRITICAL']).toContain(res.severity);
  });

  it('should compute MEDIUM/LOW severity for local restricted flaws', () => {
    const vector = 'CVSS:4.0/AV:L/AC:H/AT:P/PR:H/UI:A/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N';
    const res = computeCvss4(vector);
    expect(res.score).toBeLessThan(7.0);
    expect(['LOW', 'MEDIUM']).toContain(res.severity);
  });

  it('should throw descriptive error on invalid vector string', () => {
    expect(() => computeCvss4('INVALID_VECTOR')).toThrow();
  });
});
