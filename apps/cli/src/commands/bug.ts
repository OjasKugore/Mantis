import pc from 'picocolors';
import { apiRequest } from '../client.js';
import { theme } from '../theme.js';

export async function listBugsCommand(options: { status?: string; priority?: string; json?: boolean; limit?: string }) {
  try {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.priority) params.set('priority', options.priority);
    if (options.limit) params.set('limit', options.limit);
    else params.set('limit', '50');

    const res = await apiRequest(`/api/v1/bugs?${params.toString()}`);
    const bugs = res.bugs || [];

    if (options.json) {
      console.log(JSON.stringify(bugs, null, 2));
      return;
    }

    if (bugs.length === 0) {
      console.log(pc.gray('No bugs found matching your criteria.'));
      return;
    }

    console.log(theme.primaryBold(`\n══ Mantis Bug Queue (${bugs.length} Issues) ══`));
    console.log(pc.gray(' ID    STATUS         PRIORITY   SEVERITY     SECURITY'));
    console.log(pc.gray('───── ────────────── ────────── ──────────── ─────────'));

    for (const b of bugs) {
      const id = `#${b.id}`.padEnd(6);
      const status = theme.status(b.status).padEnd(22);
      const prio = theme.priority(b.priority).padEnd(12);
      const sev = theme.severity(b.severity).padEnd(18);
      const embargo = b.is_embargoed ? pc.bold(pc.red('🔒 90-DAY')) : pc.gray('—');
      console.log(`${id} ${status} ${prio} ${sev} ${embargo}`);
    }
    console.log('');
  } catch (err: any) {
    console.error(pc.red(`Error listing bugs: ${err.message}`));
    process.exit(1);
  }
}

export async function viewBugCommand(id: string, options: { json?: boolean }) {
  try {
    const res = await apiRequest(`/api/v1/bugs/${id}`);
    const b = res.bug || res;

    if (options.json) {
      console.log(JSON.stringify(b, null, 2));
      return;
    }

    console.log(theme.primaryBold(`\n══ Bug #${b.id}: ${b.summary} ══`));
    console.log(`  Status:       ${theme.status(b.status)} ${b.resolution ? `(${b.resolution})` : ''}`);
    console.log(`  Priority:     ${theme.priority(b.priority)}`);
    console.log(`  Severity:     ${theme.severity(b.severity)}`);
    console.log(`  Product:      ID ${b.product_id} · Component ID ${b.component_id}`);
    console.log(`  Reporter:     ${b.reporter_name || b.reporter_email || b.reporter_id}`);
    if (b.assignee_id) console.log(`  Assignee:     ${b.assignee_name || b.assignee_email || b.assignee_id}`);
    if (b.is_embargoed) {
      console.log(pc.bold(pc.red(`  Embargo:      🔒 ACTIVE (Until ${b.embargo_until ? new Date(b.embargo_until).toLocaleDateString() : 'TBD'})`)));
    }
    if (b.cvss_vector) {
      console.log(`  CVSS Vector:  ${pc.cyan(b.cvss_vector)} (${b.cvss_score ?? 'N/A'} ${b.cvss_severity ?? ''})`);
    }

    console.log(pc.bold(`\n── Description ──`));
    console.log(b.description || pc.gray('(No description provided)'));
    console.log('');
  } catch (err: any) {
    console.error(pc.red(`Error viewing bug #${id}: ${err.message}`));
    process.exit(1);
  }
}

export async function createBugCommand(options: {
  summary: string;
  description?: string;
  productId?: string;
  componentId?: string;
  priority?: string;
  severity?: string;
}) {
  try {
    if (!options.summary) {
      console.error(pc.red('Error: --summary is required'));
      process.exit(1);
    }

    const payload = {
      summary: options.summary,
      description: options.description || '',
      product_id: options.productId ? parseInt(options.productId, 10) : 1,
      component_id: options.componentId ? parseInt(options.componentId, 10) : 1,
      priority: options.priority || 'P3',
      severity: options.severity || 'normal',
    };

    const res = await apiRequest('/api/v1/bugs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const createdBug = res.bug || res;
    console.log(theme.primaryBold(`\n✓ Bug #${createdBug.id} filed successfully!`));
    console.log(`  Summary:  ${createdBug.summary}`);
    console.log(`  Status:   ${theme.status(createdBug.status)}`);
    console.log(`  Priority: ${theme.priority(createdBug.priority)}`);
    console.log('');
  } catch (err: any) {
    console.error(pc.red(`Error creating bug: ${err.message}`));
    process.exit(1);
  }
}

export async function statusBugCommand(id: string, status: string, options: { resolution?: string }) {
  try {
    const payload: Record<string, string> = { status: status.toUpperCase() };
    if (options.resolution) {
      payload.resolution = options.resolution.toUpperCase();
    }

    const res = await apiRequest(`/api/v1/bugs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    console.log(theme.primaryBold(`\n✓ Bug #${id} status updated to ${theme.status(status.toUpperCase())}`));
    if (options.resolution) {
      console.log(`  Resolution: ${options.resolution.toUpperCase()}`);
    }
    console.log('');
  } catch (err: any) {
    console.error(pc.red(`Error updating bug #${id}: ${err.message}`));
    process.exit(1);
  }
}
