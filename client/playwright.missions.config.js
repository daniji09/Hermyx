import { defineConfig, devices } from 'playwright/test';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import './e2e/support/loadPlaywrightEnv.js';

const clientDirectory = fileURLToPath(new URL('.', import.meta.url));
const serverDirectory = fileURLToPath(new URL('../server/', import.meta.url));
const viteExecutable = fileURLToPath(
  new URL('../node_modules/vite/bin/vite.js', import.meta.url),
);

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'create-missions.spec.js',
    'invitation-acceptance.spec.js',
    'mission-lifecycle-payment.spec.js',
    'mission-submission-review.spec.js',
    'mission-rejection-dispute.spec.js',
    'stripe-connect-onboarding.spec.js',
  ],
  fullyParallel: false,
  reporter: [['list']],
  outputDir: './coverage/playwright-missions-artifacts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node src/server.js',
      cwd: serverDirectory,
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: `node "${viteExecutable}" --host localhost --port 5173`,
      cwd: clientDirectory,
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
