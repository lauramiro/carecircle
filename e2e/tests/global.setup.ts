/**
 * Runs once before the authenticated test projects.
 * Logs in with E2E_TEST_EMAIL / E2E_TEST_PASSWORD and persists the browser
 * storage state so all authenticated tests share the same session.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, '../.auth/user.json');

const EMAIL = process.env.E2E_TEST_EMAIL ?? '';
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? '';

setup('authenticate', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set');
  }

  await page.goto('/login');
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|create account/i }).click();

  // Wait until we've landed somewhere in the authenticated shell
  await page.waitForURL(/\/(dashboard|groups)/, { timeout: 20_000 });
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: AUTH_FILE });
});
