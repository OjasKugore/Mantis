import { describe, it, expect } from 'vitest';
import { extractMentions } from '@/lib/services/mentionParser';

describe('Comment Mention Parser', () => {
  it('should extract single and multiple @mentions from markdown text', () => {
    const text = 'Hey @alice_dev and @bob_qa, please review this patch.';
    const mentions = extractMentions(text);
    expect(mentions).toContain('alice_dev');
    expect(mentions).toContain('bob_qa');
    expect(mentions.length).toBe(2);
  });

  it('should deduplicate repeated mentions', () => {
    const text = 'Pinging @carol_sec again. @carol_sec please take a look!';
    const mentions = extractMentions(text);
    expect(mentions).toEqual(['carol_sec']);
  });

  it('should ignore email addresses', () => {
    const text = 'Send questions to support@mozilla.com or ping @dave_eng.';
    const mentions = extractMentions(text);
    expect(mentions).toEqual(['dave_eng']);
  });
});
