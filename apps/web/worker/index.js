// Escuta o evento de Push
self.addEventListener('push', function (event) {
  if (event.data) {
    let data = { title: 'DevLife', body: 'Nova notificação' };
    
    // Tenta ler como JSON (quando vem da sua API)
    try {
      data = event.data.json();
    } catch (e) {
      // Se não for JSON (como o teste do DevTools), usa texto puro
      data.body = event.data.text();
    }

    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png', // Puxa o ícone do seu PWA
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: { url: data.data?.url || '/' },
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Escuta o clique na notificação
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  // Abre a URL definida ou a raiz
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});