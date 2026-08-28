export type BugStatus =
  | 'UNCONFIRMED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'VERIFIED'
  | 'CLOSED';

export type BugResolution =
  | ''
  | 'FIXED'
  | 'INVALID'
  | 'WONTFIX'
  | 'DUPLICATE'
  | 'WORKSFORME'
  | 'INCOMPLETE';

export const VALID_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  UNCONFIRMED: ['CONFIRMED', 'RESOLVED'],
  CONFIRMED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED', 'CONFIRMED'], // CONFIRMED = reopen
  RESOLVED: ['VERIFIED', 'CONFIRMED'],
  VERIFIED: ['CLOSED', 'CONFIRMED'],
  CLOSED: [],
};

export const VALID_RESOLUTIONS: BugResolution[] = [
  '',
  'FIXED',
  'INVALID',
  'WONTFIX',
  'DUPLICATE',
  'WORKSFORME',
  'INCOMPLETE',
];

export function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from as BugStatus];
  if (!allowed) return false;
  return allowed.includes(to as BugStatus);
}

export function validateResolution(status: string, resolution: string): boolean {
  if (!VALID_RESOLUTIONS.includes(resolution as BugResolution)) {
    return false;
  }

  // When moving to RESOLVED, a non-empty resolution is required
  if (status === 'RESOLVED') {
    return resolution !== '';
  }

  // When reopening or in active statuses, resolution must be cleared (empty string)
  if (['UNCONFIRMED', 'CONFIRMED', 'IN_PROGRESS', 'VERIFIED'].includes(status)) {
    return resolution === '';
  }

  // When CLOSED, resolution must match whatever was set in RESOLVED (non-empty)
  if (status === 'CLOSED') {
    return resolution !== '';
  }

  return true;
}
