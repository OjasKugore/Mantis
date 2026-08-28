import { describe, it, expect } from 'vitest';
import { computeCvss4, parseCvssVector } from '../../src/services/cvss4.js';

// FIRST.org CVSS v4.0 benchmark vectors

describe('CVSS v4.0 Math Engine', () => {
  // T2.12 – 10.0 CRITICAL: Network vector with Safety impact (SI:S triggers EQ4=0)
  it('T2.12: computes FIRST.org benchmark vector 1 as 10.0 CRITICAL', () => {
    const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:S/SA:H';
    const result = computeCvss4(vector);
    expect(result.score).toBe(10.0);
    expect(result.severity).toBe('CRITICAL');
  });

  // T2.13 – LOW severity: AV:P/AC:H/AT:P, no meaningful impact, E:U → key 21222 → 2.5
  it('T2.13: computes a low-severity vector correctly', () => {
    const vector = 'CVSS:4.0/AV:P/AC:H/AT:P/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N/E:U';
    const result = computeCvss4(vector);
    expect(result.score).toBeLessThan(4.0);
    expect(result.severity).toBe('LOW');
  });

  // T2.14 – HIGH severity: Network exploit, high VC/VI/VA, low SC/SI/SA
  it('T2.14: computes a high-severity vector correctly', () => {
    const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:L/SI:L/SA:L';
    const result = computeCvss4(vector);
    expect(result.score).toBeGreaterThanOrEqual(8.0);
    expect(['HIGH', 'CRITICAL']).toContain(result.severity);
  });

  // T2.15 – Invalid vector string throws descriptive error
  it('T2.15: invalid CVSS vector string throws descriptive validation error', () => {
    expect(() => computeCvss4('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')).toThrow(
      /Invalid CVSS v4\.0 vector/
    );
    expect(() => computeCvss4('not-a-vector')).toThrow(/Invalid CVSS v4\.0 vector/);
    expect(() => computeCvss4('')).toThrow(/Invalid CVSS v4\.0 vector/);
  });

  // T2.16 – Missing required metric component throws descriptive error
  it('T2.16: missing required metric component throws descriptive error', () => {
    // Missing VA metric
    const incompleteVector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/SC:H/SI:H/SA:H';
    expect(() => parseCvssVector(incompleteVector)).toThrow(/Missing required CVSS v4\.0 metric: VA/);
  });
});
