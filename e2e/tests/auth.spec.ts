/**
 * Browser-driven auth tests against the live staging frontend.
 *
 * Covers:
 *   AUTH-05  Login happy path → dashboard accessible
 *   AUTH-06  Wrong password   → inline error shown, no redirect
 *   AUTH-10  Sign out         → session cleared, back at /login
 *   AUTH-11  Session restore  → reload retains authenticated state
 *
 * Required env vars (set as GitHub Secrets):
 *   E2E_FRONTEND_URL — e.g. https://carecircle.onrender.com
 *   E2E_TEST_EMAIL   — verified test account email
 *   E2E_TEST_PASSWORD — password for the test account
 */

import { test, expect, Page } from '@playwright/test';

const EMAIL = process.env.E2E_TEST_EMAIL ?? '';
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? '';

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set');
  }
});

async function login(page: Page, email = EMAIL, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
}

// ---------------------------------------------------------------------------
// AUTH-05 — Login happy path
// ---------------------------------------------------------------------------
test('AUTH-05: valid credentials redirect to dashboard', async ({ page }) => {
  await login(page);
  // Wait for navigation away from /login
  await page.waitForURL(/\/(dashboard|groups)/);
  await expect(page).not.toHaveURL(/\/login/);
});

// ---------------------------------------------------------------------------
// AUTH-06 — Wrong password shows error, no redirect
// ---------------------------------------------------------------------------
test('AUTH-06: wrong password shows error and stays on login', async ({ page }) => {
  await login(page, EMAIL, 'WrongPassword999!');
  // Should stay on /login
  await expect(page).toHaveURL(/\/login/);
  // An error message should be visible
  await expect(
    page.getByText(/invalid|incorrect|wrong|credentials|error/i).first(),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// AUTH-10 — Sign out clears session
// ---------------------------------------------------------------------------
test('AUTH-10: sign out redirects back to login', async ({ page }) => {
  await login(page);
  await page.waitForURL(/\/(dashboard|groups)/);

  // Find and click a sign-out / logout control
  const signOutButton = page
    .getByRole('button', { name: /sign out|log out|logout/i })
    .or(page.getByText(/sign out|log out/i));

  // May be inside a dropdown/menu — try clicking avatar/profile first
  const profileTrigger = page.getByRole('button', { name: /profile|account|menu/i });
  if (await profileTrigger.count() > 0) {
    await profileTrigger.first().click();
  }

  await signOutButton.first().click();
  await page.waitForURL(/\/login/);
  await expect(page).toHaveURL(/\/login/);
});

// ---------------------------------------------------------------------------
// AUTH-11 — Session persists across reload
// ---------------------------------------------------------------------------
test('AUTH-11: session is restored after page reload', async ({ page }) => {
  await login(page);
  await page.waitForURL(/\/(dashboard|groups)/);
  const urlBeforeReload = page.url();

  await page.reload();
  // Should not be pushed to /login after reload
  await expect(page).not.toHaveURL(/\/login/);
  // Should still be somewhere in the authenticated area
  await expect(page).toHaveURL(/\/(dashboard|groups|settings)/);
  // URL should be close to where we were
  expect(page.url()).toContain(new URL(urlBeforeReload).pathname.split('/')[1]);
});
