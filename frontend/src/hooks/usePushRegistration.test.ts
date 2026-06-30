import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { registerWebPushForUser, usePushRegistration } from './usePushRegistration';

const mockUseAuth = vi.hoisted(() =>
  vi.fn(() => ({
    session: { user: { id: 'user-123' } },
  })),
);

vi.mock('../contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

describe('usePushRegistration', () => {
  const fetchMock = vi.fn();
  const subscribeMock = vi.fn();
  const getSubscriptionMock = vi.fn();
  const registerMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(globalThis, 'PushManager', {
      configurable: true,
      writable: true,
      value: function PushManager() {},
    });
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: registerMock.mockResolvedValue({
          pushManager: {
            getSubscription: getSubscriptionMock,
            subscribe: subscribeMock,
          },
        }),
        ready: Promise.resolve({
          pushManager: {
            getSubscription: getSubscriptionMock,
            subscribe: subscribeMock,
          },
        }),
      },
    });
    getSubscriptionMock.mockResolvedValue(null);
    subscribeMock.mockResolvedValue({
      unsubscribe: vi.fn().mockResolvedValue(true),
      toJSON: () => ({
        endpoint: 'https://push.example/sub/1',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      }),
    });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ publicKey: 'test-vapid-key' }),
        json: async () => ({ publicKey: 'test-vapid-key' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'sub-1' }),
        json: async () => ({ id: 'sub-1' }),
      });
  });

  it('registers when permission is already granted on mount', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: {
        permission: 'granted',
        requestPermission: vi.fn(),
      },
    });

    const { result } = renderHook(() => usePushRegistration(true));

    await waitFor(() => {
      expect(result.current.status).toBe('registered');
    });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/push/subscriptions'), expect.any(Object));
  });

  it('register() syncs subscription when called explicitly', async () => {
    const { result } = renderHook(() => usePushRegistration(false));

    await result.current.register();

    await waitFor(() => {
      expect(result.current.status).toBe('registered');
    });

    expect(registerMock).toHaveBeenCalledWith(expect.stringContaining('/sw.js'), { scope: '/' });
    expect(subscribeMock).toHaveBeenCalledOnce();
  });

  it('does nothing when disabled', async () => {
    renderHook(() => usePushRegistration(false));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sets denied status when notification permission is denied', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: {
        permission: 'denied',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      },
    });

    const { result } = renderHook(() => usePushRegistration(true));

    await waitFor(() => {
      expect(result.current.status).toBe('denied');
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('registerWebPushForUser', () => {
  it('replaces an existing browser subscription before syncing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const unsubscribeMock = vi.fn().mockResolvedValue(true);
    const existing = {
      unsubscribe: unsubscribeMock,
      toJSON: () => ({
        endpoint: 'https://push.example/existing',
        keys: { p256dh: 'existing-p256dh', auth: 'existing-auth' },
      }),
    };
    const subscribeMock = vi.fn().mockResolvedValue({
      toJSON: () => ({
        endpoint: 'https://push.example/new',
        keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
      }),
    });

    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: { permission: 'granted', requestPermission: vi.fn() },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(existing),
            subscribe: subscribeMock,
          },
        }),
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(existing),
            subscribe: subscribeMock,
          },
        }),
      },
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ publicKey: 'test-vapid-key' }),
        json: async () => ({ publicKey: 'test-vapid-key' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'sub-1' }),
        json: async () => ({ id: 'sub-1' }),
      });

    await registerWebPushForUser('user-123');

    expect(unsubscribeMock).toHaveBeenCalledOnce();
    expect(subscribeMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/push/subscriptions'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('https://push.example/new'),
      }),
    );
  });
});
