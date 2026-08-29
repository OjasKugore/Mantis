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

export const ALLOWED_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  UNCONFIRMED: ['CONFIRMED', 'IN_PROGRESS', 'RESOLVED'],
  CONFIRMED: ['IN_PROGRESS', 'RESOLVED', 'UNCONFIRMED'],
  IN_PROGRESS: ['CONFIRMED', 'RESOLVED'],
  RESOLVED: ['VERIFIED', 'CLOSED', 'UNCONFIRMED', 'CONFIRMED'],
  VERIFIED: ['CLOSED', 'UNCONFIRMED', 'CONFIRMED', 'RESOLVED'],
  CLOSED: ['UNCONFIRMED', 'CONFIRMED'],
};

export const TERMINAL_STATUSES: BugStatus[] = ['RESOLVED', 'VERIFIED', 'CLOSED'];

export const VALID_RESOLUTIONS: BugResolution[] = [
  'FIXED',
  'INVALID',
  'WONTFIX',
  'DUPLICATE',
  'WORKSFORME',
  'INCOMPLETE',
];

export function isValidTransition(from: BugStatus, to: BugStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateResolution(status: BugStatus, resolution: string): boolean {
  if (TERMINAL_STATUSES.includes(status)) {
    return VALID_RESOLUTIONS.includes(resolution as BugResolution);
  }
  return resolution === '';
}
