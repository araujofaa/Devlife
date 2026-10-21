import { z } from 'zod';

export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar em formato hexadecimal (#RRGGBB)')
    .default('#3b82f6'),
  icon: z.string().default('tag'),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;