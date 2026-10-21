import { FastifyInstance } from 'fastify';
import { attachmentsController } from '../controller/attachments.controller';
import { authMiddleware } from '../../../shared/middleware/auth';

export async function attachmentsRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: authMiddleware }, attachmentsController.upload);
  fastify.get('/task/:taskId', { preHandler: authMiddleware }, attachmentsController.listByTask);
  fastify.get('/note/:noteId', { preHandler: authMiddleware }, attachmentsController.listByNote);
  fastify.get('/:id/download', { preHandler: authMiddleware }, attachmentsController.download);
  fastify.delete('/:id', { preHandler: authMiddleware }, attachmentsController.delete);
}