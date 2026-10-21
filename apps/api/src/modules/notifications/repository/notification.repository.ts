import { prisma } from '../../../shared/database/prisma';
import { Notification } from '@prisma/client';

export const notificationRepository = {
  async create(data: { userId: string; title: string; message: string }): Promise<Notification> {
    return prisma.notification.create({
      data: {
        user_id: data.userId,
        title: data.title,
        message: data.message,
      },
    });
  },

  async findByUserId(userId: string, limit = 20, offset = 0) {
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    });
    const total = await prisma.notification.count({ where: { user_id: userId } });
    const unread = await prisma.notification.count({ where: { user_id: userId, read: false } });
    return { notifications, total, unread };
  },

  async markAsRead(id: string, userId: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id, user_id: userId },
      data: { read: true },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { user_id: userId, read: false },
      data: { read: true },
    });
  },

  async delete(id: string, userId: string) {
    return prisma.notification.delete({ where: { id, user_id: userId } });
  },
};