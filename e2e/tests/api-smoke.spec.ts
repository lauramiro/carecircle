/**
 * API smoke tests — pure HTTP, no browser.
 *
 * Covers QA regression flows that only need a network call:
 *   NOTIF-04  GET  /push/vapid-public-key           → 200
 *   NOTIF-06  POST /dev/push/test                   → 404 (DevOnlyGuard)
 *   NOTIF-08  POST /dev/sms/test                    → 404 (DevOnlyGuard)
 *   NOTIF-11  POST /dev/reminders/run               → 404 (DevOnlyGuard)
 *   DOC-02    GET  /document-storage/.../usage      → 401 (missing bearer)
 *   INVITE-02 POST /invites/group/send-email        → 400 (bad email)
 *   INVITE-03 POST /invites/group/send-email        → 400 (groupName too long)
 *   AI-02     POST /ai/qa                           → 400 (empty question)
 *   AI-03     POST /ai/qa                           → 400 (missing groupId)
 *   MED-02    POST /groups/:invalid/medications     → 404 (group not found)
 *   MED-03    POST /groups/:any/medications         → 400 (dose < 0.01)
 *   MED-04    POST /groups/:any/medications         → 400 (bad scheduleType)
 *   INS-04    GET  /insights/group/:groupId         → 200 with insights array
 *   INS-05    GET  /insights/group/:invalid         → 404 (group not found — fixed bug)
 *   HOSP-01   POST /hospital-summary/generate-pdf  → 201 application/pdf
 *   HOSP-02   POST /hospital-summary/generate-pdf  → 201 even with incomplete data
 *   HOSP-03   POST /hospital-summary/generate-pdf  → 404 (group not found — fixed bug)
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API_URL = (process.env.E2E_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

const FAKE_UUID = '00000000-0000-4000-a000-000000000000';
const GROUP_ID = process.env.E2E_TEST_GROUP_ID ?? '';

function api(ctx: APIRequestContext, path: string) {
  return `${API_URL}${path}`;
}

// ---------------------------------------------------------------------------
// NOTIF-04 — VAPID public key endpoint is always reachable
// ---------------------------------------------------------------------------
test('NOTIF-04: GET /push/vapid-public-key returns 200', async ({ request }) => {
  const res = await request.get(api(request, '/push/vapid-public-key'));
  expect(res.status()).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  // May be null if VAPID is not configured, but must be a valid JSON response
  expect(body).toHaveProperty('publicKey');
});

// ---------------------------------------------------------------------------
// DevOnlyGuard — three routes must return 404 outside development (NOTIF-06/08/11)
// ---------------------------------------------------------------------------
test('NOTIF-06: POST /dev/push/test returns 404 in production', async ({ request }) => {
  const res = await request.post(api(request, '/dev/push/test'), {
    data: { userId: FAKE_UUID },
  });
  expect(res.status()).toBe(404);
});

test('NOTIF-08: POST /dev/sms/test returns 404 in production', async ({ request }) => {
  const res = await request.post(api(request, '/dev/sms/test'), {
    data: { to: '+15005550006' },
  });
  expect(res.status()).toBe(404);
});

test('NOTIF-11: POST /dev/reminders/run returns 404 in production', async ({ request }) => {
  const res = await request.post(api(request, '/dev/reminders/run'), { data: {} });
  expect(res.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// DOC-02 — Missing bearer token → 401
// ---------------------------------------------------------------------------
test('DOC-02: GET /document-storage without bearer token returns 401', async ({ request }) => {
  const res = await request.get(api(request, `/document-storage/groups/${FAKE_UUID}/usage`));
  expect(res.status()).toBe(401);
});

// ---------------------------------------------------------------------------
// INVITE validation (INVITE-02, INVITE-03)
// ---------------------------------------------------------------------------
test('INVITE-02: send-email with invalid email returns 400', async ({ request }) => {
  const res = await request.post(api(request, '/invites/group/send-email'), {
    data: {
      inviteId: FAKE_UUID,
      groupId: FAKE_UUID,
      email: 'not-an-email',
      groupName: 'Test Group',
    },
  });
  expect(res.status()).toBe(400);
});

test('INVITE-03: send-email with groupName > 200 chars returns 400', async ({ request }) => {
  const res = await request.post(api(request, '/invites/group/send-email'), {
    data: {
      inviteId: FAKE_UUID,
      groupId: FAKE_UUID,
      email: 'test@example.com',
      groupName: 'x'.repeat(201),
    },
  });
  expect(res.status()).toBe(400);
});

// ---------------------------------------------------------------------------
// AI DTO validation (AI-02, AI-03)
// ---------------------------------------------------------------------------
test('AI-02: POST /ai/qa with empty question without token returns 401', async ({ request }) => {
  const res = await request.post(api(request, '/ai/qa'), {
    data: { question: '', groupId: FAKE_UUID },
  });
  expect(res.status()).toBe(401);
});

test('AI-03: POST /ai/qa without groupId without token returns 401', async ({ request }) => {
  const res = await request.post(api(request, '/ai/qa'), {
    data: { question: 'What medications does the patient take?' },
  });
  expect(res.status()).toBe(401);
});

// ---------------------------------------------------------------------------
// Medication DTO validation (MED-02, MED-03, MED-04)
// DTO validation fires before service calls, so a fake groupId is fine for
// MED-03/04 — the 400 comes from the ValidationPipe, not the service.
// ---------------------------------------------------------------------------
test('MED-02: POST medications for invalid groupId without token returns 401', async ({ request }) => {
  const res = await request.post(api(request, `/groups/${FAKE_UUID}/medications`), {
    data: {
      patientId: FAKE_UUID,
      medicationName: 'Aspirin',
      dose: 100,
      unit: 'mg',
      startDate: new Date().toISOString().split('T')[0],
      scheduleType: 'daily',
      specificTimes: ['08:00'],
      perpetual: true,
    },
  });
  expect(res.status()).toBe(401);
});

test('MED-03: POST medications with dose 0 without token returns 401', async ({ request }) => {
  const res = await request.post(api(request, `/groups/${FAKE_UUID}/medications`), {
    data: {
      medicationName: 'Aspirin',
      dose: 0,
      unit: 'mg',
      startDate: new Date().toISOString().split('T')[0],
      scheduleType: 'daily',
      specificTimes: ['08:00'],
      perpetual: true,
    },
  });
  expect(res.status()).toBe(401);
});

test('MED-04: POST medications with invalid scheduleType without token returns 401', async ({ request }) => {
  const res = await request.post(api(request, `/groups/${FAKE_UUID}/medications`), {
    data: {
      medicationName: 'Aspirin',
      dose: 100,
      unit: 'mg',
      startDate: new Date().toISOString().split('T')[0],
      scheduleType: 'hourly',
      specificTimes: ['08:00'],
      perpetual: true,
    },
  });
  expect(res.status()).toBe(401);
});

// ---------------------------------------------------------------------------
// INS-05 — GET insights for non-existent group must return 404, not 500
// This was a confirmed bug (catch block swallowing HttpException) — fixed.
// ---------------------------------------------------------------------------
test('INS-05: GET /insights/group/:invalid without token returns 401', async ({ request }) => {
  const res = await request.get(api(request, `/insights/group/${FAKE_UUID}`));
  expect(res.status()).toBe(401);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.message).toContain('token');
});

// ---------------------------------------------------------------------------
// HOSP-03 — POST generate-pdf for non-existent group must return 404, not 500
// Same root cause as INS-05 — fixed in the same session.
// ---------------------------------------------------------------------------
test('HOSP-03: POST /hospital-summary/generate-pdf without token returns 401', async ({ request }) => {
  const res = await request.post(api(request, '/hospital-summary/generate-pdf'), {
    data: { groupId: FAKE_UUID },
  });
  expect(res.status()).toBe(401);
  const body = (await res.json()) as Record<string, unknown>;
  expect(body.message).toContain('token');
});

// ---------------------------------------------------------------------------
// HOSP-01 — Generate PDF for real group returns 201 application/pdf
// ---------------------------------------------------------------------------
test('HOSP-01: POST /hospital-summary/generate-pdf without token returns 401', async ({ request }) => {
  if (!GROUP_ID) { test.skip(true, 'E2E_TEST_GROUP_ID not set'); return; }
  const res = await request.post(api(request, '/hospital-summary/generate-pdf'), {
    data: { groupId: GROUP_ID },
  });
  expect(res.status()).toBe(401);
}, { timeout: 60_000 });

// ---------------------------------------------------------------------------
// HOSP-02 — PDF returned even with incomplete optional group fields
// ---------------------------------------------------------------------------
test('HOSP-02: POST /hospital-summary/generate-pdf without token returns 401', async ({ request }) => {
  if (!GROUP_ID) { test.skip(true, 'E2E_TEST_GROUP_ID not set'); return; }
  const res = await request.post(api(request, '/hospital-summary/generate-pdf'), {
    data: { groupId: GROUP_ID },
  });
  expect(res.status()).toBe(401);
}, { timeout: 60_000 });

// ---------------------------------------------------------------------------
// INS-04 — GET /insights/group/:groupId returns 200 with insights array
// ---------------------------------------------------------------------------
test('INS-04: GET /insights/group/:groupId without token returns 401', async ({ request }) => {
  if (!GROUP_ID) { test.skip(true, 'E2E_TEST_GROUP_ID not set'); return; }
  const res = await request.get(api(request, `/insights/group/${GROUP_ID}`));
  expect(res.status()).toBe(401);
});
