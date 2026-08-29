/**
 * Parses commit messages or PR titles/bodies for bug references like:
 * - "fixes #123"
 * - "closes #456"
 * - "resolves #789"
 *
 * Returns an array of unique numeric bug IDs.
 */
export function parseBugRefs(text: string): number[] {
  if (!text) return [];

  const pattern = /(?:fixes|closes|resolves|bug)\s+#?(\d+)/gi;
  const ids: number[] = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const id = parseInt(match[1], 10);
    if (!isNaN(id) && id > 0) {
      ids.push(id);
    }
  }

  return Array.from(new Set(ids));
}
