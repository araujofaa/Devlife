import { prisma } from '../../../shared/database/prisma';
import { Task } from '@prisma/client';

/**
 * Calcula a próxima data de vencimento baseada no tipo de recorrência
 */
export function calculateNextDueDate(
  currentDate: Date,
  type: string,
  interval: number = 1
): Date {
  const next = new Date(currentDate);

  switch (type) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + interval * 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      throw new Error('Tipo de recorrência inválido');
  }

  return next;
}

/**
 * Cria a próxima ocorrência de uma tarefa recorrente
 * Retorna a nova tarefa criada ou null se a recorrência terminou
 */
export async function createNextOccurrence(task: Task): Promise<Task | null> {
  // Se não tem recorrência ou data de vencimento, não faz nada
  if (!task.recurrence_type || !task.due_date) {
    return null;
  }

  // Calcula a próxima data
  const nextDueDate = calculateNextDueDate(
    new Date(task.due_date),
    task.recurrence_type,
    task.recurrence_interval || 1
  );

  // Verifica se passou da data final
  if (task.recurrence_end_date && nextDueDate > new Date(task.recurrence_end_date)) {
    console.log(`[Recorrência] Série terminou para tarefa ${task.id}`);
    return null;
  }

  // Busca as categorias da tarefa original
  const categories = await prisma.taskCategory.findMany({
    where: { task_id: task.id },
    select: { category_id: true },
  });

  // Cria a nova tarefa (com as subtarefas resetadas)
  const newTask = await prisma.task.create({
    data: {
      user_id: task.user_id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: 'pending',
      due_date: nextDueDate,
      recurrence_type: task.recurrence_type,
      recurrence_interval: task.recurrence_interval,
      recurrence_end_date: task.recurrence_end_date,
      recurrence_parent_id: task.recurrence_parent_id || task.id,
      categories: {
        create: categories.map((c) => ({ category_id: c.category_id })),
      },
      subtasks: {
        create: await prisma.subtask
          .findMany({
            where: { task_id: task.id },
            orderBy: { order: 'asc' },
          })
          .then((subtasks) =>
            subtasks.map((s) => ({
              title: s.title,
              completed: false,
              order: s.order,
            }))
          ),
      },
    },
  });

  console.log(`[Recorrência] Nova ocorrência criada: ${newTask.id} para ${nextDueDate}`);
  return newTask;
}