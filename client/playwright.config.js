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
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: './coverage/playwright-report',
      },
    ],
  ],
  outputDir: './coverage/playwright-artifacts',
  use: {
    baseURL: 'http://localhost:4173',
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
      command: `node "${viteExecutable}" --host localhost --port 4173`,
      cwd: clientDirectory,
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        ...process.env,
        VITE_API_URL: 'http://localhost:3000/api',
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
