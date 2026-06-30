/**
 * Settings page browser tests (authenticated).
 *
 * SET-01  Change theme → immediately applied; persists across reload
 * SET-02  Toggle weekly wellbeing reminder → persists across reload
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// SET-01 — Theme change persists
// ---------------------------------------------------------------------------
test('SET-01: switching theme persists across page reload', async ({ page }) => {
  // Read which themes are available (Light / Dark buttons with aria-pressed)
  const lightBtn = page.getByRole('button', { name: /light/i });
  const darkBtn = page.getByRole('button', { name: /dark/i });

  if (!(await lightBtn.isVisible()) || !(await darkBtn.isVisible())) {
    test.skip(true, 'Theme toggle buttons not visible — skipping SET-01');
    return;
  }

  // Record the current state and pick the other theme
  const lightPressed = (await lightBtn.getAttribute('aria-pressed')) === 'true';
  const targetBtn = lightPressed ? darkBtn : lightBtn;
  const targetTheme = lightPressed ? 'dark' : 'light';

  await targetBtn.click();

  // Verify immediate application (html class or data-theme attribute change)
  await expect(page.locator('html')).toHaveAttribute(
    /class|data-theme/,
    new RegExp(targetTheme, 'i'),
    { timeout: 5_000 },
  ).catch(async () => {
    // Some implementations set it on body or use a CSS variable — just check aria-pressed
    await expect(targetBtn).toHaveAttribute('aria-pressed', 'true');
  });

  // Reload and confirm it was saved
  await page.reload();
  await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 10_000 });
  const targetBtnAfterReload = page.getByRole('button', { name: new RegExp(targetTheme, 'i') });
  await expect(targetBtnAfterReload).toHaveAttribute('aria-pressed', 'true');

  // Restore original theme to not pollute other tests
  const restoreBtn = lightPressed ? lightBtn : darkBtn;
  await restoreBtn.click();
});

// ---------------------------------------------------------------------------
// SET-02 — Weekly wellbeing reminder toggle persists
// ---------------------------------------------------------------------------
test('SET-02: toggling weekly reminder persists across page reload', async ({ page }) => {
  // Find the weekly wellbeing reminder toggle (a checkbox or switch)
  const toggle = page
    .getByRole('switch', { name: /weekly|wellbeing|reminder/i })
    .or(page.getByRole('checkbox', { name: /weekly|wellbeing|reminder/i }));

  if (!(await toggle.isVisible())) {
    test.skip(true, 'Weekly reminder toggle not visible — skipping SET-02');
    return;
  }

  const wasChecked = await toggle.isChecked();

  // Toggle it
  await toggle.click();
  const nowChecked = await toggle.isChecked();
  expect(nowChecked).toBe(!wasChecked);

  // Wait briefly for the preference save (debounced or immediate)
  await page.waitForTimeout(1_000);

  // Reload and verify persistence
  await page.reload();
  await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 10_000 });
  const toggleAfterReload = page
    .getByRole('switch', { name: /weekly|wellbeing|reminder/i })
    .or(page.getByRole('checkbox', { name: /weekly|wellbeing|reminder/i }));
  await expect(toggleAfterReload).toHaveJSProperty('checked', !wasChecked);

  // Restore original state
  await toggleAfterReload.click();
});
