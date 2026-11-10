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
      ...(start_date && { start_date: new Date(start_date) }),
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

    // 🆕 CORREÇÃO: Converte as strings de data para Date (ou undefined se não existirem)
    return tasksRepository.findAll(userId, {
      search, 
      priority, 
      status, 
      categoryId,
      due_date_from: due_date_from ? new Date(due_date_from) : undefined,
      due_date_to: due_date_to ? new Date(due_date_to) : undefined,
      page, 
      limit,
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
      updateData.start_date = data.start_date ? new Date(data.start_date) : null;
    }
    
    if (data.due_date !== undefined) {
      updateData.due_date = data.due_date ? new Date(data.due_date) : null;
      // 🆕 Se a data de vencimento mudou, reseta o status de notificação
      updateData.reminder_sent = false; 
    }
    
    if (data.recurrence_end_date !== undefined) {
      updateData.recurrence_end_date = data.recurrence_end_date ? new Date(data.recurrence_end_date) : null;
    }

    // 🆕 Se a tarefa estava concluída e foi reaberta (voltou para pending/in_progress), reseta a notificação
    if ((data.status === 'pending' || data.status === 'in_progress') && task.status === 'done') {
      updateData.reminder_sent = false;
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