import { FastifyInstance } from 'fastify';
import { notesController } from '../controller/notes.controller';
import { authMiddleware } from '../../../shared/middleware/auth';

export async function notesRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: authMiddleware }, notesController.create);
  fastify.get('/', { preHandler: authMiddleware }, notesController.list);
  fastify.get('/:id', { preHandler: authMiddleware }, notesController.getById);
  fastify.patch('/:id', { preHandler: authMiddleware }, notesController.update);
  fastify.delete('/:id', { preHandler: authMiddleware }, notesController.delete);
}