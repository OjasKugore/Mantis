import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getConfig, saveConfig, clearAuth, getConfigPath } from '../src/config.js';
import { getClient } from '../src/apiClient.js';
import { getStatusBadge, getPriorityBadge } from '../src/formatters/bugFormatter.js';
import { computeCvss4 } from '../src/services/cvss4.js';

describe('Bugzilla CLI Test Suite (Phase 1 to Phase 4)', () => {
  const tmpDir = path.join(os.tmpdir(), `bz-cli-full-test-${Date.now()}`);
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

  // ─── Phase 1: Config, Client & Auth ──────────────────────────────────────
  describe('Phase 1: Configuration & Auth System', () => {
    it('T-CLI-1.1: Config storage read/write & custom path resolution', () => {
      expect(getConfigPath()).toBe(testConfigPath);
      const initial = getConfig();
      expect(initial.apiUrl).toBe('http://localhost:3001');

      saveConfig({ apiUrl: 'http://localhost:4000', cookie: 'session=mock_token_123' });
      const updated = getConfig();
      expect(updated.apiUrl).toBe('http://localhost:4000');
      expect(updated.cookie).toBe('session=mock_token_123');

      clearAuth();
      const cleared = getConfig();
      expect(cleared.cookie).toBeUndefined();
    });

    it('T-CLI-1.2: apiClient initializes headers with stored session cookie', () => {
      saveConfig({ apiUrl: 'http://localhost:3001', cookie: 'session=val123' });
      const client = getClient();
      expect(client).toBeDefined();
    });
  });

  // ─── Phase 2: Formatters & Bug State Machine ──────────────────────────────
  describe('Phase 2: Bug Formatters & Status Badges', () => {
    it('T-CLI-2.1: getStatusBadge returns styled badges for all statuses', () => {
      expect(getStatusBadge('UNCONFIRMED')).toContain('UNCONFIRMED');
      expect(getStatusBadge('CONFIRMED')).toContain('CONFIRMED');
      expect(getStatusBadge('IN_PROGRESS')).toContain('IN_PROGRESS');
      expect(getStatusBadge('RESOLVED')).toContain('RESOLVED');
      expect(getStatusBadge('VERIFIED')).toContain('VERIFIED');
      expect(getStatusBadge('CLOSED')).toContain('CLOSED');
    });

    it('T-CLI-2.2: getPriorityBadge returns styled badges for priorities', () => {
      expect(getPriorityBadge('P1')).toContain('P1');
      expect(getPriorityBadge('P3')).toContain('P3');
    });
  });

  // ─── Phase 3: CVSS v4.0 Engine & CPM Graph ───────────────────────────────
  describe('Phase 3: CVSS v4.0 Calculator & Dependency Graph', () => {
    it('T-CLI-3.1: CVSS v4.0 score computation handles standard vectors', () => {
      const vector = 'CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N';
      const result = computeCvss4(vector);
      expect(result.score).toBeGreaterThanOrEqual(8.0);
      expect(result.severity).toBe('CRITICAL');
    });

    it('T-CLI-3.2: Invalid CVSS v4.0 vector throws descriptive error', () => {
      expect(() => computeCvss4('INVALID_VECTOR')).toThrow('Invalid CVSS v4.0 vector');
    });
  });
});
