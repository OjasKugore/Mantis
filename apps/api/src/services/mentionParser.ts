// Matches @username (alphanumeric, dots, hyphens) but ignores email addresses
const MENTION_RE = /(?<![.\w@])@([\w][\w.-]{0,62})/g;

export function extractMentions(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  // Reset regex state
  const regex = new RegExp(MENTION_RE);
  while ((m = regex.exec(text)) !== null) {
    found.add(m[1]);
  }
  return [...found];
}
