/*
 * The phone's notification bar, and nothing else.
 *
 * Chrome on Android only shows a notification a service worker hands it,
 * so `app/lib/notify.ts` registers this one when there is a notice to show
 * while the app is out of sight. It has no fetch handler and a scope no
 * page lives under: it cannot cache, intercept or change a single request.
 * Pressing the notice brings the app forward, or opens it if it was closed.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((open) => {
      const one = open.find((client) => 'focus' in client);
      if (one) return one.focus();
      return self.clients.openWindow('/');
    }),
  );
});
