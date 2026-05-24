import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export type PushRegistrationStatus =
  | 'idle'
  | 'unsupported'
  | 'prompting'
  | 'registered'
  | 'denied'
  | 'error';

export interface PushRegistrationState {
  status: PushRegistrationStatus;
  errorMessage: string | null;
  register: () => Promise<void>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    view[i] = raw.charCodeAt(i);
  }
  return view;
}

function pushUnsupportedReason(): string | null {
  if (!('serviceWorker' in navigator)) return 'Service workers are not supported in this browser.';
  if (!('PushManager' in window)) return 'Push notifications are not supported in this browser.';
  if (!('Notification' in window)) return 'Notifications are not supported in this browser.';
  return null;
}

async function syncSubscriptionToBackend(
  userId: string,
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  const response = await fetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      platform: 'web_push',
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message ?? `Server returned ${response.status}`;
    throw new Error(message);
  }
}

export async function registerWebPushForUser(userId: string): Promise<void> {
  const unsupported = pushUnsupportedReason();
  if (unsupported) throw new Error(unsupported);

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked. Enable them in your browser site settings for CareCircle.'
        : 'Notification permission was not granted.',
    );
  }

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;

  const keyResponse = await fetch('/api/push/vapid-public-key');
  if (!keyResponse.ok) {
    throw new Error('Could not load push configuration from the server.');
  }

  const { publicKey } = (await keyResponse.json()) as { publicKey: string | null };
  if (!publicKey) {
    throw new Error('Push notifications are not configured on the server.');
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await syncSubscriptionToBackend(userId, subscription);
}

export function usePushRegistration(enabled = true): PushRegistrationState {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const autoAttemptedRef = useRef(false);
  const [status, setStatus] = useState<PushRegistrationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const register = useCallback(async () => {
    if (!userId) return;

    const unsupported = pushUnsupportedReason();
    if (unsupported) {
      setStatus('unsupported');
      setErrorMessage(unsupported);
      return;
    }

    setStatus('prompting');
    setErrorMessage(null);

    try {
      await registerWebPushForUser(userId);
      setStatus('registered');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not enable push notifications.';
      if (message.toLowerCase().includes('blocked') || Notification.permission === 'denied') {
        setStatus('denied');
      } else {
        setStatus('error');
      }
      setErrorMessage(message);
      if (import.meta.env.DEV) {
        console.warn('[push] registration failed:', err);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId || autoAttemptedRef.current) return;

    const unsupported = pushUnsupportedReason();
    if (unsupported) {
      setStatus('unsupported');
      setErrorMessage(unsupported);
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      setErrorMessage(
        'Notifications are blocked. Enable them in your browser site settings for CareCircle.',
      );
      return;
    }

    autoAttemptedRef.current = true;

    // Browsers allow silent re-sync when permission is already granted.
    if (Notification.permission === 'granted') {
      void register();
    }
  }, [enabled, register, userId]);

  return { status, errorMessage, register };
}
