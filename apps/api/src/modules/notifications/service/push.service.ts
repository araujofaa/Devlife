import webpush from 'web-push';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../../../shared/database/prisma';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const expo = new Expo();

export const pushService = {
  async subscribe(userId: string, payload: any) {
    if (payload.endpoint) {
      await prisma.pushSubscription.upsert({
        where: { endpoint: payload.endpoint },
        update: { user_id: userId, p256dh: payload.keys.p256dh, auth: payload.keys.auth },
        create: { user_id: userId, endpoint: payload.endpoint, p256dh: payload.keys.p256dh, auth: payload.keys.auth },
      });
    } else if (payload.expoToken) {
      await prisma.pushSubscription.upsert({
        where: { expo_token: payload.expoToken },
        update: { user_id: userId },
        create: { user_id: userId, expo_token: payload.expoToken, endpoint: null, p256dh: null, auth: null },
      });
    }
  },

  async unsubscribe(userId: string, payload: { endpoint?: string; expoToken?: string }) {
    if (payload.endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { user_id: userId, endpoint: payload.endpoint } });
    }
    if (payload.expoToken) {
      await prisma.pushSubscription.deleteMany({ where: { user_id: userId, expo_token: payload.expoToken } });
    }
  },

  async sendPushToUser(userId: string, title: string, body: string, data: any = {}) {
    console.log(`\n=========================================`);
    console.log(`🚀 [PUSH SERVICE] Iniciando envio para o usuário: ${userId}`);
    
    const subscriptions = await prisma.pushSubscription.findMany({ where: { user_id: userId } });
    console.log(`🔍 [PUSH SERVICE] Encontradas ${subscriptions.length} inscrição(ões) no banco.`);

    if (subscriptions.length === 0) {
      console.log('❌ [PUSH SERVICE] Nenhuma inscrição. Abortando.');
      console.log(`=========================================\n`);
      return;
    }

    const webSubs = subscriptions.filter((s) => s.endpoint);
    const webPayload = JSON.stringify({ title, body, data });
    
    for (const sub of webSubs) {
      const pushSubscription = {
        endpoint: sub.endpoint!,
        keys: { p256dh: sub.p256dh!, auth: sub.auth! },
      };

      try {
        console.log(`📡 [PUSH SERVICE] Tentando enviar para: ${sub.endpoint!.substring(0, 50)}...`);
        await webpush.sendNotification(pushSubscription, webPayload);
        console.log('✅ [PUSH SERVICE] Web Push ENVIADO COM SUCESSO!');
      } catch (error: any) {
        console.error('❌ [PUSH SERVICE] ERRO ao enviar:', error);
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }

    const expoSubs = subscriptions.filter((s) => s.expo_token);
    const expoMessages: ExpoPushMessage[] = expoSubs.map((sub) => ({
      to: sub.expo_token!, sound: 'default', title, body, data,
    })).filter((msg) => Expo.isExpoPushToken(msg.to));

    if (expoMessages.length > 0) {
      const chunks = expo.chunkPushNotifications(expoMessages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
          console.log('✅ [PUSH SERVICE] Expo Push enviado!');
        } catch (error) {
          console.error('❌ [PUSH SERVICE] Erro no Expo Push:', error);
        }
      }
    }
    console.log(`=========================================\n`);
  },
};