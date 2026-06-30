/**
 * Care group browser tests (authenticated).
 *
 * GROUP-01  Create a care circle (happy path)
 * GROUP-02  Missing both patient email and phone is rejected client-side
 * GROUP-03  Future date of birth is rejected client-side
 * GROUP-05  Members page loads and lists members
 *
 * Requires env vars:
 *   E2E_TEST_GROUP_ID — UUID of an existing group the test user is primary carer for
 */

import { test, expect } from '@playwright/test';

const GROUP_ID = process.env.E2E_TEST_GROUP_ID ?? '';
const ts = () => Date.now();

test.beforeAll(() => {
  if (!GROUP_ID) throw new Error('E2E_TEST_GROUP_ID must be set');
});

// ---------------------------------------------------------------------------
// GROUP-01 — Create care circle (happy path)
// Creates a real group with a timestamp name; accepted accumulation on staging.
// ---------------------------------------------------------------------------
test('GROUP-01: create care circle navigates to groups list', async ({ page }) => {
  await page.goto('/groups/create');

  const name = `E2E Circle ${ts()}`;
  await page.locator('#groupName').fill(name);
  await page.locator('#patientFullName').fill('E2E Patient');
  await page.locator('#dateOfBirth').fill('1960-01-15');
  // Select the first non-empty relationship option
  await page.locator('#relationship').selectOption({ index: 1 });
  await page.locator('#patientEmail').fill('e2e-patient@example.com');

  await page.getByRole('button', { name: /create circle/i }).click();

  // Should navigate to groups list after creation
  await page.waitForURL(/\/groups\/list/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/groups\/list/);
  // Toast should confirm success
  await expect(page.getByText(new RegExp(name))).toBeVisible();
});

// ---------------------------------------------------------------------------
// GROUP-02 — Missing both patient email and phone — client-side validation
// ---------------------------------------------------------------------------
test('GROUP-02: missing patient email and phone shows validation error', async ({ page }) => {
  await page.goto('/groups/create');

  await page.locator('#groupName').fill('Group validation test');
  await page.locator('#patientFullName').fill('Test Patient');
  await page.locator('#dateOfBirth').fill('1960-01-15');
  await page.locator('#relationship').selectOption({ index: 1 });
  // Leave patientEmail and phone blank
  await page.getByRole('button', { name: /create circle/i }).click();

  // Should remain on create page
  await expect(page).toHaveURL(/\/groups\/create/);
  await expect(page.getByText(/email or phone/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// GROUP-03 — Future date of birth rejected client-side
// ---------------------------------------------------------------------------
test('GROUP-03: future date of birth shows validation error', async ({ page }) => {
  await page.goto('/groups/create');

  await page.locator('#groupName').fill('DOB validation test');
  await page.locator('#patientFullName').fill('Test Patient');
  // Set a date 1 year in the future
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);
  const futureDateStr = future.toISOString().split('T')[0];
  await page.locator('#dateOfBirth').fill(futureDateStr);
  await page.locator('#relationship').selectOption({ index: 1 });
  await page.locator('#patientEmail').fill('test@example.com');

  await page.getByRole('button', { name: /create circle/i }).click();

  await expect(page).toHaveURL(/\/groups\/create/);
  await expect(page.getByText(/future/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// GROUP-05 — Members page loads and lists at least one member
// ---------------------------------------------------------------------------
test('GROUP-05: members page loads and shows at least one member row', async ({ page }) => {
  await page.goto(`/groups/${GROUP_ID}/members`);

  // Wait for the table to appear (should not show LoadingPanel)
  await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 10_000 });

  // At minimum, the primary caregiver (test user) should appear
  const rows = page.locator('table tbody tr, [role="row"]');
  await expect(rows.first()).toBeVisible();
});
