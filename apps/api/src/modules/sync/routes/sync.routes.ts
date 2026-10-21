import { FastifyInstance } from 'fastify';
import { syncController } from '../controller/sync.controller';
import { authMiddleware } from '../../../shared/middleware/auth';

export async function syncRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: authMiddleware }, syncController.sync);
}