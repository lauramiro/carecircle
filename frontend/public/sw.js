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
      const title = payload.notification?.title ?? 'CareCircle';
      const body = payload.notification?.body ?? '';
      const url = payload.data?.url ?? '/';

      self.registration.showNotification(title, {
        body,
        icon: '/vite.svg',
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

  // If this came from FCM, firebase handles it above. This checks if it's our raw VAPID payload.
  if (data.data?.url || !data.notification) {
    const title = data.title ?? 'CareCircle';
    const body = data.body ?? '';
    const url = data.data?.url ?? '/';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/vite.svg',
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
