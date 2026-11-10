import { z } from 'zod';

export const taskCreateSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'done']).default('pending'),
  start_date: z.string().datetime().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  recurrence_type: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().nullable(),
  recurrence_interval: z.number().int().min(1).optional().nullable(),
  recurrence_end_date: z.string().datetime().optional().nullable(),
  categoryIds: z.array(z.string()).optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const taskFiltersSchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['pending', 'in_progress', 'done', 'all']).optional(),
  categoryId: z.string().optional(),
  due_date_from: z.string().optional(),
  due_date_to: z.string().optional(),
});

export const subtaskCreateSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  completed: z.boolean().optional().default(false),
  due_date: z.string().datetime().optional().nullable(),
});

export const subtaskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  due_date: z.string().datetime().optional().nullable(),
  reminder_sent: z.boolean().optional(),
});

export const importPayloadSchema = z.object({
  version: z.string(),
  exported_at: z.string(),
  exported_by: z.string(),
  total_tasks: z.number(),
  total_subtasks: z.number(),
  options: z.object({
    preserve_completed: z.boolean().default(false),
    skip_duplicates: z.boolean().default(true),
  }).optional(),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullable().optional(),
      priority: z.enum(['low', 'medium', 'high']),
      status: z.enum(['pending', 'in_progress', 'done']),
      due_date: z.string().nullable().optional(),
      recurrence_type: z.string().nullable().optional(),
      recurrence_interval: z.number().nullable().optional(),
      recurrence_end_date: z.string().nullable().optional(),
      categories: z.array(z.string()).optional(),
      subtasks: z.array(
        z.object({
          title: z.string(),
          completed: z.boolean(),
          due_date: z.string().nullable().optional(),
          order: z.number().optional(),
        })
      ).optional(),
    })
  ),
});

// 🆕 TIPOS EXPORTADOS (para o tasks.service.ts usar)
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
export type SubtaskCreateInput = z.infer<typeof subtaskCreateSchema>;
export type SubtaskUpdateInput = z.infer<typeof subtaskUpdateSchema>;