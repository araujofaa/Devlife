import { prisma } from '../../../shared/database/prisma';
import { Task, Prisma } from '@prisma/client';

const subtaskOrderBy: Prisma.SubtaskOrderByWithRelationInput[] = [
  { due_date: { sort: 'asc', nulls: 'last' } },
  { order: 'asc' },
  { created_at: 'asc' },
];

export const tasksRepository = {
  async create(data: Prisma.TaskCreateInput): Promise<Task> {
    return prisma.task.create({ data });
  },

  async findById(id: string, userId: string) {
    return prisma.task.findFirst({
      where: { id, user_id: userId, deleted_at: null },
      include: {
        subtasks: { orderBy: subtaskOrderBy },
        categories: { include: { category: true } },
      },
    });
  },

  async findAll(
    userId: string,
    filters: {
      search?: string;
      priority?: string;
      status?: string;
      categoryId?: string;
      due_date_from?: Date;
      due_date_to?: Date;
      page: number;
      limit: number;
    }
  ) {
    const { search, priority, status, categoryId, due_date_from, due_date_to, page, limit } = filters;
    const skip = (page - 1) * limit;

    // 🆕 Monta as condições em array para poder combinar ORs diferentes
    const AND_CONDITIONS: Prisma.TaskWhereInput[] = [];

    // Busca (título ou descrição)
    if (search) {
      AND_CONDITIONS.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // 🆕 Filtro por data — inclui tarefas com due_date no range OU subtarefas no range
    if (due_date_from || due_date_to) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (due_date_from) dateFilter.gte = due_date_from;
      if (due_date_to) dateFilter.lte = due_date_to;

      AND_CONDITIONS.push({
        OR: [
          { due_date: dateFilter },
          {
            subtasks: {
              some: {
                due_date: dateFilter,
              },
            },
          },
        ],
      });
    }

    const where: Prisma.TaskWhereInput = {
      user_id: userId,
      deleted_at: null,
      ...(priority && { priority }),
      ...(status && { status }),
      ...(categoryId && {
        categories: { some: { category_id: categoryId } },
      }),
      ...(AND_CONDITIONS.length > 0 && { AND: AND_CONDITIONS }),
    };

    const orderBy: any =
      status === 'done'
        ? [{ updated_at: 'desc' }]
        : [
            { due_date: { sort: 'asc', nulls: 'last' } },
            { created_at: 'desc' },
          ];

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          subtasks: { orderBy: subtaskOrderBy },
          categories: { include: { category: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return { tasks, total, page, limit };
  },

  async update(id: string, userId: string, data: Prisma.TaskUpdateInput): Promise<Task> {
    await prisma.task.findFirstOrThrow({ where: { id, user_id: userId } });
    return prisma.task.update({ where: { id }, data });
  },

  async delete(id: string, userId: string): Promise<Task> {
    await prisma.task.findFirstOrThrow({ where: { id, user_id: userId } });
    return prisma.task.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  },

  async clearCompleted(userId: string): Promise<number> {
    const result = await prisma.task.updateMany({
      where: { user_id: userId, status: 'done', deleted_at: null },
      data: { deleted_at: new Date() },
    });
    return result.count;
  },

  async getCounts(userId: string) {
    const [pending, done] = await Promise.all([
      prisma.task.count({
        where: { user_id: userId, status: 'pending', deleted_at: null },
      }),
      prisma.task.count({
        where: { user_id: userId, status: 'done', deleted_at: null },
      }),
    ]);
    return { pending, done, total: pending + done };
  },
};