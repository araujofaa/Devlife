import { z } from 'zod';

export const noteCreateSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  categoryIds: z.array(z.string()).optional(), // <-- NOVO
});

export const noteUpdateSchema = noteCreateSchema.partial();

export const noteFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(), // <-- NOVO
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;
export type NoteFilters = z.infer<typeof noteFiltersSchema>;