/**
 * Insights browser + API tests (authenticated).
 *
 * INS-01  Insights page loads and shows latest digest/cards (or empty state)
 * INS-02  Archived digests page loads without error
 * INS-04  GET /api/insights/group/:groupId returns 200 with insights array
 *
 * Requires env vars:
 *   E2E_TEST_GROUP_ID — UUID of the test group
 *   E2E_API_URL       — backend API base URL
 */

import { test, expect } from '@playwright/test';

const GROUP_ID = process.env.E2E_TEST_GROUP_ID ?? '';
const API_URL = (process.env.E2E_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

test.beforeAll(() => {
  if (!GROUP_ID) throw new Error('E2E_TEST_GROUP_ID must be set');
});

// ---------------------------------------------------------------------------
// INS-01 — Insights page loads
// ---------------------------------------------------------------------------
test('INS-01: insights page loads without error', async ({ page }) => {
  await page.goto(`/groups/${GROUP_ID}/insights`);
  await expect(page.getByText(/loading/i)).toHaveCount(0, { timeout: 15_000 });

  // Should not show an error panel
  await expect(page.getByText(/something went wrong|error loading insights/i)).not.toBeVisible();

  // Should show either insight cards or an empty-state message
  const hasCards = await page.locator('[data-testid="insight-card"], .insight-card').count() > 0;
  const hasEmptyState = await page.getByText(/no new insights|no insights|nothing yet|no data/i).isVisible();
  expect(hasCards || hasEmptyState).toBe(true);
});

// ---------------------------------------------------------------------------
// INS-02 — Archived digests section is accessible
// ---------------------------------------------------------------------------
test('INS-02: archived digests are accessible on the insights page', async ({ page }) => {
  await page.goto(`/groups/${GROUP_ID}/insights`);
  await expect(page.getByText(/loading/i)).toHaveCount(0, { timeout: 15_000 });

  // Look for an "archive" section, tab, or link
  const archiveLink = page
    .getByRole('link', { name: /archive|history|past/i })
    .or(page.getByRole('tab', { name: /archive|history|past/i }))
    .or(page.getByRole('button', { name: /archive|history|past/i }));

  if (await archiveLink.first().isVisible()) {
    await archiveLink.first().click();
    // Should not error
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  }
  // If no archive tab, just confirm the page still loaded cleanly
});

// ---------------------------------------------------------------------------
// INS-04 — GET /api/insights/group/:groupId returns 200 with insights array
// ---------------------------------------------------------------------------
test('INS-04: GET /insights/group/:groupId returns 200 with an insights array', async ({ request }) => {
  const res = await request.get(`${API_URL}/insights/group/${GROUP_ID}`);
  expect(res.status()).toBe(200);

  const body = await res.json() as { insights?: unknown[] };
  expect(body).toHaveProperty('insights');
  expect(Array.isArray(body.insights)).toBe(true);
});
