import { describe, it, expect } from 'vitest';
import { theme } from '../src/theme.js';

describe('Theme & Styling Module', () => {
  it('should format status badges', () => {
    expect(theme.status('CONFIRMED')).toContain('CONFIRMED');
    expect(theme.status('IN_PROGRESS')).toContain('IN_PROGRESS');
    expect(theme.status('RESOLVED')).toContain('RESOLVED');
  });

  it('should format priority badges', () => {
    expect(theme.priority('P1')).toContain('P1');
    expect(theme.priority('P2')).toContain('P2');
  });

  it('should render Mantis ASCII banner', () => {
    const banner = theme.banner();
    expect(banner).toContain('Stealthy monitoring, precise triage');
    expect(banner).toContain('v3.0');
  });
});
