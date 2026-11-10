'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@devlife/api-client';
import toast from 'react-hot-toast';
import { BellAlertIcon, BellSlashIcon } from '@heroicons/react/24/outline';

export default function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica suporte básico
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Erro ao verificar inscrição', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permissão para notificações negada.');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Envia para a API usando a rota que criamos (pushController)
      const response = await apiClient.post('/notifications/subscribe', subscription.toJSON());
      
      if (response.success) {
        setIsSubscribed(true);
        toast.success('Notificações ativadas com sucesso!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao ativar notificações.');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await apiClient.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
        setIsSubscribed(false);
        toast.success('Notificações desativadas.');
      }
    } catch (error) {
      toast.error('Erro ao desativar notificações.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
        Seu navegador não suporta notificações push.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BellAlertIcon className="w-5 h-5 text-blue-600" />
          Notificações Push (Web)
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Receba lembretes no seu navegador, mesmo com o app fechado.
        </p>
      </div>

      <button
        onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
        disabled={loading}
        className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
          isSubscribed
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } disabled:opacity-50`}
      >
        {isSubscribed ? (
          <>
            <BellSlashIcon className="w-5 h-5" />
            Desativar
          </>
        ) : (
          <>
            <BellAlertIcon className="w-5 h-5" />
            Ativar
          </>
        )}
      </button>
    </div>
  );
}