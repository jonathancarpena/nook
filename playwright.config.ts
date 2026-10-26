import { defineConfig } from '@playwright/test';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
// Parent sets an ephemeral test password; Playwright workers inherit it.
const testPassword = process.env.HALLOWEEN_E2E_PASSWORD || randomBytes(24).toString('hex');
process.env.HALLOWEEN_E2E_PASSWORD = testPassword;
const salt = randomBytes(16).toString('hex');
const dataDir = mkdtempSync(path.join(tmpdir(), 'halloween-browser-'));
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      args: ['--no-sandbox'],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      APP_BACKEND: 'local',
      VERCEL: '',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      LOCAL_HOST_PASSWORD_HASH: `${salt}:${scryptSync(testPassword, salt, 64).toString('hex')}`,
      LOCAL_SESSION_SECRET: randomBytes(32).toString('hex'),
      GUEST_TOKEN_SECRET: randomBytes(32).toString('hex'),
      LOCAL_DATA_DIR: dataDir,
      NEXT_DIST_DIR: '.next-e2e',
      ENABLE_DEMO: 'true',
    },
  },
});
