import { FastifyReply } from 'fastify';
import { categoriesService } from '../service/categories.service';
import { categoryCreateSchema, categoryUpdateSchema } from '../schemas/categories.schemas';
import { AuthRequest } from '../../../shared/middleware/auth';

export const categoriesController = {
  async create(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const data = categoryCreateSchema.parse(request.body);
      const category = await categoriesService.create(userId, data);
      return reply.status(201).send({ success: true, data: category });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CREATE_ERROR', message: err.message },
      });
    }
  },

  async list(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const categories = await categoriesService.list(userId);
      return reply.send({ success: true, data: categories });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'LIST_ERROR', message: err.message },
      });
    }
  },

  async getById(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      const category = await categoriesService.getById(userId, id);
      return reply.send({ success: true, data: category });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },

  async update(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      const data = categoryUpdateSchema.parse(request.body);
      const category = await categoriesService.update(userId, id, data);
      return reply.send({ success: true, data: category });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'UPDATE_ERROR', message: err.message },
      });
    }
  },

  async delete(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      await categoriesService.delete(userId, id);
      return reply.send({ success: true, message: 'Categoria excluída com sucesso' });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'DELETE_ERROR', message: err.message },
      });
    }
  },
};