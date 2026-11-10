import { useState, useEffect } from 'react';
import { registerServiceWorker, subscribeToPush, unsubscribeFromPush } from '../services/push.service';
import toast from 'react-hot-toast';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!('Notification' in window)) {
      setLoading(false);
      return;
    }

    setPermission(Notification.permission);

    const checkSubscription = async () => {
      try {
        // 🆕 Usa getRegistration() em vez de .ready para não travar em dev
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (err) {
        console.error('Erro ao checar inscrição:', err);
      } finally {
        setLoading(false); // 🆕 Garante que o botão destrave
      }
    };

    if (Notification.permission !== 'denied') {
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      // 🆕 Tenta registrar o SW (mesmo que o next-pwa não tenha gerado ainda)
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error('Service Worker não pôde ser registrado. Rode "pnpm build" para testar o PWA.');
      }

      await subscribeToPush(registration);
      setIsSubscribed(true);
      setPermission('granted');
      toast.success('Notificações ativadas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao inscrever:', err);
      toast.error(err.message || 'Erro ao ativar notificações.');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      setIsSubscribed(false);
      toast.success('Notificações desativadas.');
    } catch (err: any) {
      console.error('Erro ao desinscrever:', err);
      toast.error(err.message || 'Erro ao desativar notificações.');
    } finally {
      setLoading(false);
    }
  };

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
}