import { FastifyInstance } from 'fastify';
import { pushController } from '../controller/push.controller';
import { authMiddleware } from '../../../shared/middleware/auth';

export async function pushRoutes(fastify: FastifyInstance) {
  fastify.post('/subscribe', { preHandler: authMiddleware }, pushController.subscribe);
  fastify.post('/unsubscribe', { preHandler: authMiddleware }, pushController.unsubscribe);
}