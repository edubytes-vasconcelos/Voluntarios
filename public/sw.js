

const NOTIFICATION_ICON_URL = "https://ui-avatars.com/api/?name=GE&background=004a5e&color=fff&size=192&rounded=true";

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
    icon: NOTIFICATION_ICON_URL, // Usando URL consistente
    badge: NOTIFICATION_ICON_URL, // Usando URL consistente para o badge
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

// NOVO: Listener para mensagens do cliente (ex: para testar notificações)
self.addEventListener('message', function(event) {
  if (event.data && event.data.command === 'showTestNotification') {
    const { title, body, icon, tag } = event.data;
    const options = {
      body: body,
      icon: icon,
      tag: tag,
      vibrate: [100, 50, 100]
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
        .catch(error => {
          console.error("Service Worker: Erro ao disparar notificação recebida por mensagem:", error, "Tipo do erro:", typeof error);
        })
    );
  }
});
