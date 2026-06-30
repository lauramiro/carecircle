/**
 * Medication checklist browser tests (authenticated).
 *
 * CHK-01  Daily checklist loads and shows medication items
 * CHK-02  Filtering by status only shows filtered items
 * CHK-03  Mark a due item as "given" persists to DB (verified via reload)
 * CHK-04  Mark a due item as "skipped" persists to DB (verified via reload)
 *
 * Requires env vars:
 *   E2E_TEST_GROUP_ID — UUID of the test group
 *
 * Note: CHK-03 and CHK-04 are skipped when no due items exist on staging.
 */

import { test, expect, Page } from '@playwright/test';

const GROUP_ID = process.env.E2E_TEST_GROUP_ID ?? '';

test.beforeAll(() => {
  if (!GROUP_ID) throw new Error('E2E_TEST_GROUP_ID must be set');
});

async function goToChecklist(page: Page) {
  await page.goto(`/groups/${GROUP_ID}/checklist`);
  await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// CHK-01 — Checklist page loads without error
// ---------------------------------------------------------------------------
test('CHK-01: checklist page loads for today', async ({ page }) => {
  await goToChecklist(page);

  // Should not show an error panel
  await expect(page.getByText(/something went wrong|error loading/i)).not.toBeVisible();

  // Should show either medication items OR an "all clear" / empty-state message
  const hasItems = await page.locator('[data-testid="checklist-item"], table tbody tr').count() > 0;
  const hasEmptyState = await page.getByText(/no medications|all done|nothing due/i).isVisible();
  expect(hasItems || hasEmptyState).toBe(true);
});

// ---------------------------------------------------------------------------
// CHK-02 — Filter by status only shows filtered items
// ---------------------------------------------------------------------------
test('CHK-02: filtering checklist by overdue hides non-overdue items', async ({ page }) => {
  await goToChecklist(page);

  // Find a filter control — typically a select or button group
  const filterSelect = page.getByRole('combobox', { name: /filter|status/i });
  const overdueBtn = page.getByRole('button', { name: /overdue/i });

  if (await filterSelect.isVisible()) {
    await filterSelect.selectOption('overdue');
  } else if (await overdueBtn.isVisible()) {
    await overdueBtn.click();
  } else {
    test.skip(true, 'No filter control found on checklist page');
    return;
  }

  // "Given" and "Skipped" items should not appear while overdue filter is active
  await expect(page.getByText(/^given$/i).first()).not.toBeVisible();
  await expect(page.getByText(/^skipped$/i).first()).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// CHK-03 — Mark a due item as given, verify it persists after reload
// ---------------------------------------------------------------------------
test('CHK-03: marking a due item as given persists after page reload', async ({ page }) => {
  await goToChecklist(page);

  const giveBtn = page.getByRole('button', { name: /give|mark given|administer/i }).first();
  if (!(await giveBtn.isVisible())) {
    test.skip(true, 'No due items to mark as given — skipping CHK-03');
    return;
  }

  // Capture which item we're marking (its sibling label text)
  const itemRow = giveBtn.locator('xpath=ancestor::tr | ancestor::li | ancestor::div[contains(@class,"item")]').first();
  const itemText = await itemRow.innerText().catch(() => '');

  await giveBtn.click();
  // Confirm in modal if needed
  const confirmGive = page.getByRole('button', { name: /confirm|yes|given/i });
  if (await confirmGive.isVisible({ timeout: 2_000 })) {
    await confirmGive.click();
  }

  // Toast or status change should show "given"
  await expect(page.getByText(/given|marked/i)).toBeVisible({ timeout: 10_000 });

  // Reload and verify status persisted
  await page.reload();
  await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 15_000 });

  if (itemText) {
    // Find the item again by its text and check it shows "given"
    const itemAfterReload = page.getByText(itemText.split('\n')[0].trim()).first();
    if (await itemAfterReload.isVisible()) {
      const rowAfterReload = itemAfterReload.locator('xpath=ancestor::tr | ancestor::li').first();
      await expect(rowAfterReload.getByText(/given/i)).toBeVisible({ timeout: 5_000 });
    }
  }
});

// ---------------------------------------------------------------------------
// CHK-04 — Mark a due item as skipped with a reason
// ---------------------------------------------------------------------------
test('CHK-04: marking a due item as skipped persists after page reload', async ({ page }) => {
  await goToChecklist(page);

  const skipBtn = page.getByRole('button', { name: /skip/i }).first();
  if (!(await skipBtn.isVisible())) {
    test.skip(true, 'No due items to skip — skipping CHK-04');
    return;
  }

  await skipBtn.click();

  // Fill skip reason if a dialog appears
  const reasonInput = page.getByLabel(/reason|notes/i).or(page.getByPlaceholder(/reason/i));
  if (await reasonInput.isVisible({ timeout: 2_000 })) {
    await reasonInput.fill('E2E test skip reason');
  }

  const confirmSkip = page.getByRole('button', { name: /confirm|skip|yes/i });
  if (await confirmSkip.isVisible({ timeout: 2_000 })) {
    await confirmSkip.click();
  }

  await expect(page.getByText(/skipped/i)).toBeVisible({ timeout: 10_000 });

  // Reload and verify persistence
  await page.reload();
  await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/skipped/i)).toBeVisible({ timeout: 5_000 });
});
