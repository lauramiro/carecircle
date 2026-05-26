// CareCircle Service Worker — push notifications
// Handles incoming push events and notification click deep-links.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'CareCircle', body: event.data.text() };
  }

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
