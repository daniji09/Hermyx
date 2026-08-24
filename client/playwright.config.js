import { defineConfig, devices } from 'playwright/test';
import process from 'node:process';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
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
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    cwd: '.',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      VITE_API_URL: 'http://127.0.0.1:4173/api',
      VITE_FIREBASE_API_KEY: 'playwright-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'playwright-auth-domain',
      VITE_FIREBASE_PROJECT_ID: 'playwright-project-id',
      VITE_FIREBASE_STORAGE_BUCKET: 'playwright-storage-bucket',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'playwright-sender-id',
      VITE_FIREBASE_APP_ID: 'playwright-app-id',
      VITE_FIREBASE_MEASUREMENT_ID: 'playwright-measurement-id',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
