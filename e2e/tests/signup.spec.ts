/**
 * Signup page — client-side validation tests (no real accounts created).
 *
 * AUTH-02  Weak password is rejected before any API call
 * AUTH-03  Mismatched confirm-password is rejected before any API call
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/signup');
});

// ---------------------------------------------------------------------------
// AUTH-02 — Weak password (too short, no digit, no special char)
// ---------------------------------------------------------------------------
test('AUTH-02: short password shows validation error and makes no API call', async ({ page }) => {
  const apiCalls: string[] = [];
  page.on('request', req => { if (req.url().includes('supabase')) apiCalls.push(req.url()); });

  await page.locator('#email').fill('test@example.com');
  await page.locator('#password').fill('weak');
  await page.locator('#confirmPassword').fill('weak');
  await page.getByRole('button', { name: /create account/i }).click();

  // Error shown, still on /signup
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  // No signUp call was made
  expect(apiCalls.filter(u => u.includes('/auth/'))).toHaveLength(0);
});

test('AUTH-02: password missing number shows validation error', async ({ page }) => {
  await page.locator('#email').fill('test@example.com');
  await page.locator('#password').fill('NoNumbersHere!');
  await page.locator('#confirmPassword').fill('NoNumbersHere!');
  await page.getByRole('button', { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByText(/number/i)).toBeVisible();
});

test('AUTH-02: password missing special character shows validation error', async ({ page }) => {
  await page.locator('#email').fill('test@example.com');
  await page.locator('#password').fill('NoSpecial123');
  await page.locator('#confirmPassword').fill('NoSpecial123');
  await page.getByRole('button', { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByText(/special character/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// AUTH-03 — Mismatched confirm-password
// ---------------------------------------------------------------------------
test('AUTH-03: mismatched confirm-password shows error and makes no API call', async ({ page }) => {
  const apiCalls: string[] = [];
  page.on('request', req => { if (req.url().includes('supabase')) apiCalls.push(req.url()); });

  await page.locator('#email').fill('test@example.com');
  await page.locator('#password').fill('Valid1!password');
  await page.locator('#confirmPassword').fill('Different1!password');
  await page.getByRole('button', { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByText(/do not match/i)).toBeVisible();
  expect(apiCalls.filter(u => u.includes('/auth/'))).toHaveLength(0);
});
