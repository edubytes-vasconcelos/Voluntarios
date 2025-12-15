
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força a ativação imediata
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // Controla a página imediatamente
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Nova Atualização - IASD Bosque';
  const options = {
    body: data.body || 'Você tem uma nova mensagem na escala.',
    icon: '/icon.png',
    badge: '/icon.png',
    data: data.url || '/',
    vibrate: [100, 50, 100]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data);
      }
    })
  );
});
