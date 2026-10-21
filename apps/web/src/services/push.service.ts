import { apiClient } from '@devlife/api-client';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Service Worker ou Push não suportados');
    return null;
  }

  const registration = await navigator.serviceWorker.register('/service-worker.js', {
    scope: '/',
  });
  console.log('SW registrado:', registration);

  return registration;
}

export async function subscribeToPush(registration: ServiceWorkerRegistration) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão negada para notificações');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  // 🆕 Usa toJSON() para acessar as chaves (endpoint, p256dh, auth)
  const subscriptionJSON = subscription.toJSON();
  const { endpoint, keys } = subscriptionJSON;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Inscrição de push inválida');
  }

  await apiClient.post('/notifications/subscribe', {
    endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    await apiClient.post('/notifications/unsubscribe', {
      endpoint: subscription.endpoint,
    });
  }
}