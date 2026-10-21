import { prisma } from '../../../shared/database/prisma';
import { Attachment } from '@prisma/client';

export const attachmentsRepository = {
  async create(data: {
    userId: string;
    taskId?: string;
    noteId?: string;
    filename: string;
    storedName: string;
    mimeType: string;
    size: number;
  }): Promise<Attachment> {
    return prisma.attachment.create({
      data: {
        user_id: data.userId,
        task_id: data.taskId || null,
        note_id: data.noteId || null,
        filename: data.filename,
        stored_name: data.storedName,
        mime_type: data.mimeType,
        size: data.size,
      },
    });
  },

  async findById(id: string, userId: string): Promise<Attachment | null> {
    return prisma.attachment.findFirst({
      where: { id, user_id: userId },
    });
  },

  async findByTaskId(taskId: string, userId: string): Promise<Attachment[]> {
    return prisma.attachment.findMany({
      where: { task_id: taskId, user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  },

  async findByNoteId(noteId: string, userId: string): Promise<Attachment[]> {
    return prisma.attachment.findMany({
      where: { note_id: noteId, user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  },

  async delete(id: string, userId: string): Promise<Attachment> {
    await prisma.attachment.findFirstOrThrow({
      where: { id, user_id: userId },
    });
    return prisma.attachment.delete({ where: { id } });
  },
};