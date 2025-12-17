

const NOTIFICATION_ICON_URL = "/icon.png"; // Aponta para um ícone local no diretório public/

self.addEventListener('install', (event) => {
  console.log("Service Worker: Evento 'install' disparado.");
  self.skipWaiting(); // Força a ativação imediata
});

self.addEventListener('activate', (event) => {
  console.log("Service Worker: Evento 'activate' disparado.");
  event.waitUntil(self.clients.claim()); // Controla a página imediatamente
});

self.addEventListener('push', function(event) {
  console.log("Service Worker: Evento 'push' recebido.");
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Nova Atualização - IASD Bosque';
  const options = {
    body: data.body || 'Você tem uma nova mensagem na escala.',
    icon: NOTIFICATION_ICON_URL, // Usando URL consistente (local)
    badge: NOTIFICATION_ICON_URL, // Usando URL consistente para o badge (local)
    data: data.url || '/',
    vibrate: [100, 50, 100]
  };

  console.log("Service Worker: Disparando notificação 'push' com opções:", options);
  event.waitUntil(
    self.registration.showNotification(title, options)
      .catch(error => {
        console.error("Service Worker: ERRO FATAL ao disparar notificação PUSH:", error);
        console.error("  Tipo do erro:", typeof error);
        if (error) {
          console.error("  Nome do erro:", error.name);
          console.error("  Mensagem do erro:", error.message);
          console.error("  Pilha do erro:", error.stack);
          try {
            console.error("  Erro (JSON):", JSON.stringify(error));
          } catch (e) {
            console.error("  Não foi possível stringificar o erro para JSON.");
          }
        }
      })
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log("Service Worker: Evento 'notificationclick' recebido.");
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

// Listener para mensagens do cliente (ex: para testar notificações)
self.addEventListener('message', function(event) {
  console.log("Service Worker: Mensagem recebida do cliente:", event.data);
  if (event.data && event.data.command === 'showTestNotification') {
    const { title, body, icon, tag } = event.data;
    const options = {
      body: body,
      icon: icon,
      tag: tag,
      vibrate: [100, 50, 100]
    };
    
    console.log("Service Worker: Disparando notificação de teste com opções:", options);
    event.waitUntil(
      self.registration.showNotification(title, options)
        .catch(error => {
          console.error("Service Worker: ERRO FATAL ao disparar notificação de TESTE (recebida por mensagem):", error);
          console.error("  Tipo do erro:", typeof error);
          if (error) {
            console.error("  Nome do erro:", error.name);
            console.error("  Mensagem do erro:", error.message);
            console.error("  Pilha do erro:", error.stack);
            try {
              console.error("  Erro (JSON):", JSON.stringify(error));
            } catch (e) {
              console.error("  Não foi possível stringificar o erro para JSON.");
            }
          }
        })
    );
  }
});
