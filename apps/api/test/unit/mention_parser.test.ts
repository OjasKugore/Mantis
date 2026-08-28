import { describe, it, expect } from 'vitest';
import { extractMentions } from '../../src/services/mentionParser.js';

describe('Unit: @Mention Parser', () => {
  it('extracts valid @usernames from text', () => {
    const text = 'Hello @alice and @bob_smith, please review this patch.';
    const mentions = extractMentions(text);
    expect(mentions).toEqual(['alice', 'bob_smith']);
  });

  it('ignores standard email addresses like user@example.com', () => {
    const text = 'Contact me at alice@example.com or ping @alice directly.';
    const mentions = extractMentions(text);
    expect(mentions).toEqual(['alice']);
  });

  it('deduplicates multiple mentions of the same username', () => {
    const text = '@alice check this out. @alice did you see it?';
    const mentions = extractMentions(text);
    expect(mentions).toEqual(['alice']);
  });

  it('returns empty array when no mentions are present', () => {
    expect(extractMentions('')).toEqual([]);
    expect(extractMentions('No mentions in this text.')).toEqual([]);
  });
});
