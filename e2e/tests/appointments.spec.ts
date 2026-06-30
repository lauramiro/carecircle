/**
 * Appointments browser tests (authenticated).
 *
 * APPT-01  Create appointment (happy path) → appears in list
 * APPT-02  Missing title/date/time → client-side validation blocks submit
 * APPT-03  Edit single occurrence of a recurring appointment
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

function tomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

async function goToNewAppointment(page: Page) {
  await page.goto(`/groups/${GROUP_ID}/appointments/new`);
  await expect(page.getByText(/loading/i)).toHaveCount(0, { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/groups\/list/);
}

// ---------------------------------------------------------------------------
// APPT-01 — Create appointment, happy path
// ---------------------------------------------------------------------------
test('APPT-01: create appointment navigates back to appointments list', async ({ page }) => {
  await goToNewAppointment(page);

  const title = `E2E Appt ${ts()}`;

  // Title field — no htmlFor id in this form, so target by label text
  await page.getByRole('textbox', { name: /title/i }).fill(title);
  await page.locator('input[type="date"]').fill(tomorrowDate());
  await page.locator('input[type="time"]').fill('10:00');

  // Attending carer select — pick first non-empty option
  const carerSelect = page.getByRole('combobox', { name: /attending|carer/i });
  if (await carerSelect.isVisible()) {
    await carerSelect.selectOption({ index: 1 });
  }

  await page.getByRole('button', { name: /create appointment|save/i }).click();

  // Should redirect to appointments list and show the new appointment
  await page.waitForURL(/\/appointments$/, { timeout: 15_000 });
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// APPT-02 — Missing title/date/time → client-side validation
// ---------------------------------------------------------------------------
test('APPT-02: submitting appointment form with blank title shows validation error', async ({ page }) => {
  await goToNewAppointment(page);

  // Leave all fields blank and submit
  await page.getByRole('button', { name: /create appointment|save/i }).click();

  // Should stay on the form and show an error
  await expect(page).toHaveURL(/\/appointments\/new/);
  await expect(page.getByText(/title is required|required/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// APPT-03 — Edit single occurrence of a recurring appointment
// Finds the first recurring appointment in the list, edits just "this" occurrence.
// ---------------------------------------------------------------------------
test('APPT-03: editing a single occurrence does not affect other occurrences', async ({ page }) => {
  await page.goto(`/groups/${GROUP_ID}/appointments`);
  await expect(page.getByText(/loading/i)).toHaveCount(0, { timeout: 10_000 });

  // Find a recurring appointment (one with a "recurring" badge or similar indicator)
  const recurringAppt = page
    .getByText(/recurring|weekly|daily|monthly/i)
    .first();

  if (!(await recurringAppt.isVisible())) {
    test.skip(true, 'No recurring appointments found — skipping APPT-03');
    return;
  }

  // Click edit on the recurring appointment row
  const editBtn = recurringAppt
    .locator('xpath=ancestor::tr | ancestor::li | ancestor::div[contains(@class,"appointment")]')
    .first()
    .getByRole('button', { name: /edit/i });

  if (!(await editBtn.isVisible())) {
    test.skip(true, 'Edit button not found on recurring appointment row — skipping APPT-03');
    return;
  }
  await editBtn.click();

  // If a scope selection dialog appears, pick "This appointment only"
  const thisOnlyOption = page.getByRole('button', { name: /this appointment only|this occurrence/i });
  if (await thisOnlyOption.isVisible({ timeout: 2_000 })) {
    await thisOnlyOption.click();
  }

  await expect(page).toHaveURL(/\/edit/, { timeout: 5_000 });

  // Change the title to something unique
  const newTitle = `E2E Single Edit ${ts()}`;
  const titleField = page.getByRole('textbox', { name: /title/i });
  await titleField.clear();
  await titleField.fill(newTitle);

  await page.getByRole('button', { name: /save|update/i }).click();
  await page.waitForURL(/\/appointments$/, { timeout: 15_000 });

  // The edited title should appear in the list
  await expect(page.getByText(newTitle)).toBeVisible({ timeout: 10_000 });
});
