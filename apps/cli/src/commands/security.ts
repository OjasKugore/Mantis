import pc from 'picocolors';
import { apiRequest } from '../client.js';
import { calculateCvss4 } from '../cvss.js';
import { theme } from '../theme.js';

export function cvssCommand(vectorString: string, options: { json?: boolean }) {
  try {
    const result = calculateCvss4(vectorString);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(theme.primaryBold(`\n══ FIRST.org CVSS v4.0 Calculator ══`));
    console.log(`  Vector:   ${pc.cyan(result.vector)}`);
    console.log(`  Score:    ${pc.bold(result.score >= 9 ? pc.bgRed(pc.white(` ${result.score} `)) : result.score >= 7 ? pc.red(` ${result.score} `) : pc.yellow(` ${result.score} `))}`);
    console.log(`  Severity: ${theme.severity(result.severity.toLowerCase())}`);
    console.log(pc.gray('\n  Base Metrics Breakdown:'));
    for (const [k, v] of Object.entries(result.metrics)) {
      console.log(`    ${k.padEnd(4)}: ${pc.bold(v)}`);
    }
    console.log('');
  } catch (err: any) {
    console.error(pc.red(`CVSS Calculator Error: ${err.message}`));
    process.exit(1);
  }
}

export async function updateSecurityCommand(
  bugId: string,
  options: { vector?: string; security?: string; embargo?: string }
) {
  try {
    const payload: Record<string, any> = {};
    if (options.vector) {
      payload.cvss_vector = options.vector;
      const cvss = calculateCvss4(options.vector);
      payload.cvss_score = cvss.score;
      payload.cvss_severity = cvss.severity;
    }
    if (options.security !== undefined) {
      payload.is_security = options.security === 'true' || options.security === '1';
    }
    if (options.embargo) {
      payload.is_embargoed = true;
      payload.embargo_until = new Date(options.embargo).toISOString();
    }

    const res = await apiRequest(`/api/v1/bugs/${bugId}/security`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    console.log(theme.primaryBold(`\n✓ Security attributes updated for bug #${bugId}`));
    if (payload.cvss_vector) {
      console.log(`  CVSS Vector: ${pc.cyan(payload.cvss_vector)} (${payload.cvss_score} ${payload.cvss_severity})`);
    }
    if (payload.is_embargoed) {
      console.log(pc.bold(pc.red(`  90-Day Embargo: Active until ${new Date(payload.embargo_until).toLocaleDateString()}`)));
    }
    console.log('');
  } catch (err: any) {
    console.error(pc.red(`Error updating security settings on bug #${bugId}: ${err.message}`));
    process.exit(1);
  }
}
