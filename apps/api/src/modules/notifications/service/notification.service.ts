import { notificationRepository } from '../repository/notification.repository';

export const notificationService = {
  async create(userId: string, title: string, message: string) {
    return notificationRepository.create({ userId, title, message });
  },

  async list(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return notificationRepository.findByUserId(userId, limit, offset);
  },

  async markAsRead(id: string, userId: string) {
    return notificationRepository.markAsRead(id, userId);
  },

  async markAllAsRead(userId: string) {
    return notificationRepository.markAllAsRead(userId);
  },

  async delete(id: string, userId: string) {
    return notificationRepository.delete(id, userId);
  },
};