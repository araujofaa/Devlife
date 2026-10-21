import { FastifyReply } from 'fastify';
import { tasksService } from '../service/tasks.service';
import {
  taskCreateSchema,
  taskUpdateSchema,
  taskFiltersSchema,
  subtaskCreateSchema,
  subtaskUpdateSchema,
} from '../schemas/tasks.schemas';
import { AuthRequest } from '../../../shared/middleware/auth';
import { prisma } from '../../../shared/database/prisma';
import { categoriesService } from '../../categories/service/categories.service';
import { tasksRepository } from '../repository/tasks.repository';
import { importPayloadSchema } from '../schemas/tasks.schemas';

export const tasksController = {
  async create(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const data = taskCreateSchema.parse(request.body);
      const { categoryIds, ...taskData } = data;

      const task = await tasksService.create(userId, taskData);

      if (categoryIds && categoryIds.length > 0) {
        await categoriesService.setTaskCategories(userId, task.id, categoryIds);
      }

      const taskWithCategories = await prisma.task.findUnique({
        where: { id: task.id },
        include: {
          subtasks: { orderBy: [{ due_date: { sort: 'asc', nulls: 'last' } }, { order: 'asc' }] },
          categories: { include: { category: true } },
        },
      });

      return reply.status(201).send({ success: true, data: taskWithCategories });
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
      const filters = taskFiltersSchema.parse(request.query);
      const result = await tasksService.list(userId, filters);
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
      const task = await tasksService.getById(userId, id);
      return reply.send({ success: true, data: task });
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
      const data = taskUpdateSchema.parse(request.body);
      const { categoryIds, ...taskData } = data;

      await tasksService.update(userId, id, taskData);

      if (categoryIds !== undefined) {
        await categoriesService.setTaskCategories(userId, id, categoryIds);
      }

      const taskWithCategories = await prisma.task.findUnique({
        where: { id },
        include: {
          subtasks: { orderBy: [{ due_date: { sort: 'asc', nulls: 'last' } }, { order: 'asc' }] },
          categories: { include: { category: true } },
        },
      });

      return reply.send({ success: true, data: taskWithCategories });
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
      await tasksService.delete(userId, id);
      return reply.send({ success: true, message: 'Tarefa excluída com sucesso' });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },

  async clearCompleted(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const count = await tasksRepository.clearCompleted(userId);
      return reply.send({
        success: true,
        message: `${count} tarefa(s) concluída(s) removida(s)`,
        data: { count },
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CLEAR_ERROR', message: err.message },
      });
    }
  },

  async getCounts(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const counts = await tasksRepository.getCounts(userId);
      return reply.send({ success: true, data: counts });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'COUNT_ERROR', message: err.message },
      });
    }
  },

  // ============================================
  // SUBTAREFAS
  // ============================================
  async addSubtask(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      const data = subtaskCreateSchema.parse(request.body);

      await tasksService.getById(userId, id);

      const subtask = await prisma.subtask.create({
        data: {
          task_id: id,
          title: data.title,
          completed: data.completed || false,
          completed_at: data.completed ? new Date() : null,
          due_date: data.due_date ? new Date(data.due_date) : null, // <-- NOVO
        },
      });

      return reply.status(201).send({ success: true, data: subtask });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
    }
  },

  async getSubtasks(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };

      await tasksService.getById(userId, id);

      // 🆕 Ordena por due_date (nulos por último) e depois por order
      const subtasks = await prisma.subtask.findMany({
        where: { task_id: id },
        orderBy: [
          { due_date: { sort: 'asc', nulls: 'last' } },
          { order: 'asc' },
          { created_at: 'asc' },
        ],
      });

      return reply.send({ success: true, data: subtasks });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },

  async updateSubtask(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id, subtaskId } = request.params as { id: string; subtaskId: string };
      const data = subtaskUpdateSchema.parse(request.body);

      await tasksService.getById(userId, id);

      const current = await prisma.subtask.findFirst({
        where: { id: subtaskId, task_id: id },
      });

      if (!current) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Subtarefa não encontrada' },
        });
      }

      const updateData: any = { ...data };

      // Gerencia completed_at
      if (typeof data.completed === 'boolean') {
        if (data.completed === true && !current.completed) {
          updateData.completed_at = new Date();
        } else if (data.completed === false && current.completed) {
          updateData.completed_at = null;
        }
      }

      // 🆕 Converte due_date para Date
      if (data.due_date !== undefined) {
        updateData.due_date = data.due_date ? new Date(data.due_date) : null;
      }

      const subtask = await prisma.subtask.update({
        where: { id: subtaskId, task_id: id },
        data: updateData,
      });

      return reply.send({ success: true, data: subtask });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
    }
  },

  async deleteSubtask(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id, subtaskId } = request.params as { id: string; subtaskId: string };

      await tasksService.getById(userId, id);

      await prisma.subtask.delete({
        where: { id: subtaskId, task_id: id },
      });

      return reply.send({ success: true, message: 'Subtarefa excluída com sucesso' });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  },

  async reorderSubtasks(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { id } = request.params as { id: string };
      const { orderedIds } = request.body as { orderedIds: string[] };

      await tasksService.getById(userId, id);

      await Promise.all(
        orderedIds.map((subtaskId, index) =>
          prisma.subtask.update({
            where: { id: subtaskId, task_id: id },
            data: { order: index },
          })
        )
      );

      return reply.send({ success: true, message: 'Subtarefas reordenadas' });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'REORDER_ERROR', message: err.message },
      });
    }
  },

  // ============================================
// 🆕 EXPORT — retorna JSON com tarefas + subtarefas
// ============================================
async export(request: AuthRequest, reply: FastifyReply) {
  try {
    const userId = request.user!.id;
    const userEmail = request.user!.email;

    const tasks = await prisma.task.findMany({
      where: { user_id: userId, deleted_at: null },
      include: {
        subtasks: { orderBy: [{ order: 'asc' }, { created_at: 'asc' }] },
        categories: { include: { category: true } },
      },
      orderBy: { created_at: 'asc' },
    });

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: userEmail,
      total_tasks: tasks.length,
      total_subtasks: tasks.reduce((acc, t) => acc + t.subtasks.length, 0),
      tasks: tasks.map((t) => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        due_date: t.due_date?.toISOString() || null,
        recurrence_type: t.recurrence_type,
        recurrence_interval: t.recurrence_interval,
        recurrence_end_date: t.recurrence_end_date?.toISOString() || null,
        categories: t.categories.map((tc) => tc.category.name),
        subtasks: t.subtasks.map((s) => ({
          title: s.title,
          completed: s.completed,
          due_date: s.due_date?.toISOString() || null,
          order: s.order,
        })),
      })),
    };

    return reply.send({ success: true, data: exportData });
  } catch (err: any) {
    return reply.status(500).send({
      success: false,
      error: { code: 'EXPORT_ERROR', message: err.message },
    });
  }
},

// ============================================
// 🆕 IMPORT — recebe JSON e cria tarefas
// ============================================
async import(request: AuthRequest, reply: FastifyReply) {
  try {
    const userId = request.user!.id;
    const payload = importPayloadSchema.parse(request.body);

    const options = payload.options || {
      preserve_completed: false,
      skip_duplicates: true,
    };

    const result = {
      imported: 0,
      skipped: 0,
      categories_created: 0,
      subtasks_imported: 0,
      errors: [] as string[],
    };

    for (const taskData of payload.tasks) {
      try {
        // 1. Verifica duplicata (título + data)
        if (options.skip_duplicates) {
          const existing = await prisma.task.findFirst({
            where: {
              user_id: userId,
              title: taskData.title,
              due_date: taskData.due_date
                ? new Date(taskData.due_date)
                : null,
              deleted_at: null,
            },
          });

          if (existing) {
            result.skipped++;
            continue;
          }
        }

        // 2. Processa categorias (find-or-create)
        const categoryIds: string[] = [];
        for (const catName of taskData.categories || []) {
          const trimmed = catName.trim();
          if (!trimmed) continue;

          let cat = await prisma.category.findFirst({
            where: {
              user_id: userId,
              name: { equals: trimmed, mode: 'insensitive' },
            },
          });

          if (!cat) {
            cat = await prisma.category.create({
              data: {
                user_id: userId,
                name: trimmed,
                color: '#3b82f6',
                icon: 'tag',
              },
            });
            result.categories_created++;
          }

          categoryIds.push(cat.id);
        }

        // 3. Cria a tarefa (com subtarefas)
        await prisma.task.create({
          data: {
            user_id: userId,
            title: taskData.title,
            description: taskData.description || null,
            priority: taskData.priority,
            status: options.preserve_completed ? taskData.status : 'pending',
            due_date: taskData.due_date ? new Date(taskData.due_date) : null,
            recurrence_type: taskData.recurrence_type || null,
            recurrence_interval: taskData.recurrence_interval || null,
            recurrence_end_date: taskData.recurrence_end_date
              ? new Date(taskData.recurrence_end_date)
              : null,
            categories: {
              create: categoryIds.map((cid) => ({ category_id: cid })),
            },
            subtasks: {
              create: (taskData.subtasks || []).map((s, idx) => ({
                title: s.title,
                completed: options.preserve_completed ? s.completed : false,
                completed_at:
                  options.preserve_completed && s.completed ? new Date() : null,
                due_date: s.due_date ? new Date(s.due_date) : null,
                order: s.order ?? idx,
              })),
            },
          },
        });

        result.imported++;
        result.subtasks_imported += taskData.subtasks?.length || 0;
      } catch (taskError: any) {
        result.errors.push(`"${taskData.title}": ${taskError.message}`);
      }
    }

    return reply.send({ success: true, data: result });
  } catch (err: any) {
    return reply.status(400).send({
      success: false,
      error: { code: 'IMPORT_ERROR', message: err.message },
    });
  }
 },

};