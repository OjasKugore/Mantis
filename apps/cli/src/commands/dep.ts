import pc from 'picocolors';
import { apiRequest } from '../client.js';
import { renderAsciiGraph } from '../graph.js';
import { theme } from '../theme.js';

export async function graphCommand(bugId: string, options: { json?: boolean }) {
  try {
    const res = await apiRequest(`/api/v1/bugs/${bugId}/graph`);

    if (options.json) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    const asciiOutput = renderAsciiGraph(res);
    console.log(asciiOutput);
  } catch (err: any) {
    console.error(pc.red(`Error generating graph for bug #${bugId}: ${err.message}`));
    process.exit(1);
  }
}

export async function addDependencyCommand(blockingId: string, blockedId: string) {
  try {
    const res = await apiRequest(`/api/v1/bugs/${blockedId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ blocking_bug_id: parseInt(blockingId, 10) }),
    });

    console.log(theme.primaryBold(`\n✓ Dependency added: Bug #${blockingId} now blocks Bug #${blockedId}`));
  } catch (err: any) {
    console.error(pc.red(`Error adding dependency link: ${err.message}`));
    process.exit(1);
  }
}

export async function removeDependencyCommand(blockingId: string, blockedId: string) {
  try {
    const res = await apiRequest(`/api/v1/bugs/${blockedId}/dependencies/${blockingId}`, {
      method: 'DELETE',
    });

    console.log(theme.primaryBold(`\n✓ Dependency removed: Bug #${blockingId} no longer blocks Bug #${blockedId}`));
  } catch (err: any) {
    console.error(pc.red(`Error removing dependency link: ${err.message}`));
    process.exit(1);
  }
}
