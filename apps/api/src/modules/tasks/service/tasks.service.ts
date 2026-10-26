import { tasksRepository } from '../repository/tasks.repository';
import { TaskCreateInput, TaskUpdateInput, TaskFilters } from '../schemas/tasks.schemas';
import { createNextOccurrence } from './recurrence.service';

export const tasksService = {
  async create(userId: string, data: TaskCreateInput) {
    const {
      start_date,
      due_date,
      recurrence_end_date,
      categoryIds,
      ...rest
    } = data;

    return tasksRepository.create({
      ...rest,
      user: { connect: { id: userId } },
      ...(start_date && { start_date: new Date(start_date) }), // 🆕
      ...(due_date && { due_date: new Date(due_date) }),
      ...(recurrence_end_date && {
        recurrence_end_date: new Date(recurrence_end_date),
      }),
      recurrence_interval: rest.recurrence_interval || 1,
    });
  },

  async list(userId: string, filters: TaskFilters) {
    const {
      search, priority, status, categoryId,
      due_date_from, due_date_to, page, limit,
    } = filters;

    return tasksRepository.findAll(userId, {
      search, priority, status, categoryId,
      due_date_from, due_date_to, page, limit,
    });
  },

  async getById(userId: string, id: string) {
    const task = await tasksRepository.findById(id, userId);
    if (!task) throw new Error('Tarefa não encontrada');
    return task;
  },

  async update(userId: string, id: string, data: TaskUpdateInput) {
    const task = await tasksRepository.findById(id, userId);
    if (!task) throw new Error('Tarefa não encontrada');

    const updateData: any = { ...data };
    
    if (data.start_date !== undefined) {
      updateData.start_date = data.start_date ? new Date(data.start_date) : null; // 🆕
    }
    if (data.due_date !== undefined) {
      updateData.due_date = data.due_date ? new Date(data.due_date) : null;
    }
    if (data.recurrence_end_date !== undefined) {
      updateData.recurrence_end_date = data.recurrence_end_date ? new Date(data.recurrence_end_date) : null;
    }

    // Detecta mudança de status para "done"
    const isBeingCompleted = data.status === 'done' && task.status !== 'done';
    const wasRecurring = task.recurrence_type && task.due_date;

    // Atualiza a tarefa
    const updatedTask = await tasksRepository.update(id, userId, updateData);

    // Se acabou de ser concluída E é recorrente → cria próxima ocorrência
    if (isBeingCompleted && wasRecurring) {
      try {
        await createNextOccurrence(updatedTask);
      } catch (error) {
        console.error('[Recorrência] Erro ao criar próxima ocorrência:', error);
      }
    }

    return updatedTask;
  },

  async delete(userId: string, id: string) {
    const task = await tasksRepository.findById(id, userId);
    if (!task) throw new Error('Tarefa não encontrada');
    return tasksRepository.delete(id, userId);
  },
};