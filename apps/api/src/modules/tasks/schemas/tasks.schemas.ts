import { z } from 'zod';

export const taskCreateSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['pending', 'done']).default('pending'),
  start_date: z.string().datetime().nullable().optional(), // 🆕
  due_date: z.string().datetime().nullable().optional(),
  categoryIds: z.array(z.string()).optional(),
  recurrence_type: z
    .enum(['daily', 'weekly', 'monthly', 'yearly'])
    .nullable()
    .optional(),
  recurrence_interval: z.number().int().min(1).max(365).nullable().optional(),
  recurrence_end_date: z.string().datetime().nullable().optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const taskFiltersSchema = z.object({
  search: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['pending', 'done']).optional(),
  categoryId: z.string().optional(),
  due_date_from: z.coerce.date().optional(),
  due_date_to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

// 🆕 Schema de subtarefa agora aceita due_date
export const subtaskCreateSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  completed: z.boolean().optional().default(false),
  due_date: z.string().datetime().nullable().optional(), // <-- NOVO
});

export const subtaskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  due_date: z.string().datetime().nullable().optional(), // <-- NOVO
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
export type SubtaskCreateInput = z.infer<typeof subtaskCreateSchema>;
export type SubtaskUpdateInput = z.infer<typeof subtaskUpdateSchema>;
// ============================================
// 🆕 Schemas de importação
// ============================================

export const importSubtaskSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().default(false),
  start_date: z.string().datetime().nullable().optional(), // 🆕
  due_date: z.string().datetime().nullable().optional(),
  order: z.number().int().optional(),
});

export const importTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['pending', 'done']).default('pending'),
  start_date: z.string().datetime().nullable().optional(), // 🆕
  due_date: z.string().datetime().nullable().optional(),
  recurrence_type: z
    .enum(['daily', 'weekly', 'monthly', 'yearly'])
    .nullable()
    .optional(),
  recurrence_interval: z.number().int().min(1).max(365).nullable().optional(),
  recurrence_end_date: z.string().datetime().nullable().optional(),
  categories: z.array(z.string()).default([]),
  subtasks: z.array(importSubtaskSchema).default([]),
});

export const importPayloadSchema = z.object({
  version: z.string().default('1.0'),
  exported_at: z.string().optional(),
  exported_by: z.string().optional(),
  options: z
    .object({
      preserve_completed: z.boolean().default(false),
      skip_duplicates: z.boolean().default(true),
    })
    .default({}),
  tasks: z.array(importTaskSchema),
});

export type ImportPayload = z.infer<typeof importPayloadSchema>;