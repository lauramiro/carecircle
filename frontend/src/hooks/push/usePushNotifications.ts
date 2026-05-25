import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function getSession(): Promise<{ userId: string } | null> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  return userId ? { userId } : null;
}

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/vapid-public-key');
    if (!res.ok) return null;
    const json = (await res.json()) as { publicKey: string | null };
    return json.publicKey;
  } catch {
    return null;
  }
}

async function syncSubscriptionToBackend(userId: string, subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
  await fetch('/api/push/subscriptions', {
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
}

async function registerPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const session = await getSession();
  if (!session) return;

  const vapidPublicKey = await fetchVapidPublicKey();
  if (!vapidPublicKey) return;

  if (Notification.permission === 'denied') return;
  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
  }

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  await syncSubscriptionToBackend(session.userId, subscription).catch(() => {});
}

/**
 * Silently registers Web Push after login if permission is already granted,
 * matching the pattern used by usePushRegistration for manual opt-in.
 */
export function usePushNotifications(isAuthenticated: boolean): void {
  const attempted = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || attempted.current) return;
    attempted.current = true;
    void registerPush();
  }, [isAuthenticated]);
}
