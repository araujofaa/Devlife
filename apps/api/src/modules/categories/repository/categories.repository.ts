import { prisma } from '../../../shared/database/prisma';
import { Category } from '@prisma/client';

export const categoriesRepository = {
  async create(data: {
    userId: string;
    name: string;
    color: string;
    icon: string;
  }): Promise<Category> {
    return prisma.category.create({
      data: {
        user_id: data.userId,
        name: data.name,
        color: data.color,
        icon: data.icon,
      },
    });
  },

  async findAllByUser(userId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: { user_id: userId },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string, userId: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: { id, user_id: userId },
    });
  },

  async findByName(name: string, userId: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: { name, user_id: userId },
    });
  },

  async update(
    id: string,
    userId: string,
    data: Partial<{ name: string; color: string; icon: string }>
  ): Promise<Category> {
    await prisma.category.findFirstOrThrow({ where: { id, user_id: userId } });
    return prisma.category.update({ where: { id }, data });
  },

  async delete(id: string, userId: string): Promise<Category> {
    await prisma.category.findFirstOrThrow({ where: { id, user_id: userId } });
    return prisma.category.delete({ where: { id } });
  },

  // Relacionamentos com tarefas
  async addToTask(taskId: string, categoryId: string) {
    return prisma.taskCategory.create({
      data: { task_id: taskId, category_id: categoryId },
    });
  },

  async removeFromTask(taskId: string, categoryId: string) {
    return prisma.taskCategory.delete({
      where: { task_id_category_id: { task_id: taskId, category_id: categoryId } },
    });
  },

  async setTaskCategories(taskId: string, categoryIds: string[]) {
    // Remove todas e adiciona as novas (transação)
    return prisma.$transaction(async (tx) => {
      await tx.taskCategory.deleteMany({ where: { task_id: taskId } });
      if (categoryIds.length > 0) {
        await tx.taskCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            task_id: taskId,
            category_id: categoryId,
          })),
        });
      }
    });
  },

  // Relacionamentos com notas
  async setNoteCategories(noteId: string, categoryIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.noteCategory.deleteMany({ where: { note_id: noteId } });
      if (categoryIds.length > 0) {
        await tx.noteCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            note_id: noteId,
            category_id: categoryId,
          })),
        });
      }
    });
  },
};