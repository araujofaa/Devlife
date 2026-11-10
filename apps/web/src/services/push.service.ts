import { apiClient } from '@devlife/api-client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Service Worker ou Push não suportados');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready; 
    console.log('SW registrado e ativo:', registration);
    return registration;
  } catch (error) {
    console.error('Erro ao registrar o Service Worker:', error);
    return null;
  }
}

export async function subscribeToPush(registration: ServiceWorkerRegistration) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão negada para notificações');
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('VAPID_PUBLIC_KEY não configurada no .env');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const subscriptionJSON = subscription.toJSON();
  const { endpoint, keys } = subscriptionJSON;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Inscrição de push inválida');
  }

  await apiClient.post('/notifications/subscribe', {
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
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