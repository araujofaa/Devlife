// apps/web/public/push-worker.js
self.addEventListener('push', function (event) {
  if (event.data) {
    let data = { title: 'DevLife', body: 'Nova notificação' };
    
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }

    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: { url: data.data?.url || '/' },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});