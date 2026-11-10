import webpush from 'web-push';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../shared/database/prisma';

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
    console.log(`🚀 [PUSH SERVICE] Iniciando envio de Push para o usuário: ${userId}`);
    
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: userId },
    });

    console.log(`🔍 [PUSH SERVICE] Encontradas ${subscriptions.length} inscrição(ões) no banco de dados.`);

    if (subscriptions.length === 0) {
      console.log('❌ [PUSH SERVICE] Nenhuma inscrição encontrada. Abortando envio.');
      console.log(`=========================================\n`);
      return;
    }

    const webSubs = subscriptions.filter((s) => s.endpoint);
    
    // 1. Web Push
    const webPayload = JSON.stringify({ title, body, data });
    
    for (const sub of webSubs) {
      const pushSubscription = {
        endpoint: sub.endpoint!,
        keys: { p256dh: sub.p256dh!, auth: sub.auth! },
      };

      try {
        console.log(`📡 [PUSH SERVICE] Enviando para o endpoint: ${sub.endpoint!.substring(0, 60)}...`);
        
        await webpush.sendNotification(pushSubscription, webPayload);
        
        console.log('✅ [PUSH SERVICE] Web Push ENVIADO COM SUCESSO!');
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log('🗑️ [PUSH SERVICE] Inscrição expirada (erro 410/404). Removendo do banco.');
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error('❌ [PUSH SERVICE] ERRO ao enviar Web Push:', error);
        }
      }
    }
    console.log(`=========================================\n`);
  },
};