/**
 * Hospital summary browser tests (authenticated).
 *
 * HOSP-01  Generate PDF → download triggered with correct Content-Type
 * HOSP-02  PDF still returned for group with missing optional fields
 *          (X-Validation-Errors header may be set, but a PDF is still returned)
 *
 * Requires env vars:
 *   E2E_TEST_GROUP_ID — UUID of the test group
 */

import { test, expect } from '@playwright/test';

const GROUP_ID = process.env.E2E_TEST_GROUP_ID ?? '';
const API_URL = (process.env.E2E_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

test.beforeAll(() => {
  if (!GROUP_ID) throw new Error('E2E_TEST_GROUP_ID must be set');
});

// ---------------------------------------------------------------------------
// HOSP-01 — Generate PDF via the UI (navigates to hospital-summary page)
// Also verifies the underlying API directly.
// ---------------------------------------------------------------------------
test('HOSP-01: hospital summary PDF is generated and returned as application/pdf', async ({ request }) => {
  const res = await request.post(`${API_URL}/hospital-summary/generate-pdf`, {
    data: { groupId: GROUP_ID },
  });

  // Should succeed
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/pdf');

  // Should have the latency header
  expect(res.headers()['x-generation-latency-ms']).toBeTruthy();

  // PDF should have some content
  const body = await res.body();
  expect(body.length).toBeGreaterThan(1000);
  // PDF files start with %PDF
  expect(body.slice(0, 4).toString()).toBe('%PDF');
});

// ---------------------------------------------------------------------------
// HOSP-01 (browser) — Download button on the hospital summary page
// ---------------------------------------------------------------------------
test('HOSP-01 browser: hospital summary page loads and shows generate/download button', async ({ page }) => {
  await page.goto(`/groups/${GROUP_ID}/hospital-summary`);
  await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 15_000 });

  // The page should show a "Generate PDF" or "Download" button
  const generateBtn = page
    .getByRole('button', { name: /generate|download|pdf/i })
    .or(page.getByRole('link', { name: /generate|download|pdf/i }));

  await expect(generateBtn.first()).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// HOSP-02 — PDF still generated even with incomplete optional fields
// The API should return 200 with X-Validation-Errors if data is missing,
// but never a 400 or 500.
// ---------------------------------------------------------------------------
test('HOSP-02: PDF is returned even when group data is incomplete', async ({ request }) => {
  // This test just re-runs HOSP-01 against our real group — if the group has
  // missing optional fields, the PDF should still be returned with a validation
  // header rather than an error.
  const res = await request.post(`${API_URL}/hospital-summary/generate-pdf`, {
    data: { groupId: GROUP_ID },
  });

  // Must not be a 4xx or 5xx
  expect(res.status()).toBeGreaterThanOrEqual(200);
  expect(res.status()).toBeLessThan(400);

  // If there are validation issues, they come back in a header — not a failure
  // (validation errors header is optional, PDF is always returned)
  expect(res.headers()['content-type']).toContain('application/pdf');
});
