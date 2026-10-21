import { z } from 'zod';

export const healthSchema = z.object({
status: z.string(),
timestamp: z.string().datetime(),
});

// Outros schemas futuros
