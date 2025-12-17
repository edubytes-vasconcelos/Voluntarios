

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
  // Configura as opções da notificação.
  // Para notificação PUSH, vamos também garantir que ICONE E BADGE sejam removidos temporariamente
  // para depuração do problema 'undefined'.
  const options = {
    body: data.body || 'Você tem uma nova mensagem na escala.',
    data: data.url || '/',
    vibrate: [100, 50, 100]
    // icon e badge são omitidos ou explicitamente removidos para este teste
  };

  // GARANTIA: Remove qualquer resquício de icon/badge que possa ter vindo na mensagem
  delete options.icon;
  delete options.badge;
  
  console.warn("Service Worker: Notificação PUSH disparada SEM ícone (modo de depuração para erro 'undefined').");
  console.log("Service Worker: Opções FINAIS da notificação PUSH:", options); // Log das opções finais

  event.waitUntil(
    self.registration.showNotification(title, options)
      .catch(error => {
        console.error("Service Worker: ERRO FATAL ao disparar notificação PUSH:", error);
        console.error("  Tipo do erro:", typeof error);
        if (error) { // Only attempt to log properties if error is not undefined/null
          console.error("  Nome do erro:", error.name || 'N/A');
          console.error("  Mensagem do erro:", error.message || 'N/A');
          console.error("  Pilha do erro:", error.stack || 'N/A');
          try {
            console.error("  Erro (JSON):", JSON.stringify(error));
          } catch (e) {
            console.error("  Não foi possível stringificar o erro para JSON (possível circular reference ou undefined).");
          }
        } else {
           console.error("  Objeto de erro era undefined ou null."); // Explicit log for this case
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
    // Destructuring para pegar apenas as propriedades necessárias do event.data
    const { title, body, tag } = event.data; 
    
    // Configura as opções da notificação.
    // Para notificação de TESTE, vamos garantir que ICONE E BADGE sejam removidos.
    // Isso é uma medida de DEBUG extrema para o problema 'undefined'.
    const options = {
      body: body,
      tag: tag,
      vibrate: [100, 50, 100]
      // icon e badge são omitidos ou explicitamente removidos para este teste
    };
    
    // GARANTIA: Remove qualquer resquício de icon/badge que possa ter vindo na mensagem
    delete options.icon;
    delete options.badge;
    
    console.warn("Service Worker: Notificação de teste disparada SEM ícone (modo de depuração para erro 'undefined').");
    
    console.log("Service Worker: Opções FINAIS da notificação de teste:", options); // Log das opções finais
    event.waitUntil(
      self.registration.showNotification(title, options)
        .catch(error => {
          console.error("Service Worker: ERRO FATAL ao disparar notificação de TESTE (recebida por mensagem):", error);
          console.error("  Tipo do erro:", typeof error);
          if (error) { // Only attempt to log properties if error is not undefined/null
            console.error("  Nome do erro:", error.name || 'N/A');
            console.error("  Mensagem do erro:", error.message || 'N/A');
            console.error("  Pilha do erro:", error.stack || 'N/A');
            try {
              console.error("  Erro (JSON):", JSON.stringify(error));
            } catch (e) {
              console.error("  Não foi possível stringificar o erro para JSON (possível circular reference ou undefined).");
            }
          } else {
             console.error("  Objeto de erro era undefined ou null."); // Explicit log for this case
          }
        })
    );
  }
});