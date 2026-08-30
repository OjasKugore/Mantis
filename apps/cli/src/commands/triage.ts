import pc from 'picocolors';
import { apiRequest } from '../client.js';
import { theme } from '../theme.js';

export async function triageCommand(bugId: string, options: { json?: boolean }) {
  try {
    console.log(pc.gray(`Running Gemini AI triage assistant on bug #${bugId}...`));
    const res = await apiRequest(`/api/v1/bugs/${bugId}/ai-triage`, { method: 'POST' });

    if (options.json) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    const t = res.triage || res;

    console.log(theme.primaryBold(`\n══ ✨ Mantis AI Triage Synthesis (Bug #${bugId}) ══`));
    console.log(pc.bold(`\n── Summary & Root Cause ──`));
    console.log(t.summary || '(No summary available)');

    if (t.suggested_priority) {
      console.log(`\n  Recommended Priority:  ${theme.priority(t.suggested_priority)}`);
    }
    if (t.suggested_component) {
      console.log(`  Target Component:      ${pc.cyan(t.suggested_component)}`);
    }
    if (t.confidence_reason) {
      console.log(`  Confidence Rationale:  ${pc.gray(t.confidence_reason)}`);
    }

    if (t.next_steps && t.next_steps.length > 0) {
      console.log(pc.bold(`\n── Recommended Action Items ──`));
      t.next_steps.forEach((step: string, i: number) => {
        console.log(`  ${pc.cyan(`${i + 1}.`)} ${step}`);
      });
    }
    console.log('');
  } catch (err: any) {
    console.error(pc.red(`Error running AI triage for bug #${bugId}: ${err.message}`));
    process.exit(1);
  }
}
