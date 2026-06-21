import { describe, expect, it } from 'vitest';
import webpush from 'web-push';

const requiredEnv = [
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'VAPID_TEST_ENDPOINT',
  'VAPID_TEST_P256DH',
  'VAPID_TEST_AUTH',
] as const;

function missingRequiredEnv(): string[] {
  return requiredEnv.filter((name) => !process.env[name]);
}

const missing = missingRequiredEnv();
const describeIfConfigured = missing.length === 0 ? describe : describe.skip;

describeIfConfigured('VAPID delivery integration', () => {
  it('delivers a real Web Push notification to the configured test subscription', async () => {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );

    const result = await webpush.sendNotification(
      {
        endpoint: process.env.VAPID_TEST_ENDPOINT!,
        keys: {
          p256dh: process.env.VAPID_TEST_P256DH!,
          auth: process.env.VAPID_TEST_AUTH!,
        },
      },
      JSON.stringify({
        title: 'CareCircle CI push test',
        body: 'VAPID delivery test from automated checks.',
        data: { url: '/' },
      }),
    );

    expect([200, 201, 202]).toContain(result.statusCode);
  });
});

describe.skipIf(missing.length === 0)('VAPID delivery integration', () => {
  it(`skips real delivery because required env vars are missing: ${missing.join(', ')}`, () => {
    expect(missing.length).toBeGreaterThan(0);
  });
});
