import { prisma } from '../../../shared/database/prisma';
import { SyncOperation } from '../schemas/sync.schemas';

export const syncService = {
  async sync(userId: string, operations: SyncOperation[], lastSyncTimestamp?: Date) {
    const results = [];

    // 1. Processar operações do cliente
    for (const op of operations) {
      const clientUpdatedAt = new Date(op.updated_at);
      const data = op.data || {}; 

      if (op.entity === 'task') {
        const existing = await prisma.task.findFirst({
          where: { id: op.id, user_id: userId },
        });

        if (op.type === 'delete') {
          if (existing) {
            await prisma.task.update({
              where: { id: op.id },
              data: { deleted_at: new Date() },
            });
            results.push({ id: op.id, entity: 'task', action: 'deleted' });
          }
        } else if (op.type === 'create' || op.type === 'update') {
          if (!existing) {
            await prisma.task.create({
              data: {
                id: op.id,
                user_id: userId,
                title: data.title,
                description: data.description ?? null,
                priority: data.priority ?? 'medium',
                status: data.status ?? 'pending',
                due_date: data.due_date ? new Date(data.due_date) : null,
                recurrence_type: data.recurrence_type || null,
                recurrence_interval: data.recurrence_interval || 1,
                recurrence_end_date: data.recurrence_end_date ? new Date(data.recurrence_end_date) : null,
                created_at: clientUpdatedAt,
                updated_at: clientUpdatedAt,
                categories: {
                  create: (data.categoryIds || []).map((cid: string) => ({ category_id: cid })),
                },
                subtasks: {
                  create: (data.subtasks || []).map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    completed: s.completed || false,
                    due_date: s.due_date ? new Date(s.due_date) : null,
                    order: s.order || 0,
                  })),
                },
              },
            });
            results.push({ id: op.id, entity: 'task', action: 'created' });
          } else {
            if (clientUpdatedAt > existing.updated_at) {
              await prisma.task.update({
                where: { id: op.id },
                data: {
                  title: data.title,
                  description: data.description ?? null,
                  priority: data.priority ?? 'medium',
                  status: data.status ?? 'pending',
                  due_date: data.due_date ? new Date(data.due_date) : null,
                  recurrence_type: data.recurrence_type || null,
                  recurrence_interval: data.recurrence_interval || 1,
                  recurrence_end_date: data.recurrence_end_date ? new Date(data.recurrence_end_date) : null,
                  updated_at: new Date(),
                },
              });

              if (data.categoryIds !== undefined) {
                await prisma.taskCategory.deleteMany({ where: { task_id: op.id } });
                if (data.categoryIds.length > 0) {
                  await prisma.taskCategory.createMany({
                    data: data.categoryIds.map((cid: string) => ({ task_id: op.id, category_id: cid })),
                  });
                }
              }

              if (data.subtasks !== undefined) {
                await prisma.subtask.deleteMany({ where: { task_id: op.id } });
                if (data.subtasks.length > 0) {
                  await prisma.subtask.createMany({
                    data: data.subtasks.map((s: any) => ({
                      id: s.id,
                      task_id: op.id,
                      title: s.title,
                      completed: s.completed || false,
                      due_date: s.due_date ? new Date(s.due_date) : null,
                      order: s.order || 0,
                    })),
                  });
                }
              }
              results.push({ id: op.id, entity: 'task', action: 'updated (client wins)' });
            } else {
              results.push({ id: op.id, entity: 'task', action: 'ignored (server newer)' });
            }
          }
        }
      } else if (op.entity === 'note') {
        const existing = await prisma.note.findFirst({
          where: { id: op.id, user_id: userId },
        });

        if (op.type === 'delete') {
          if (existing) {
            await prisma.note.update({
              where: { id: op.id },
              data: { deleted_at: new Date() },
            });
            results.push({ id: op.id, entity: 'note', action: 'deleted' });
          }
        } else if (op.type === 'create' || op.type === 'update') {
          if (!existing) {
            await prisma.note.create({
              data: {
                id: op.id,
                user_id: userId,
                title: data.title,
                content: data.content,
                created_at: clientUpdatedAt,
                updated_at: clientUpdatedAt,
                categories: {
                  create: (data.categoryIds || []).map((cid: string) => ({ category_id: cid })),
                },
              },
            });
            results.push({ id: op.id, entity: 'note', action: 'created' });
          } else {
            if (clientUpdatedAt > existing.updated_at) {
              await prisma.note.update({
                where: { id: op.id },
                data: {
                  title: data.title,
                  content: data.content,
                  updated_at: new Date(),
                },
              });

              if (data.categoryIds !== undefined) {
                await prisma.noteCategory.deleteMany({ where: { note_id: op.id } });
                if (data.categoryIds.length > 0) {
                  await prisma.noteCategory.createMany({
                    data: data.categoryIds.map((cid: string) => ({ note_id: op.id, category_id: cid })),
                  });
                }
              }
              results.push({ id: op.id, entity: 'note', action: 'updated (client wins)' });
            } else {
              results.push({ id: op.id, entity: 'note', action: 'ignored (server newer)' });
            }
          }
        }
      }
    }

    // 2. Buscar mudanças do servidor (Pull)
    const since = lastSyncTimestamp || new Date(0);
    const serverChanges = [];

    const tasks = await prisma.task.findMany({
      where: {
        user_id: userId,
        OR: [
          { updated_at: { gt: since } }, 
          { deleted_at: { gt: since } },
          { subtasks: { some: { updated_at: { gt: since } } } }
        ],
      },
      include: {
        subtasks: true,
        categories: { include: { category: true } },
        _count: { select: { attachments: true } }, // 🆕 Contagem para o mobile
      },
    });
    serverChanges.push(...tasks.map((t: any) => ({ ...t, entity: 'task' })));

    const notes = await prisma.note.findMany({
      where: {
        user_id: userId,
        OR: [{ updated_at: { gt: since } }, { deleted_at: { gt: since } }],
      },
      include: {
        categories: { include: { category: true } },
        _count: { select: { attachments: true } }, // 🆕 Contagem para o mobile
      },
    });
    serverChanges.push(...notes.map((n: any) => ({ ...n, entity: 'note' })));

    const newTimestamp = new Date();
    return {
      changes: serverChanges,
      timestamp: newTimestamp.toISOString(),
      syncResults: results,
    };
  },
};