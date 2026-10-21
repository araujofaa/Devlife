import { prisma } from '../../../shared/database/prisma';
import { Note, Prisma } from '@prisma/client';

export const notesRepository = {
  async create(data: {
    userId: string;
    title: string;
    content: string;
  }): Promise<Note> {
    return prisma.note.create({
      data: {
        user_id: data.userId,
        title: data.title,
        content: data.content,
      },
    });
  },

  async findAll(
    userId: string,
    filters: {
      search?: string;
      categoryId?: string;
      page: number;
      limit: number;
    }
  ) {
    const { search, categoryId, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.NoteWhereInput = {
      user_id: userId,
      deleted_at: null,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && {
        categories: {
          some: { category_id: categoryId },
        },
      }),
    };

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          categories: {
            include: { category: true },
          },
        },
      }),
      prisma.note.count({ where }),
    ]);

    return { notes, total, page, limit };
  },

  async findByUserId(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: { user_id: userId, deleted_at: null },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          categories: {
            include: { category: true },
          },
        },
      }),
      prisma.note.count({ where: { user_id: userId, deleted_at: null } }),
    ]);
    return { notes, total };
  },

  async findById(id: string, userId: string) {
    return prisma.note.findFirst({
      where: { id, user_id: userId, deleted_at: null },
      include: {
        categories: {
          include: { category: true },
        },
      },
    });
  },

  async update(
    id: string,
    userId: string,
    data: { title?: string; content?: string }
  ): Promise<Note> {
    await prisma.note.findFirstOrThrow({
      where: { id, user_id: userId, deleted_at: null },
    });
    return prisma.note.update({
      where: { id },
      data,
    });
  },

  async delete(id: string, userId: string): Promise<Note> {
    await prisma.note.findFirstOrThrow({
      where: { id, user_id: userId, deleted_at: null },
    });
    return prisma.note.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  },
};