import { Command } from 'commander';
import chalk from 'chalk';
import { apiPost, apiGet } from '../apiClient.js';
import { saveConfig, clearAuth, getConfig } from '../config.js';
import { AuthenticatedUser } from '@bugzilla/shared';

const PRESET_PERSONAS: Record<string, { email: string; name: string; role: string }> = {
  admin: { email: 'admin@bugzilla.local', name: 'System Administrator', role: 'Admin' },
  alice: { email: 'alice@mozilla.com', name: 'Alice Developer', role: 'Developer' },
  bob: { email: 'bob@mozilla.com', name: 'Bob QA Engineer', role: 'QA Engineer' },
  carol: { email: 'carol@mozilla.com', name: 'Carol Security Lead', role: 'Security Lead' },
};

export function registerAuthCommands(program: Command) {
  const auth = program.command('auth').description('Authentication & Session Management');

  // auth login
  auth
    .command('login')
    .description('Log in to Bugzilla API session')
    .option('-e, --email <email>', 'User email address')
    .option('-p, --password <password>', 'User password')
    .option('--persona <name>', 'Quick login with persona: admin, alice, bob, carol')
    .action(async (options) => {
      let email = options.email;
      let password = options.password || 'password123';

      if (options.persona) {
        const key = options.persona.toLowerCase();
        if (PRESET_PERSONAS[key]) {
          email = PRESET_PERSONAS[key].email;
          console.log(chalk.blue(`ℹ Logging in as persona: ${PRESET_PERSONAS[key].name} (${email})`));
        } else {
          console.error(chalk.red(`✖ Unknown persona "${options.persona}". Available: admin, alice, bob, carol`));
          process.exit(1);
        }
      }

      if (!email) {
        console.error(chalk.red('✖ Email is required. Pass --email or --persona <name>'));
        process.exit(1);
      }

      try {
        const user = await apiPost<AuthenticatedUser>('/api/v1/auth/login', {
          email,
          password,
        });

        saveConfig({ currentUser: user });
        console.log(chalk.green(`✔ Logged in successfully as ${chalk.bold(user.display_name)} (${user.email})`));
        if (user.is_admin) {
          console.log(chalk.yellow('⚡ Administrator privileges enabled'));
        }
      } catch (err: any) {
        console.error(chalk.red(`✖ Authentication failed: ${err.message}`));
        process.exit(1);
      }
    });

  // auth logout
  auth
    .command('logout')
    .description('Log out and clear session credentials')
    .action(async () => {
      try {
        await apiPost('/api/v1/auth/logout');
      } catch (err) {
        // Ignore logout errors if session already expired
      }
      clearAuth();
      console.log(chalk.green('✔ Logged out and cleared stored session.'));
    });

  // auth me
  auth
    .command('me')
    .description('Display current authenticated session profile')
    .action(async () => {
      try {
        const user = await apiGet<AuthenticatedUser>('/api/v1/auth/me');
        saveConfig({ currentUser: user });
        console.log(chalk.bold('User Profile:'));
        console.log(`  ID:           ${user.id}`);
        console.log(`  Display Name: ${chalk.cyan(user.display_name)}`);
        console.log(`  Username:     ${user.username}`);
        console.log(`  Email:        ${user.email}`);
        console.log(`  Role:         ${user.is_admin ? chalk.yellow('Administrator') : 'Standard User'}`);
      } catch (err: any) {
        const config = getConfig();
        if (!config.cookie) {
          console.log(chalk.yellow('ℹ Not logged in. Run `bz auth login --persona alice` to authenticate.'));
        } else {
          console.error(chalk.red(`✖ Failed to fetch session info: ${err.message}`));
        }
      }
    });
}
