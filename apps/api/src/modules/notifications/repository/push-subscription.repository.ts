import { prisma } from '../../../shared/database/prisma';

export const pushSubscriptionRepository = {
  async create(data: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }) {
    return prisma.pushSubscription.create({
      data: {
        user_id: data.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
    });
  },

  async findByUserId(userId: string) {
    return prisma.pushSubscription.findMany({
      where: { user_id: userId },
    });
  },

  async deleteByEndpoint(endpoint: string, userId: string) {
    return prisma.pushSubscription.deleteMany({
      where: { endpoint, user_id: userId },
    });
  },

  async deleteAllByUserId(userId: string) {
    return prisma.pushSubscription.deleteMany({
      where: { user_id: userId },
    });
  },
};