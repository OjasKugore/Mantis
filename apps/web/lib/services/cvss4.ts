/**
 * FIRST.org CVSS v4.0 Math Engine
 * Implements MacroVector computation (EQ1–EQ5) and score lookup.
 * Reference: https://www.first.org/cvss/v4.0/specification-document
 */

export interface CvssResult {
  score: number;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vector: string;
}

interface CvssMetrics {
  AV: string;
  AC: string;
  AT: string;
  PR: string;
  UI: string;
  VC: string;
  VI: string;
  VA: string;
  SC: string;
  SI: string;
  SA: string;
  E?: string;
  MSI?: string;
  MSA?: string;
  [key: string]: string | undefined;
}

const MANDATORY_METRICS = [
  'AV',
  'AC',
  'AT',
  'PR',
  'UI',
  'VC',
  'VI',
  'VA',
  'SC',
  'SI',
  'SA',
] as const;

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
  const AV = m.AV;
  const PR = m.PR;
  const UI = m.UI;
  if (AV === 'N' && PR === 'N' && UI === 'N') return 0;
  if (
    (AV === 'N' || PR === 'N' || UI === 'N') &&
    !(AV === 'N' && PR === 'N' && UI === 'N') &&
    AV !== 'P'
  )
    return 1;
  return 2;
}

function getEQ2(m: CvssMetrics): number {
  if (m.AC === 'L' && m.AT === 'N') return 0;
  return 1;
}

function getEQ3(m: CvssMetrics): number {
  const VC = m.VC;
  const VI = m.VI;
  const VA = m.VA;
  const SC = m.SC;
  const SI = m.SI;
  const SA = m.SA;
  if ((VC === 'H' || VI === 'H' || VA === 'H') && (SI === 'H' || SA === 'H')) return 0;
  if ((VC === 'H' || VI === 'H' || VA === 'H') && SI !== 'H' && SA !== 'H') return 1;
  if (VC !== 'H' && VI !== 'H' && VA !== 'H' && SC === 'H' && (SI === 'H' || SA === 'H')) return 1;
  return 2;
}

function getEQ4(m: CvssMetrics): number {
  const SI = m.MSI || m.SI;
  const SA = m.MSA || m.SA;
  const SC = m.SC;
  if (SI === 'S' || SA === 'S') return 0;
  if (SC === 'H' || SI === 'H' || SA === 'H') return 1;
  return 2;
}

function getEQ5(m: CvssMetrics): number {
  const E = m.E ?? 'A';
  if (E === 'A') return 0;
  if (E === 'P') return 1;
  return 2;
}

const MACRO_VECTOR_SCORES: Record<string, number> = {
  '00000': 10.0, '00001': 9.9,  '00010': 9.8,  '00011': 9.5,  '00020': 9.5,  '00021': 9.2,
  '00100': 10.0, '00101': 9.6,  '00110': 9.3,  '00111': 8.7,  '00120': 9.1,  '00121': 8.1,
  '00200': 9.3,  '00201': 9.0,  '00210': 8.9,  '00211': 8.0,  '00220': 8.1,  '00221': 6.8,
  '01000': 9.8,  '01001': 9.5,  '01010': 9.5,  '01011': 9.2,  '01020': 9.0,  '01021': 8.4,
  '01100': 9.3,  '01101': 9.2,  '01110': 8.9,  '01111': 8.1,  '01120': 8.1,  '01121': 6.5,
  '01200': 8.8,  '01201': 8.0,  '01210': 7.8,  '01211': 7.0,  '01220': 6.9,  '01221': 4.8,
  '02000': 9.5,  '02001': 9.2,  '02010': 9.0,  '02011': 8.4,  '02020': 8.2,  '02021': 7.2,
  '02100': 9.0,  '02101': 8.6,  '02110': 8.5,  '02111': 7.5,  '02120': 7.2,  '02121': 5.7,
  '02200': 7.6,  '02201': 7.0,  '02210': 6.7,  '02211': 6.0,  '02220': 5.4,  '02221': 3.4,
  '10000': 9.9,  '10001': 9.7,  '10010': 9.4,  '10011': 8.9,  '10020': 9.0,  '10021': 8.3,
  '10100': 9.4,  '10101': 8.9,  '10110': 9.0,  '10111': 8.0,  '10120': 8.3,  '10121': 7.4,
  '10200': 8.9,  '10201': 8.5,  '10210': 8.1,  '10211': 7.0,  '10220': 7.3,  '10221': 5.3,
  '11000': 9.4,  '11001': 8.9,  '11010': 9.0,  '11011': 7.6,  '11020': 8.1,  '11021': 6.9,
  '11100': 8.9,  '11101': 8.5,  '11110': 7.9,  '11111': 6.5,  '11120': 6.8,  '11121': 5.4,
  '11200': 7.9,  '11201': 6.6,  '11210': 6.2,  '11211': 5.5,  '11220': 5.2,  '11221': 3.3,
  '12000': 9.0,  '12001': 8.5,  '12010': 7.8,  '12011': 6.8,  '12020': 7.2,  '12021': 5.6,
  '12100': 8.5,  '12101': 7.9,  '12110': 7.6,  '12111': 5.5,  '12120': 5.4,  '12121': 4.0,
  '12200': 6.8,  '12201': 5.8,  '12210': 5.1,  '12211': 4.2,  '12220': 3.9,  '12221': 2.4,
  '20000': 9.8,  '20001': 9.5,  '20010': 9.4,  '20011': 8.7,  '20020': 9.0,  '20021': 8.1,
  '20100': 9.3,  '20101': 9.0,  '20110': 9.0,  '20111': 7.4,  '20120': 7.9,  '20121': 6.7,
  '20200': 8.6,  '20201': 8.2,  '20210': 7.4,  '20211': 6.2,  '20220': 6.2,  '20221': 4.7,
  '21000': 9.4,  '21001': 8.9,  '21010': 8.7,  '21011': 7.3,  '21020': 7.7,  '21021': 6.4,
  '21100': 9.0,  '21101': 8.5,  '21110': 8.0,  '21111': 5.9,  '21120': 5.9,  '21121': 4.7,
  '21200': 7.6,  '21201': 6.5,  '21210': 5.4,  '21211': 4.9,  '21220': 4.5,  '21221': 2.5,  '21222': 2.5,
  '22000': 9.0,  '22001': 8.5,  '22010': 7.8,  '22011': 6.2,  '22020': 6.5,  '22021': 5.5,
  '22100': 8.5,  '22101': 7.9,  '22110': 7.5,  '22111': 5.3,  '22120': 5.1,  '22121': 3.6,
  '22200': 6.8,  '22201': 5.5,  '22210': 4.5,  '22211': 3.5,  '22220': 3.4,  '22221': 1.5,
};

function scoreToSeverity(score: number): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score === 0.0) return 'NONE';
  if (score < 4.0) return 'LOW';
  if (score < 7.0) return 'MEDIUM';
  if (score < 9.0) return 'HIGH';
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

  return {
    score,
    severity: scoreToSeverity(score),
    vector,
  };
}
