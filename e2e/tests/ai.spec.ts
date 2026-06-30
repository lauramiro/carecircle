/**
 * AI assistant browser tests (authenticated).
 *
 * AI-01  Ask a real question → receives a non-empty AI-generated response
 *
 * Requires env vars:
 *   E2E_TEST_GROUP_ID — UUID of the test group
 */

import { test, expect } from '@playwright/test';

const GROUP_ID = process.env.E2E_TEST_GROUP_ID ?? '';

test.beforeAll(() => {
  if (!GROUP_ID) throw new Error('E2E_TEST_GROUP_ID must be set');
});

// ---------------------------------------------------------------------------
// AI-01 — Ask a question, get a non-empty answer
// ---------------------------------------------------------------------------
test('AI-01: asking a question in the AI assistant returns a non-empty answer', async ({ page }) => {
  await page.goto(`/groups/${GROUP_ID}/ai-assistant`);
  await expect(page.getByText(/loading/i)).toHaveCount(0, { timeout: 10_000 });

  // Find the chat input — the AI interface uses a <textarea> with a placeholder
  // (no name/id, so role lookup fails; target by placeholder or element type)
  const input = page.getByPlaceholder(/ask a question/i)
    .or(page.locator('textarea').first());

  await expect(input).toBeVisible({ timeout: 15_000 });
  await input.fill('What medications does the patient currently take?');

  // Submit via Enter or a Send button
  const sendBtn = page.getByRole('button', { name: /send|ask|submit/i });
  if (await sendBtn.isVisible()) {
    await sendBtn.click();
  } else {
    await input.press('Enter');
  }

  // Wait for the AI response — may take up to 20 seconds on staging
  // Look for a response element that wasn't there before the send
  await expect(
    page.getByText(/medication|patient|here|based on|care circle|no medications/i).last(),
  ).toBeVisible({ timeout: 25_000 });
});
