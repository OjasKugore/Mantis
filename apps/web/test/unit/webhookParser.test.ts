import { describe, it, expect } from 'vitest';
import { parseBugRefs } from '@/lib/services/webhookParser';

describe('GitHub SCM Commit Message Bug Ref Parser', () => {
  it('should parse standard "Fixes #123" patterns', () => {
    expect(parseBugRefs('Fixes #42 - resolve memory leak in layout engine')).toEqual([42]);
    expect(parseBugRefs('closes #101')).toEqual([101]);
    expect(parseBugRefs('resolves #77')).toEqual([77]);
    expect(parseBugRefs('Bug 1: Refactor HTTP/3 timeout handler')).toEqual([1]);
  });

  it('should parse multiple bug references in a single message', () => {
    const msg = 'Fixes #10 and closes #25 in single commit';
    const refs = parseBugRefs(msg);
    expect(refs).toContain(10);
    expect(refs).toContain(25);
    expect(refs.length).toBe(2);
  });

  it('should return empty array when no bug references exist', () => {
    expect(parseBugRefs('Refactor clean up styles and remove dead code')).toEqual([]);
  });
});
