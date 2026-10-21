import { FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from '../service/notification.service';
import { AuthRequest } from '../../../shared/middleware/auth';

export const notificationController = {
  async list(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { page = 1, limit = 20 } = request.query as { page?: string; limit?: string };
      const result = await notificationService.list(userId, Number(page), Number(limit));
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  },

  async markAsRead(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      await notificationService.markAsRead(id, userId);
      return reply.send({ success: true, message: 'Notificação marcada como lida' });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },

  async markAllAsRead(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      await notificationService.markAllAsRead(userId);
      return reply.send({ success: true, message: 'Todas as notificações marcadas como lidas' });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  },

  async delete(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      await notificationService.delete(id, userId);
      return reply.send({ success: true, message: 'Notificação excluída' });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },
};