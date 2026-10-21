import { FastifyInstance } from 'fastify';
import { categoriesController } from '../controller/categories.controller';
import { authMiddleware } from '../../../shared/middleware/auth';

export async function categoriesRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: authMiddleware }, categoriesController.create);
  fastify.get('/', { preHandler: authMiddleware }, categoriesController.list);
  fastify.get('/:id', { preHandler: authMiddleware }, categoriesController.getById);
  fastify.patch('/:id', { preHandler: authMiddleware }, categoriesController.update);
  fastify.delete('/:id', { preHandler: authMiddleware }, categoriesController.delete);
}