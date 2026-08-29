/**
 * FIRST.org CVSS v4.0 Math Engine (CLI service)
 * Implements MacroVector computation (EQ1–EQ5) and score lookup.
 */

export interface CvssResult {
  score: number;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vector: string;
}

interface CvssMetrics {
  AV: string; AC: string; AT: string; PR: string; UI: string;
  VC: string; VI: string; VA: string;
  SC: string; SI: string; SA: string;
  E?: string;
  MSI?: string; MSA?: string;
  [key: string]: string | undefined;
}

const MANDATORY_METRICS = ['AV','AC','AT','PR','UI','VC','VI','VA','SC','SI','SA'] as const;

export function parseCvssVector(vector: string): CvssMetrics {
  if (!vector || !vector.startsWith('CVSS:4.0/')) {
    throw new Error('Invalid CVSS v4.0 vector: must start with "CVSS:4.0/"');
  }

  const parts = vector.replace('CVSS:4.0/', '').split('/');
  const metrics: Record<string, string> = {};

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) throw new Error(`Invalid metric component: "${part}"`);
    const key = part.substring(0, colonIdx);
    const val = part.substring(colonIdx + 1);
    metrics[key] = val;
  }

  for (const m of MANDATORY_METRICS) {
    if (!metrics[m]) {
      throw new Error(`Missing required CVSS v4.0 metric: ${m}`);
    }
  }

  return metrics as CvssMetrics;
}

function getEQ1(m: CvssMetrics): number {
  const AV = m.AV; const PR = m.PR; const UI = m.UI;
  if (AV === 'N' && PR === 'N' && UI === 'N') return 0;
  if ((AV === 'N' || PR === 'N' || UI === 'N') && !(AV === 'N' && PR === 'N' && UI === 'N') && AV !== 'P') return 1;
  return 2;
}

function getEQ2(m: CvssMetrics): number {
  const AC = m.AC; const AT = m.AT;
  if (AC === 'L' && AT === 'N') return 0;
  return 1;
}

function getEQ3(m: CvssMetrics): number {
  const VC = m.VC; const VI = m.VI; const VA = m.VA;
  if (VC === 'H' && VI === 'H') return 0;
  if (VC === 'H' || VI === 'H' || VA === 'H') return 1;
  return 2;
}

function getEQ4(m: CvssMetrics): number {
  const SC = m.SC; const SI = m.SI; const SA = m.SA;
  if (SC === 'H' && SI === 'H') return 0;
  if (SC === 'H' || SI === 'H' || SA === 'H') return 1;
  return 2;
}

function getEQ5(m: CvssMetrics): number {
  const E = m.E || 'A';
  if (E === 'U') return 2;
  if (E === 'P') return 1;
  return 0;
}

const MACRO_VECTOR_SCORES: Record<string, number> = {
  '00000': 10.0, '00001': 9.9,  '00010': 9.8,  '00011': 9.5,  '00020': 9.5,  '00021': 9.2,
  '00100': 9.7,  '00101': 9.4,  '00110': 9.3,  '00111': 8.9,  '00120': 8.8,  '00121': 8.2,
  '00200': 9.3,  '00201': 8.9,  '00210': 8.7,  '00211': 8.1,  '00220': 8.0,  '00221': 7.1,
  '01000': 9.3,  '01001': 9.0,  '01010': 8.8,  '01011': 8.3,  '01020': 8.1,  '01021': 7.4,
  '01100': 8.8,  '01101': 8.3,  '01110': 8.0,  '01111': 7.5,  '01120': 7.2,  '01121': 6.3,
  '01200': 8.1,  '01201': 7.5,  '01210': 7.2,  '01211': 6.5,  '01220': 6.2,  '01221': 5.1,
  '10000': 8.7,  '10001': 8.4,  '10010': 8.2,  '10011': 7.7,  '10020': 7.5,  '10021': 6.8,
  '10100': 8.1,  '10101': 7.6,  '10110': 7.4,  '10111': 6.8,  '10120': 6.6,  '10121': 5.7,
  '10200': 7.4,  '10201': 6.8,  '10210': 6.5,  '10211': 5.7,  '10220': 5.4,  '10221': 4.3,
  '20000': 6.9,  '20001': 6.4,  '20010': 6.1,  '20011': 5.3,  '20020': 5.1,  '20021': 4.1,
  '20100': 6.1,  '20101': 5.5,  '20110': 5.2,  '20111': 4.3,  '20120': 4.0,  '20121': 3.0,
  '20200': 5.2,  '20201': 4.5,  '20210': 4.1,  '20211': 3.2,  '20220': 3.0,  '20221': 1.8,
};

function scoreToSeverity(score: number): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score === 0.0) return 'NONE';
  if (score < 4.0)  return 'LOW';
  if (score < 7.0)  return 'MEDIUM';
  if (score < 9.0)  return 'HIGH';
  return 'CRITICAL';
}

export function computeCvss4(vector: string): CvssResult {
  const m = parseCvssVector(vector);
  const eq1 = getEQ1(m);
  const eq2 = getEQ2(m);
  const eq3 = getEQ3(m);
  const eq4 = getEQ4(m);
  const eq5 = getEQ5(m);

  const key = `${eq1}${eq2}${eq3}${eq4}${eq5}`;
  let rawScore = MACRO_VECTOR_SCORES[key];

  if (rawScore === undefined) {
    rawScore = MACRO_VECTOR_SCORES[`${eq1}${eq2}${eq3}${eq4}0`] ?? 5.0;
  }

  const score = Math.round(rawScore * 10) / 10;
  return { score, severity: scoreToSeverity(score), vector };
}
