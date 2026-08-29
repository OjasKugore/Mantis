import { describe, it, expect } from 'vitest';
import { isValidTransition, validateResolution } from '@/lib/services/stateMachine';

describe('Bug Lifecycle State Machine', () => {
  it('should allow valid forward transitions', () => {
    expect(isValidTransition('UNCONFIRMED', 'CONFIRMED')).toBe(true);
    expect(isValidTransition('CONFIRMED', 'IN_PROGRESS')).toBe(true);
    expect(isValidTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
    expect(isValidTransition('RESOLVED', 'VERIFIED')).toBe(true);
    expect(isValidTransition('VERIFIED', 'CLOSED')).toBe(true);
  });

  it('should reject illegal state jumps', () => {
    expect(isValidTransition('UNCONFIRMED', 'VERIFIED')).toBe(false);
    expect(isValidTransition('UNCONFIRMED', 'CLOSED')).toBe(false);
  });

  it('should require resolution for terminal statuses (RESOLVED, VERIFIED, CLOSED)', () => {
    expect(validateResolution('RESOLVED', 'FIXED')).toBe(true);
    expect(validateResolution('RESOLVED', 'INVALID')).toBe(true);
    expect(validateResolution('RESOLVED', 'WONTFIX')).toBe(true);
    expect(validateResolution('RESOLVED', '')).toBe(false);
  });

  it('should require empty resolution for non-terminal statuses', () => {
    expect(validateResolution('IN_PROGRESS', '')).toBe(true);
    expect(validateResolution('IN_PROGRESS', 'FIXED')).toBe(false);
  });
});
