/**
 * Medication browser tests (authenticated).
 *
 * MED-01   Create medication — daily, perpetual
 * MED-05   Non-as-needed medication missing course bounds — client-side error
 * MED-10   Pause a medication
 * MED-11   Activate (un-pause) a medication
 *
 * Requires env vars:
 *   E2E_TEST_GROUP_ID — UUID of the test group
 */

import { test, expect, Page } from '@playwright/test';

const GROUP_ID = process.env.E2E_TEST_GROUP_ID ?? '';
const ts = () => Date.now();

test.beforeAll(() => {
  if (!GROUP_ID) throw new Error('E2E_TEST_GROUP_ID must be set');
});

async function goToMedPage(page: Page) {
  await page.goto(`/groups/${GROUP_ID}/medications/add`);
  await expect(page).not.toHaveURL(/\/groups\/list/); // didn't redirect away
}

// ---------------------------------------------------------------------------
// MED-01 — Create medication (daily, perpetual)
// ---------------------------------------------------------------------------
test('MED-01: create daily perpetual medication succeeds', async ({ page }) => {
  await goToMedPage(page);

  const name = `E2E Med ${ts()}`;

  // The AddMedicationForm has fields — use placeholders/labels to locate them
  await page.getByLabel(/medication name/i).fill(name);
  await page.getByLabel(/dose/i).fill('100');
  await page.getByLabel(/unit/i).selectOption('mg');
  await page.getByLabel(/start date/i).fill(new Date().toISOString().split('T')[0]);

  // Schedule type — select daily
  await page.getByLabel(/schedule type/i).selectOption('daily');

  // Add a specific time — look for an "Add time" button or existing time input
  const timeInput = page.getByPlaceholder(/08:00|HH:MM|time/i).first();
  if (await timeInput.isVisible()) {
    await timeInput.fill('08:00');
  }

  // Perpetual checkbox
  const perpetualCheck = page.getByLabel(/perpetual|ongoing|no end date/i);
  if (await perpetualCheck.isVisible() && !(await perpetualCheck.isChecked())) {
    await perpetualCheck.check();
  }

  await page.getByRole('button', { name: /add medication|save|create/i }).click();

  // Should show success toast
  await expect(page.getByText(/medication added|added to schedule/i)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// MED-05 — Non-as-needed med without course bounds blocked client-side
// ---------------------------------------------------------------------------
test('MED-05: daily medication without course bounds shows validation error', async ({ page }) => {
  await goToMedPage(page);

  await page.getByLabel(/medication name/i).fill('Validation Test Med');
  await page.getByLabel(/dose/i).fill('50');
  await page.getByLabel(/unit/i).selectOption('mg');
  await page.getByLabel(/start date/i).fill(new Date().toISOString().split('T')[0]);
  await page.getByLabel(/schedule type/i).selectOption('daily');

  // Do NOT set perpetual, end date, or total doses

  await page.getByRole('button', { name: /add medication|save|create/i }).click();

  // Should show error about course bounds
  await expect(
    page.getByText(/perpetual|end date|total doses|course/i),
  ).toBeVisible({ timeout: 5_000 });
  // Should not have navigated away or shown a success toast
  await expect(page.getByText(/medication added|added to schedule/i)).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// MED-10 & MED-11 — Pause then activate a medication
// Looks for an active medication row on the schedule page and toggles it.
// ---------------------------------------------------------------------------
test('MED-10 & MED-11: pause then reactivate a medication', async ({ page }) => {
  await page.goto(`/groups/${GROUP_ID}/medications`);

  // Wait for the medications list to load
  await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 10_000 });

  // Find the first "Pause" button (active medication)
  const pauseBtn = page.getByRole('button', { name: /pause/i }).first();
  if (!(await pauseBtn.isVisible())) {
    test.skip(true, 'No active medications to pause on staging — skipping MED-10/11');
    return;
  }

  // MED-10 — Pause
  await pauseBtn.click();
  // Confirm in any confirmation modal that may appear
  const confirmBtn = page.getByRole('button', { name: /confirm|yes|pause/i });
  if (await confirmBtn.isVisible({ timeout: 2_000 })) {
    await confirmBtn.click();
  }
  await expect(page.getByText(/paused/i)).toBeVisible({ timeout: 10_000 });

  // MED-11 — Activate the same medication
  const activateBtn = page.getByRole('button', { name: /activate|resume/i }).first();
  await expect(activateBtn).toBeVisible({ timeout: 5_000 });
  await activateBtn.click();
  const confirmActivate = page.getByRole('button', { name: /confirm|yes|activate/i });
  if (await confirmActivate.isVisible({ timeout: 2_000 })) {
    await confirmActivate.click();
  }
  await expect(page.getByText(/active/i).first()).toBeVisible({ timeout: 10_000 });
});
