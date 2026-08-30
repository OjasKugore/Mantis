import pc from 'picocolors';
import { apiRequest } from '../client.js';
import { config } from '../config.js';
import { theme } from '../theme.js';

export async function loginCommand(options: { persona?: string; email?: string; password?: string }) {
  try {
    if (options.persona) {
      console.log(pc.gray(`Authenticating with evaluation persona: ${pc.bold(options.persona)}...`));
      const res = await apiRequest('/api/v1/auth/quick-login', {
        method: 'POST',
        body: JSON.stringify({ persona: options.persona }),
      });

      config.save({
        currentUser: res.user,
        sessionId: res.token,
      });

      console.log(theme.primaryBold(`✓ Logged in successfully as ${res.user.display_name} (${res.user.email})`));
      console.log(pc.gray(`  Role: ${res.user.is_admin ? 'Administrator' : 'Team Member'}`));
      if (res.user.groups && res.user.groups.length > 0) {
        console.log(pc.gray(`  Groups: ${res.user.groups.join(', ')}`));
      }
      return;
    }

    if (options.email && options.password) {
      console.log(pc.gray(`Authenticating as ${options.email}...`));
      const res = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: options.email, password: options.password }),
      });

      config.save({
        currentUser: res.user,
        sessionId: res.token,
      });

      console.log(theme.primaryBold(`✓ Logged in as ${res.user.display_name} (${res.user.email})`));
      return;
    }

    console.error(pc.red('Error: Please specify --persona <name> or --email <email> --password <pass>'));
    process.exit(1);
  } catch (err: any) {
    console.error(pc.red(`Authentication Failed: ${err.message}`));
    process.exit(1);
  }
}

export async function meCommand() {
  try {
    const res = await apiRequest('/api/v1/auth/me');
    const u = res.user || res;

    console.log(theme.primaryBold(`\n══ Active Mantis Session ══`));
    console.log(`  Name:     ${pc.bold(u.display_name)}`);
    console.log(`  Email:    ${u.email}`);
    console.log(`  Username: @${u.username}`);
    console.log(`  Admin:    ${u.is_admin ? pc.green('Yes') : pc.gray('No')}`);
    if (u.team_name) {
      console.log(`  Team:     ${pc.cyan(u.team_name)}`);
    }
    if (u.groups && u.groups.length > 0) {
      console.log(`  Groups:   ${u.groups.map((g: string) => pc.yellow(g)).join(', ')}`);
    }
    console.log('');
  } catch (err: any) {
    console.error(pc.red(`Session Error: ${err.message}`));
    console.log(pc.gray(`Run 'mantis auth login --persona alice' to authenticate.`));
    process.exit(1);
  }
}
