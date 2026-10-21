import { FastifyInstance } from 'fastify';
import { tasksController } from '../controller/tasks.controller';
import { authMiddleware } from '../../../shared/middleware/auth';

export async function tasksRoutes(fastify: FastifyInstance) {
  // ⚠️ Rotas específicas devem vir ANTES de /:id
  fastify.get('/counts', { preHandler: authMiddleware }, tasksController.getCounts);
  fastify.delete('/clear-completed', { preHandler: authMiddleware }, tasksController.clearCompleted);
  // 🆕 Import/Export — antes de /:id
  fastify.get('/export', { preHandler: authMiddleware }, tasksController.export);
  fastify.post('/import', { preHandler: authMiddleware }, tasksController.import);

  // Rotas CRUD
  fastify.post('/', { preHandler: authMiddleware }, tasksController.create);
  fastify.get('/', { preHandler: authMiddleware }, tasksController.list);
  fastify.get('/:id', { preHandler: authMiddleware }, tasksController.getById);
  fastify.patch('/:id', { preHandler: authMiddleware }, tasksController.update);
  fastify.delete('/:id', { preHandler: authMiddleware }, tasksController.delete);

  // Subtarefas
  fastify.post('/:id/subtasks', { preHandler: authMiddleware }, tasksController.addSubtask);
  fastify.get('/:id/subtasks', { preHandler: authMiddleware }, tasksController.getSubtasks);
  fastify.patch('/:id/subtasks/:subtaskId', { preHandler: authMiddleware }, tasksController.updateSubtask);
  fastify.delete('/:id/subtasks/:subtaskId', { preHandler: authMiddleware }, tasksController.deleteSubtask);
  fastify.patch('/:id/subtasks/reorder', { preHandler: authMiddleware }, tasksController.reorderSubtasks);
}