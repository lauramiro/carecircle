// CareCircle Service Worker — push notifications
// Handles incoming push events and notification click deep-links.

// Import Firebase Scripts for FCM Background processing
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: new URL(location).searchParams.get('apiKey') || null,
  projectId: new URL(location).searchParams.get('projectId') || null,
  messagingSenderId: new URL(location).searchParams.get('senderId') || null,
  appId: new URL(location).searchParams.get('appId') || null
};

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'null') {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      // Silent dismiss: a carer on another device marked the medication done.
      // Close the matching notification without showing a new banner.
      if (payload.data?.type === 'dismiss_alert' && payload.data?.checklistItemId) {
        self.registration
          .getNotifications({ tag: payload.data.checklistItemId })
          .then((notifications) => {
            notifications.forEach((n) => n.close());
          });
        return;
      }

      const title = payload.notification?.title ?? 'CareCircle';
      const body = payload.notification?.body ?? '';
      const url = payload.data?.url ?? '/';
      // checklistItemId is forwarded by PushDispatchService so we can tag the
      // notification and later target it for dismissal via getNotifications({ tag }).
      const checklistItemId = payload.data?.checklistItemId;

      self.registration.showNotification(title, {
        body,
        icon: '/vite.svg',
        tag: checklistItemId || undefined,
        data: { url },
      });
    });
  }
} catch (e) {
  console.warn("Firebase SW init failed", e);
}

// Fallback for raw Web Push (iOS Safari / Firefox VAPID)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'CareCircle', body: event.data.text() };
  }

  // Silent dismiss: another device acknowledged the medication.
  // Find the notification by its tag (checklist item ID) and close it without
  // showing any new banner. Works even when the app is closed.
  if (data.type === 'dismiss_alert' && data.checklistItemId) {
    event.waitUntil(
      self.registration
        .getNotifications({ tag: data.checklistItemId })
        .then((notifications) => {
          notifications.forEach((n) => n.close());
        }),
    );
    return;
  }

  // If this came from FCM, firebase handles it above. This checks if it's our raw VAPID payload.
  if (data.data?.url || !data.notification) {
    const title = data.title ?? 'CareCircle';
    const body = data.body ?? '';
    const url = data.data?.url ?? '/';
    // PushDispatchService sets `tag` to the checklist item ID on overdue alerts
    // so we can target them later with getNotifications({ tag }).
    const tag = typeof data.tag === 'string' ? data.tag : undefined;

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/vite.svg',
        tag,
        data: { url },
      }),
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (new URL(client.url).origin === self.location.origin) {
            return client.focus().then((c) => c.navigate(targetUrl));
          }
        }
        return clients.openWindow(targetUrl);
      }),
  );
});
