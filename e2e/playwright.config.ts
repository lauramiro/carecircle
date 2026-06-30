import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const frontendUrl = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173';
export const AUTH_FILE = path.join(__dirname, '.auth/user.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,

  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Login once, save session to .auth/user.json
    {
      name: 'setup',
      testMatch: '**/global.setup.ts',
    },

    // API smoke tests — no browser session needed, no setup dependency
    {
      name: 'api-smoke',
      testMatch: '**/api-smoke.spec.ts',
    },

    // Auth-specific browser tests that intentionally start logged-out
    {
      name: 'auth-browser',
      testMatch: '**/auth.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // Signup page tests — also need fresh (logged-out) session
    {
      name: 'signup-browser',
      testMatch: '**/signup.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // All other browser tests reuse the logged-in session
    {
      name: 'chromium',
      testIgnore: ['**/global.setup.ts', '**/api-smoke.spec.ts', '**/auth.spec.ts', '**/signup.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
  ],
});
