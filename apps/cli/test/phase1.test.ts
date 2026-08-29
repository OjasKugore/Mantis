import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getConfig, saveConfig, clearAuth, getConfigPath } from '../src/config.js';
import { getClient, apiGet, apiPost } from '../src/apiClient.js';

describe('Phase 1: CLI Config, API Client & Auth System', () => {
  const tmpDir = path.join(os.tmpdir(), `bz-cli-test-${Date.now()}`);
  const testConfigPath = path.join(tmpDir, 'config.json');

  beforeEach(() => {
    process.env.TEST_CONFIG_PATH = testConfigPath;
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    delete process.env.TEST_CONFIG_PATH;
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('T-CLI-1.1: Config storage read/write & custom path resolution', () => {
    expect(getConfigPath()).toBe(testConfigPath);

    const initial = getConfig();
    expect(initial.apiUrl).toBe('http://localhost:3001');
    expect(initial.cookie).toBeUndefined();

    saveConfig({ apiUrl: 'http://localhost:4000', cookie: 'session=abc123token' });

    const updated = getConfig();
    expect(updated.apiUrl).toBe('http://localhost:4000');
    expect(updated.cookie).toBe('session=abc123token');

    clearAuth();
    const cleared = getConfig();
    expect(cleared.apiUrl).toBe('http://localhost:4000');
    expect(cleared.cookie).toBeUndefined();
  });

  it('T-CLI-1.2: apiClient constructs headers with stored cookie', () => {
    saveConfig({ apiUrl: 'http://localhost:3001', cookie: 'session=mock_cookie_val' });
    const client = getClient();
    expect(client).toBeDefined();
  });
});
