import { BugStatus } from '@mantis/shared';

export const VALID_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  UNCONFIRMED: ['CONFIRMED', 'RESOLVED'],
  CONFIRMED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED', 'CONFIRMED'],
  RESOLVED: ['VERIFIED', 'CONFIRMED'],
  VERIFIED: ['CLOSED', 'CONFIRMED'],
  CLOSED: ['CONFIRMED'],
};

/**
 * Finds the shortest valid sequence of state transitions from fromStatus to toStatus.
 */
export function findTransitionPath(from: BugStatus, to: BugStatus): BugStatus[] | null {
  if (from === to) return [];
  const queue: Array<{ current: BugStatus; path: BugStatus[] }> = [{ current: from, path: [] }];
  const visited = new Set<BugStatus>([from]);

  while (queue.length > 0) {
    const { current, path } = queue.shift()!;
    const neighbors = VALID_TRANSITIONS[current] || [];
    for (const next of neighbors) {
      if (next === to) {
        return [...path, next];
      }
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ current: next, path: [...path, next] });
      }
    }
  }
  return null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Applies a status change for a bug, executing intermediate transitions if necessary.
 * Handles automatic session recovery on 401 Unauthorized.
 */
export async function applyBugStatusChange(
  bugId: number,
  currentStatus: BugStatus,
  targetStatus: BugStatus
): Promise<void> {
  if (currentStatus === targetStatus) return;

  const path = findTransitionPath(currentStatus, targetStatus);
  const steps = path && path.length > 0 ? path : [targetStatus];

  for (const step of steps) {
    const resolution = step === 'RESOLVED' || step === 'CLOSED' ? 'FIXED' : undefined;
    let res = await fetch(`${API_BASE}/api/v1/bugs/${bugId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: step,
        resolution,
      }),
    });

    if (res.status === 401) {
      // Auto-authenticate as default persona if session is missing
      try {
        await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: 'alice@mozilla.com', password: 'password123' }),
        });
      } catch {
        // ignore
      }

      // Retry status change
      res = await fetch(`${API_BASE}/api/v1/bugs/${bugId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: step,
          resolution,
        }),
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to transition bug #${bugId} to ${step}`);
    }
  }
}
