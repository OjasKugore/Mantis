import fs from 'fs';
import path from 'path';
import os from 'os';

export interface CliConfig {
  apiUrl: string;
  sessionId?: string;
  userToken?: string;
  currentUser?: {
    id: string;
    email: string;
    display_name: string;
    username: string;
    is_admin: boolean;
    groups?: string[];
  };
}

const CONFIG_PATH = path.join(os.homedir(), '.mantis-session.json');

export const config = {
  get: (): CliConfig => {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return {
      apiUrl: process.env.BZ_API_URL || process.env.MANTIS_API_URL || 'http://localhost:3000',
    };
  },

  save: (data: Partial<CliConfig>) => {
    const current = config.get();
    const updated: CliConfig = { ...current, ...data };
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), { mode: 0o600 });
    } catch (err) {
      console.warn('Warning: Could not save session to disk:', (err as Error).message);
    }
    return updated;
  },

  clear: () => {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        fs.unlinkSync(CONFIG_PATH);
      }
    } catch {
      // ignore
    }
  },
};
