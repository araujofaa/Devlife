import { FastifyInstance } from 'fastify';
import { notificationController } from '../controller/notification.controller';
import { authMiddleware } from '../../../shared/middleware/auth';

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: authMiddleware }, notificationController.list);
  fastify.patch('/:id/read', { preHandler: authMiddleware }, notificationController.markAsRead);
  fastify.patch('/read-all', { preHandler: authMiddleware }, notificationController.markAllAsRead);
  fastify.delete('/:id', { preHandler: authMiddleware }, notificationController.delete);
}