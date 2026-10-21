import { useState, useEffect } from 'react';
import { registerServiceWorker, subscribeToPush, unsubscribeFromPush } from '../services/push.service';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!('Notification' in window)) return;

    setPermission(Notification.permission);

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (Notification.permission !== 'denied') {
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  const subscribe = async () => {
    try {
      const registration = await registerServiceWorker();
      if (!registration) return;
      await subscribeToPush(registration);
      setIsSubscribed(true);
      setPermission('granted');
    } catch (err) {
      console.error('Erro ao inscrever:', err);
      throw err;
    }
  };

  const unsubscribe = async () => {
    try {
      await unsubscribeFromPush();
      setIsSubscribed(false);
    } catch (err) {
      console.error('Erro ao desinscrever:', err);
      throw err;
    }
  };

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
}