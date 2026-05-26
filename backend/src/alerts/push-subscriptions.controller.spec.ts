import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PushSubscriptionsController } from './push-subscriptions.controller';

describe('PushSubscriptionsController', () => {
  const pushSubRepo = {
    upsert: vi.fn(),
    deleteById: vi.fn(),
  };
  const appConfig = {
    config: { VAPID_PUBLIC_KEY: 'test-public-key' },
  };

  let controller: PushSubscriptionsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new PushSubscriptionsController(pushSubRepo as never, appConfig as never);
  });

  it('getVapidPublicKey returns configured public key', () => {
    expect(controller.getVapidPublicKey()).toEqual({ publicKey: 'test-public-key' });
  });

  it('register upserts a push subscription and returns its id', async () => {
    pushSubRepo.upsert.mockResolvedValue({ id: 'sub-1' });

    const result = await controller.register({
      userId: '11111111-1111-4111-8111-111111111111',
      platform: 'web_push',
      endpoint: 'https://push.example/1',
      p256dh: 'p256dh',
      auth: 'auth',
      userAgent: 'vitest',
    });

    expect(pushSubRepo.upsert).toHaveBeenCalledWith({
      userId: '11111111-1111-4111-8111-111111111111',
      platform: 'web_push',
      endpoint: 'https://push.example/1',
      p256dh: 'p256dh',
      auth: 'auth',
      userAgent: 'vitest',
    });
    expect(result).toEqual({ id: 'sub-1' });
  });

  it('unregister deletes subscription for the owning user', async () => {
    pushSubRepo.deleteById.mockResolvedValue(true);

    const result = await controller.unregister('sub-1', {
      userId: '11111111-1111-4111-8111-111111111111',
    });

    expect(pushSubRepo.deleteById).toHaveBeenCalledWith(
      'sub-1',
      '11111111-1111-4111-8111-111111111111',
    );
    expect(result).toEqual({ deleted: true });
  });
});
