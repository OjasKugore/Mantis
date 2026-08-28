import { describe, it, expect } from 'vitest';
import { isValidTransition, validateResolution } from '../../src/services/stateMachine.js';

describe('Unit: State Machine Transitions & Resolution Rules (T1.10 - T1.12)', () => {
  it('T1.10 — All 6 valid transitions return true', () => {
    const valid = [
      ['UNCONFIRMED', 'CONFIRMED'],
      ['CONFIRMED', 'IN_PROGRESS'],
      ['IN_PROGRESS', 'RESOLVED'],
      ['RESOLVED', 'VERIFIED'],
      ['VERIFIED', 'CLOSED'],
      ['RESOLVED', 'CONFIRMED'], // reopen
    ];

    for (const [from, to] of valid) {
      expect(isValidTransition(from, to)).toBe(true);
    }
  });

  it('T1.11 — All invalid transitions return false', () => {
    const invalid = [
      ['UNCONFIRMED', 'CLOSED'],
      ['CLOSED', 'CONFIRMED'],
      ['VERIFIED', 'IN_PROGRESS'],
      ['UNCONFIRMED', 'VERIFIED'],
    ];

    for (const [from, to] of invalid) {
      expect(isValidTransition(from, to)).toBe(false);
    }
  });

  it('T1.12 — Resolution validation: RESOLVED requires non-empty; reopened must clear', () => {
    expect(validateResolution('RESOLVED', '')).toBe(false);
    expect(validateResolution('RESOLVED', 'FIXED')).toBe(true);
    expect(validateResolution('RESOLVED', 'INVALID')).toBe(true);
    expect(validateResolution('RESOLVED', 'WONTFIX')).toBe(true);
    expect(validateResolution('CONFIRMED', '')).toBe(true);
    expect(validateResolution('CONFIRMED', 'FIXED')).toBe(false);
    expect(validateResolution('IN_PROGRESS', '')).toBe(true);
    expect(validateResolution('IN_PROGRESS', 'DUPLICATE')).toBe(false);
  });
});
