
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, AlertTriangle, Check } from 'lucide-react';
import { db } from '../services/db';

interface NotificationToggleProps {
  userId?: string;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({ userId }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    // Verifica suporte do navegador
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log("Notificações: Navegador não suporta ou sem Service Worker. Modo simulado.");
        setIsSimulated(true);
        return;
    }

    if ('Notification' in window) {
      setPermission(Notification.permission);
      console.log("Notificações: Permissão inicial:", Notification.permission);
    }
    
    // Verifica se já existe um Service Worker ativo
    navigator.serviceWorker.getRegistration()
    .then(reg => {
        if (reg) {
            setSwRegistration(reg);
            console.log("Notificações: Service Worker registrado:", reg);
        } else {
            console.log("Notificações: Nenhum Service Worker encontrado inicialmente.");
        }
    })
    .catch(err => {
        // Se falhar (comum em iframes/stackblitz), usa modo simulado
        console.warn("Notificações: Verificação do Service Worker falhou, mudando para simulado:", err, "Tipo do erro:", typeof err);
        setIsSimulated(true);
    });

  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    try {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
    
        for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (e) {
        console.error("Notificações: Erro ao decodificar chave VAPID:", e, "Tipo do erro:", typeof e);
        throw new Error("VAPID Key mal formatada.");
    }
  }

  const getVapidKey = () => {
      // Tenta ler do Vite (import.meta) ou do process.env com segurança
      let key = '';
      try {
          // @ts-ignore: Vite's import.meta.env is not fully typed globally
          key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          console.log("Notificações: VAPID Key (import.meta.env):", key ? "Encontrada" : "Ausente");
      } catch (e) {
          console.warn("Notificações: Erro ao tentar ler VITE_VAPID_PUBLIC_KEY de import.meta.env:", e, "Tipo do erro:", typeof e);
      }
      
      // Fallback para process.env, útil em alguns setups ou para compatibilidade
      if (!key) {
          try {
              key = process.env.VITE_VAPID_PUBLIC_KEY || '';
              console.log("Notificações: VAPID Key (process.env):", key ? "Encontrada" : "Ausente");
          } catch (e) {
              console.warn("Notificações: Erro ao tentar ler VITE_VAPID_PUBLIC_KEY de process.env:", e, "Tipo do erro:", typeof e);
          }
      }
      return key;
  }

  const subscribeToPush = async (reg: ServiceWorkerRegistration) => {
    const VAPID_PUBLIC_KEY = getVapidKey();
    
    if (!VAPID_PUBLIC_KEY) {
        console.error("Notificações: VAPID_PUBLIC_KEY ausente. Não é possível subscrever a notificações push reais.");
        // Lança erro específico para ser tratado no catch
        throw new Error("CHAVE_VAPID_AUSENTE");
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const options: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
      applicationServerKey
    };

    const sub = await reg.pushManager.subscribe(options);
    
    if (userId) {
      await db.savePushSubscription(userId, sub);
      console.log("Notificações: Subscrição salva no DB para userId:", userId);
    }
  };

  const handleEnable = async () => {
    if (!('Notification' in window)) {
      alert("Seu navegador não suporta notificações.");
      return;
    }

    setLoading(true);
    console.log("Notificações: Iniciando ativação...");
    
    // Timeout de segurança para não travar
    const safetyTimeout = setTimeout(() => {
        if (loading) {
            setLoading(false);
            console.warn("Notificações: Ativação demorou demais, caindo para modo simulado.");
            setIsSimulated(true);
            alert("Não foi possível ativar as notificações reais. Tente configurar as chaves VAPID ou verifique as permissões do navegador.");
        }
    }, 15000); // Aumentado para 15 segundos

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      console.log("Notificações: Permissão concedida:", perm);

      if (perm === 'granted') {
        if ('serviceWorker' in navigator) {
            try {
                // Registra o Service Worker
                let reg = await navigator.serviceWorker.register('/sw.js');
                setSwRegistration(reg);
                console.log("Notificações: Service Worker registrado com sucesso:", reg);
                
                // Tenta fazer a subscrição real
                try {
                    await subscribeToPush(reg);
                    
                    // Sucesso Real - Exibe uma notificação de teste real via SW
                    reg.showNotification('Notificações Ativadas!', {
                        body: 'Você receberá alertas da escala.',
                        icon: '/icon.png'
                    });
                    console.log("Notificações: Subscrição push bem-sucedida e notificação de teste enviada.");

                } catch (subErr: any) {
                    console.error("Notificações: Falha na subscrição push real (VAPID Key ou outro erro):", subErr, "Tipo do erro:", typeof subErr);
                    // SE FALHAR A SUBSCRIÇÃO (Chave ausente, erro de rede, VAPID mal formatada etc)
                    // ATIVA O MODO SIMULADO AUTOMATICAMENTE E SILENCIOSAMENTE para o Service Worker ainda poder mostrar notificações locais.
                    setIsSimulated(true);
                    alert("As notificações foram ativadas, mas a funcionalidade de Push em segundo plano pode estar limitada (verifique as chaves VAPID no seu ambiente). O teste local deve funcionar.");
                }

            } catch (swErr: any) {
                console.error("Notificações: Erro Fatal ao registrar SW. Caindo para modo simulado:", swErr, "Tipo do erro:", typeof swErr);
                // Falha no SW (arquivo não encontrado etc), vai para simulado
                setIsSimulated(true);
                alert("Erro ao configurar o serviço de notificações (Service Worker). Notificações limitadas.");
            }
        } else {
            console.log("Notificações: navigator.serviceWorker não disponível. Modo simulado.");
            setIsSimulated(true);
        }
      } else {
          console.log("Notificações: Permissão não concedida (", perm, ").");
      }
    } catch (e: any) {
      console.error("Notificações: Erro geral no handleEnable:", e, "Tipo do erro:", typeof e);
      setIsSimulated(true);
      alert("Ocorreu um erro ao tentar ativar as notificações.");
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
      console.log("Notificações: Ativação finalizada. isSimulated:", isSimulated, "Permission:", permission);
    }
  };

  const handleTestNotification = async () => {
    // Top-level try-catch for any unexpected rejections
    try {
        console.log("Notificações: Testar Notificação clicado.");
        console.log("Notificações: Estado atual - isSimulated:", isSimulated, "Permission:", permission, "swRegistration:", swRegistration);

        if (isSimulated) {
            // Notificação visual fake para teste no modo simulado
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification('🔔 Teste (Modo Simulado)', {
                        body: 'O sistema está funcionando! Em produção, isso seria uma notificação Push real.',
                        icon: '/icon.png'
                    });
                    console.log("Notificações: Notificação new Notification() disparada em modo simulado.");
                } catch (e) {
                    console.warn("Notificações: Falha ao disparar new Notification() em modo simulado, fallback para alert():", e, "Tipo do erro:", typeof e);
                    alert("🔔 [SIMULAÇÃO]\n\nNotificação visual enviada com sucesso (via alert, pois a notificação nativa falhou ou não tem permissão para a aba).");
                }
            } else {
                // Fallback para alert() se a permissão não for granted (para a aba atual)
                console.log("Notificações: new Notification() não possível em modo simulado, disparando alert().");
                alert("🔔 [SIMULAÇÃO]\n\nNotificação visual enviada com sucesso (via alert, pois a notificação nativa falhou ou não tem permissão para a aba).");
            }
            return;
        }

        if (swRegistration) {
            try {
                await swRegistration.showNotification('Teste de Escala', {
                    body: 'O sistema de notificações está funcionando neste dispositivo.',
                    icon: '/icon.png',
                    tag: 'test-notification'
                });
                console.log("Notificações: Notificação via swRegistration.showNotification() disparada.");
            } catch (e) {
                console.error("Notificações: Erro ao disparar notificação via swRegistration.showNotification():", e, "Tipo do erro:", typeof e);
                alert("Erro ao disparar notificação de teste (via Service Worker). Verifique as permissões do navegador ou o status do Service Worker. Detalhes no console.");
            }
        } else {
            console.warn("Notificações: swRegistration não disponível para teste real, apesar de não estar em modo simulado. Algo está inconsistente.");
            alert("O Service Worker não está registrado ou disponível para enviar notificações. Tente recarregar a página ou ativar as notificações.");
        }
    } catch (e: any) {
        console.error("Notificações: Erro inesperado no handleTestNotification:", e, "Tipo do erro:", typeof e);
        alert("Ocorreu um erro inesperado ao testar a notificação. Verifique o console para mais detalhes.");
    }
  }

  // --- RENDER ---

  // Se estiver em modo simulado (Service Worker não funciona ou chaves VAPID ausentes/inválidas), mostra ícone Amarelo com alerta
  // E só se a permissão não foi explicitamente negada
  if (isSimulated && permission !== 'denied') {
       return (
          <button 
            onClick={handleTestNotification}
            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors relative group"
            title="Modo Simulado (Ambiente de Desenvolvimento ou chaves VAPID ausentes)"
          >
              <AlertTriangle size={20} />
              {/* Indicador de Status */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full border border-white"></span>
              
              {/* Tooltip */}
              <span className="absolute right-0 top-full mt-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  Testar (Simulado)
              </span>
          </button>
       );
  }

  // Se estiver real e funcionando (permissão concedida E Service Worker registrado)
  if (permission === 'granted' && swRegistration) {
      return (
          <button 
            onClick={handleTestNotification}
            className="p-2 text-brand-primary hover:bg-brand-accent/20 rounded-full transition-colors relative group"
            title="Notificações Ativas"
          >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
              <span className="absolute right-0 top-full mt-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  Testar Notificação
              </span>
          </button>
      )
  }

  // Estado inicial (Desativado ou Permission 'default') ou Permission 'denied'
  return (
    <button
      onClick={handleEnable}
      disabled={loading || permission === 'denied'}
      className={`p-2 rounded-full transition-colors relative ${
          permission === 'denied' ? 'text-gray-300 cursor-not-allowed' : 'text-brand-muted hover:text-brand-secondary hover:bg-gray-100'
      }`}
      title={permission === 'denied' ? 'Notificações bloqueadas pelo navegador. Habilite nas configurações do site.' : 'Ativar Notificações'}
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : <BellOff size={20} />}
    </button>
  );
};

export default NotificationToggle;
