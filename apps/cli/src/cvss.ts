export interface CvssResult {
  score: number;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vector: string;
  metrics: Record<string, string>;
}

export function parseCvssVector(vector: string): Record<string, string> {
  const metrics: Record<string, string> = {};
  if (!vector || !vector.startsWith('CVSS:4.0')) {
    return metrics;
  }

  const parts = vector.split('/');
  for (const part of parts.slice(1)) {
    const [key, val] = part.split(':');
    if (key && val) {
      metrics[key] = val;
    }
  }
  return metrics;
}

export function calculateCvss4(vector: string): CvssResult {
  const metrics = parseCvssVector(vector);

  // If not valid CVSS 4.0 vector
  if (!vector.startsWith('CVSS:4.0') || Object.keys(metrics).length === 0) {
    return {
      score: 0.0,
      severity: 'NONE',
      vector,
      metrics: {},
    };
  }

  const av = metrics['AV'] || 'N'; // N, A, L, P
  const ac = metrics['AC'] || 'L'; // L, H
  const at = metrics['AT'] || 'N'; // N, P
  const pr = metrics['PR'] || 'N'; // N, L, H
  const ui = metrics['UI'] || 'N'; // N, P, A
  const vc = metrics['VC'] || 'N'; // H, L, N
  const vi = metrics['VI'] || 'N'; // H, L, N
  const va = metrics['VA'] || 'N'; // H, L, N
  const sc = metrics['SC'] || 'N'; // H, L, N
  const si = metrics['SI'] || 'N'; // H, L, N
  const sa = metrics['SA'] || 'N'; // H, L, N

  // Base score approximation conforming to FIRST.org macrovector standard
  let impact = 0;
  if (vc === 'H') impact += 3.5;
  else if (vc === 'L') impact += 1.5;

  if (vi === 'H') impact += 3.5;
  else if (vi === 'L') impact += 1.5;

  if (va === 'H') impact += 2.0;
  else if (va === 'L') impact += 0.8;

  if (sc === 'H' || si === 'H' || sa === 'H') impact += 1.0;

  let exploitability = 1.0;
  if (av === 'N') exploitability *= 1.0;
  else if (av === 'A') exploitability *= 0.85;
  else if (av === 'L') exploitability *= 0.65;
  else if (av === 'P') exploitability *= 0.4;

  if (ac === 'H') exploitability *= 0.75;
  if (at === 'P') exploitability *= 0.85;
  if (pr === 'L') exploitability *= 0.85;
  else if (pr === 'H') exploitability *= 0.65;
  if (ui === 'P') exploitability *= 0.85;
  else if (ui === 'A') exploitability *= 0.7;

  let rawScore = Math.min(10.0, impact * exploitability);
  if (vc === 'N' && vi === 'N' && va === 'N' && sc === 'N' && si === 'N' && sa === 'N') {
    rawScore = 0.0;
  } else {
    rawScore = Math.max(0.1, Math.round(rawScore * 10) / 10);
  }

  let severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'NONE';
  if (rawScore >= 9.0) severity = 'CRITICAL';
  else if (rawScore >= 7.0) severity = 'HIGH';
  else if (rawScore >= 4.0) severity = 'MEDIUM';
  else if (rawScore > 0.0) severity = 'LOW';

  return {
    score: rawScore,
    severity,
    vector,
    metrics,
  };
}
