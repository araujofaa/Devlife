import { FastifyInstance } from 'fastify';
import { statsController } from '../controller/stats.controller';
import { authMiddleware } from '../../../shared/middleware/auth';

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard', { preHandler: authMiddleware }, statsController.getDashboard);
}