import { defineConfig } from '@playwright/test';

const frontendUrl = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,

  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // API smoke tests — no browser session needed
    {
      name: 'api-smoke',
      testMatch: '**/api-smoke.spec.ts',
    },
  ],
});
