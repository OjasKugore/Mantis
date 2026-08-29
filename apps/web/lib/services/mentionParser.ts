// Matches @username (alphanumeric, dots, hyphens) but ignores email addresses and trailing punctuation
const MENTION_RE = /(?<![.\w@])@([\w][\w.-]{0,62})/g;

export function extractMentions(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const regex = new RegExp(MENTION_RE);
  while ((m = regex.exec(text)) !== null) {
    // Strip trailing punctuation like . , ; : ! ?
    const cleanUsername = m[1].replace(/[.,;:!?]+$/, '');
    if (cleanUsername) {
      found.add(cleanUsername);
    }
  }
  return Array.from(found);
}
