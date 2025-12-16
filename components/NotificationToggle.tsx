

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, AlertTriangle, Check } from 'lucide-react';
import { db } from '@/services/db';

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
        setIsSimulated(true);
        return;
    }

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Verifica se já existe um Service Worker ativo
    navigator.serviceWorker.getRegistration()
    .then(reg => {
        if (reg) setSwRegistration(reg);
    })
    .catch(err => {
        // Se falhar (comum em iframes/stackblitz), usa modo simulado
        console.warn("Service Worker check failed, switching to simulated:", err);
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
        throw new Error("VAPID Key mal formatada.");
    }
  }

  const getVapidKey = () => {
      // Tenta ler do Vite (import.meta) ou do process.env com segurança
      let key = '';
      try {
          // @ts-ignore
          key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      } catch (e) {}
      
      if (!key) {
          try {
              key = process.env.VITE_VAPID_PUBLIC_KEY || '';
          } catch (e) {}
      }
      return key;
  }

  const subscribeToPush = async (reg: ServiceWorkerRegistration) => {
    const VAPID_PUBLIC_KEY = getVapidKey();
    
    if (!VAPID_PUBLIC_KEY) {
        // Lança erro específico para ser tratado no catch
        throw new Error("CHAVE_AUSENTE");
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const options: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
      applicationServerKey
    };

    const sub = await reg.pushManager.subscribe(options);
    
    if (userId) {
      await db.savePushSubscription(userId, sub);
    }
  };

  const handleEnable = async () => {
    if (!('Notification' in window)) {
      alert("Seu navegador não suporta notificações.");
      return;
    }

    setLoading(true);
    
    // Timeout de segurança para não travar
    const safetyTimeout = setTimeout(() => {
        if (loading) {
            setLoading(false);
            // Se demorar muito, assume simulado para não travar o usuário
            setIsSimulated(true);
        }
    }, 8000);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        if ('serviceWorker' in navigator) {
            try {
                // Registra o Service Worker
                let reg = await navigator.serviceWorker.register('/sw.js');
                setSwRegistration(reg);
                
                // Tenta fazer a subscrição real
                try {
                    await subscribeToPush(reg);
                    
                    // Sucesso Real
                    reg.showNotification('Notificações Ativadas!', {
                        body: 'Você receberá alertas da escala.',
                        icon: '/icon.png'
                    });

                } catch (subErr: any) {
                    // SE FALHAR A SUBSCRIÇÃO (Chave ausente ou erro de rede)
                    // ATIVA O MODO SIMULADO AUTOMATICAMENTE E SILENCIOSAMENTE
                    console.log("Modo Real falhou (provavelmente sem chave), ativando Simulado.", subErr.message);
                    setIsSimulated(true);
                }

            } catch (swErr: any) {
                console.error("Erro Fatal SW:", swErr);
                // Falha no SW (arquivo não encontrado etc), vai para simulado
                setIsSimulated(true);
            }
        } else {
            setIsSimulated(true);
        }
      } 
    } catch (e: any) {
      console.error("Erro geral:", e);
      setIsSimulated(true);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
     if (isSimulated) {
         // Notificação visual fake para teste
         if ('Notification' in window && Notification.permission === 'granted') {
             new Notification('🔔 Teste (Modo Simulado)', {
                 body: 'O sistema está funcionando! Em produção, isso seria uma notificação Push real.',
                 icon: '/icon.png'
             });
         } else {
             alert("🔔 [SIMULAÇÃO]\n\nNotificação visual enviada com sucesso!");
         }
         return;
     }

     if (swRegistration) {
         swRegistration.showNotification('Teste de Escala', {
             body: 'O sistema de notificações está funcionando neste dispositivo.',
             icon: '/icon.png',
             tag: 'test-notification'
         });
     }
  }

  // --- RENDER ---

  // Se estiver em modo simulado, mostra ícone Amarelo com alerta
  if (isSimulated && permission !== 'denied') {
       return (
          <button 
            onClick={handleTestNotification}
            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors relative group"
            title="Modo Simulado (Ambiente de Desenvolvimento)"
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

  // Se estiver real e funcionando, mostra ícone Verde/Azul
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

  // Estado inicial (Desativado)
  return (
    <button
      onClick={handleEnable}
      disabled={loading || permission === 'denied'}
      className={`p-2 rounded-full transition-colors relative ${
          permission === 'denied' ? 'text-gray-300 cursor-not-allowed' : 'text-brand-muted hover:text-brand-secondary hover:bg-gray-100'
      }`}
      title={permission === 'denied' ? 'Notificações bloqueadas pelo navegador' : 'Ativar Notificações'}
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : <BellOff size={20} />}
    </button>
  );
};

export default NotificationToggle;