import webpush from 'web-push';
import { prisma } from '../../../shared/database/prisma';
import { pushSubscriptionRepository } from '../repository/push-subscription.repository';

// Configurar VAPID (necessário para Web Push)
if (process.env.VAPID_SUBJECT && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export const pushService = {
  async subscribe(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    // Verificar se já existe
    await pushSubscriptionRepository.deleteByEndpoint(subscription.endpoint, userId);
    return pushSubscriptionRepository.create({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  },

  async unsubscribe(userId: string, endpoint: string) {
    return pushSubscriptionRepository.deleteByEndpoint(endpoint, userId);
  },

  async sendPushToUser(userId: string, title: string, body: string, data?: any) {
    // ============================================
    // 1. Enviar para a Web (Navegador)
    // ============================================
    const webSubscriptions = await pushSubscriptionRepository.findByUserId(userId);
    
    if (webSubscriptions.length > 0) {
      const payload = JSON.stringify({ title, body, data });
      await Promise.allSettled(
        webSubscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
          } catch (error: any) {
            // Se o endpoint expirou (410), remove a inscrição
            if (error.statusCode === 410) {
              await pushSubscriptionRepository.deleteByEndpoint(sub.endpoint, userId);
            }
          }
        })
      );
    }

    // ============================================
    // 2. Enviar para o Mobile (Expo Push API)
    // ============================================
    const devices = await prisma.userDevice.findMany({ where: { user_id: userId } });
    
    if (devices.length > 0) {
      const messages = devices.map((device) => ({
        to: device.push_token,
        sound: 'default',
        title: title,
        body: body,
        data: data || {},
      }));

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });

        const result = await response.json();

        // Limpeza: se o celular desinstalou o app, remove o token inválido do banco
        if (result.data) {
          const invalidTokens = result.data
            .filter((r: any) => r.status === 'error' && r.details?.error === 'DeviceNotRegistered')
            .map((_: any, index: number) => messages[index].to);

          if (invalidTokens.length > 0) {
            await prisma.userDevice.deleteMany({
              where: { push_token: { in: invalidTokens } },
            });
          }
        }
      } catch (error) {
        console.error('[PushService] Erro ao enviar Expo Push:', error);
      }
    }
  },
};