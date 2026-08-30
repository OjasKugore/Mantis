import { describe, it, expect } from 'vitest';
import { calculateCvss4, parseCvssVector } from '../src/cvss.js';

describe('CVSS v4.0 Engine', () => {
  it('should parse CVSS vector components correctly', () => {
    const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N';
    const parsed = parseCvssVector(vector);

    expect(parsed['AV']).toBe('N');
    expect(parsed['AC']).toBe('L');
    expect(parsed['VC']).toBe('H');
    expect(parsed['VI']).toBe('H');
    expect(parsed['VA']).toBe('H');
  });

  it('should calculate CRITICAL score for maximum impact vector', () => {
    const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N';
    const result = calculateCvss4(vector);

    expect(result.score).toBeGreaterThanOrEqual(9.0);
    expect(result.severity).toBe('CRITICAL');
  });

  it('should calculate LOW or MEDIUM score for local/low impact vector', () => {
    const vector = 'CVSS:4.0/AV:L/AC:H/AT:P/PR:H/UI:A/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N';
    const result = calculateCvss4(vector);

    expect(result.score).toBeLessThan(7.0);
    expect(['LOW', 'MEDIUM']).toContain(result.severity);
  });

  it('should handle zero impact vectors safely', () => {
    const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N';
    const result = calculateCvss4(vector);

    expect(result.score).toBe(0.0);
    expect(result.severity).toBe('NONE');
  });
});
