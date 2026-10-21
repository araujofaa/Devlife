import { FastifyReply } from 'fastify';
import { notesService } from '../service/notes.service';
import { noteCreateSchema, noteUpdateSchema, noteFiltersSchema } from '../schemas/notes.schemas';
import { AuthRequest } from '../../../shared/middleware/auth';
import { prisma } from '../../../shared/database/prisma';
import { categoriesService } from '../../categories/service/categories.service';

export const notesController = {
  async create(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const data = noteCreateSchema.parse(request.body);
      const { categoryIds, ...noteData } = data;

      const note = await notesService.create(userId, noteData);

      // Associa categorias se houver
      if (categoryIds && categoryIds.length > 0) {
        await categoriesService.setNoteCategories(userId, note.id, categoryIds);
      }

      // Retorna a nota com as categorias
      const noteWithCategories = await prisma.note.findUnique({
        where: { id: note.id },
        include: {
          categories: { include: { category: true } },
        },
      });

      return reply.status(201).send({ success: true, data: noteWithCategories });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
    }
  },

  async list(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const filters = noteFiltersSchema.parse(request.query);
      const result = await notesService.list(userId, filters);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
    }
  },

  async getById(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      const note = await notesService.getById(userId, id);
      return reply.send({ success: true, data: note });
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
      const data = noteUpdateSchema.parse(request.body);
      const { categoryIds, ...noteData } = data;

      await notesService.update(userId, id, noteData);

      // Atualiza categorias se foi enviado
      if (categoryIds !== undefined) {
        await categoriesService.setNoteCategories(userId, id, categoryIds);
      }

      // Retorna a nota atualizada com categorias
      const noteWithCategories = await prisma.note.findUnique({
        where: { id },
        include: {
          categories: { include: { category: true } },
        },
      });

      return reply.send({ success: true, data: noteWithCategories });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
    }
  },

  async delete(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      await notesService.delete(userId, id);
      return reply.send({ success: true, message: 'Nota excluída com sucesso' });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },
};