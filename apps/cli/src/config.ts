import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface CliConfig {
  apiUrl: string;
  cookie?: string;
  currentUser?: {
    id: string;
    email: string;
    display_name: string;
    username: string;
    is_admin: boolean;
  };
}

const DEFAULT_CONFIG: CliConfig = {
  apiUrl: process.env.BUGZILLA_API_URL || 'http://localhost:3001',
};

export function getConfigPath(): string {
  if (process.env.TEST_CONFIG_PATH) {
    return process.env.TEST_CONFIG_PATH;
  }
  const homeDir = os.homedir();
  return path.join(homeDir, '.bugzilla-cli', 'config.json');
}

export function getConfig(): CliConfig {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (err) {
    // If invalid JSON or unreadable, return default
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(partialConfig: Partial<CliConfig>): CliConfig {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const current = getConfig();
  const updated: CliConfig = { ...current, ...partialConfig };

  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), {
    mode: 0o600,
  });

  return updated;
}

export function clearAuth(): CliConfig {
  const current = getConfig();
  delete current.cookie;
  delete current.currentUser;

  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(current, null, 2), {
    mode: 0o600,
  });

  return current;
}
