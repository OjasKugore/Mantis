import pc from 'picocolors';
import { apiRequest } from '../client.js';
import { theme } from '../theme.js';

export async function inboxCommand(options: { json?: boolean }) {
  try {
    const res = await apiRequest('/api/v1/bugs?limit=50');
    const bugs = res.bugs || [];

    // Filter unconfirmed or high-priority triage items
    const triageItems = bugs.filter((b: any) => 
      b.status === 'UNCONFIRMED' || 
      b.priority === 'P1' || 
      (b.is_embargoed && b.status !== 'RESOLVED' && b.status !== 'CLOSED')
    );

    if (options.json) {
      console.log(JSON.stringify(triageItems, null, 2));
      return;
    }

    console.log(theme.primaryBold(`\n══ Mantis Daily Standup Triage Inbox ══`));
    console.log(pc.gray(`Showing ${triageItems.length} issues requiring immediate attention\n`));

    if (triageItems.length === 0) {
      console.log(pc.green('✓ All triage queues are clear! Zero unconfirmed or blocking bugs.'));
      console.log('');
      return;
    }

    for (const b of triageItems) {
      const p = theme.priority(b.priority);
      const s = theme.status(b.status);
      const embargo = b.is_embargoed ? pc.red(' [🔒 90-DAY EMBARGO]') : '';
      console.log(`${pc.bold(pc.cyan(`● Bug #${b.id}`))} ${p} ${s}${embargo}`);
      console.log(`  ${pc.bold(b.summary)}`);
      console.log(pc.gray(`  Reporter: ${b.reporter_name || b.reporter_email || 'User'} · Product: ID ${b.product_id}`));
      console.log(pc.gray(`  Quick actions: 'mantis bug view ${b.id}' | 'mantis triage ${b.id}' | 'mantis bug status ${b.id} CONFIRMED'\n`));
    }
  } catch (err: any) {
    console.error(pc.red(`Error loading inbox: ${err.message}`));
    process.exit(1);
  }
}
