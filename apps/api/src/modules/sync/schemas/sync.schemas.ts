import { z } from 'zod';

// Representa uma operação de sincronização para uma entidade
export const syncOperationSchema = z.object({
  id: z.string(),
  type: z.enum(['create', 'update', 'delete']),
  entity: z.enum(['task', 'note']),
  data: z.record(z.any()).optional(), // dados da entidade (se create/update)
  updated_at: z.string().datetime(), // timestamp local do cliente
});

export const syncRequestSchema = z.object({
  operations: z.array(syncOperationSchema),
  last_sync_timestamp: z.string().datetime().optional(), // último sync do cliente
});

export const syncResponseSchema = z.object({
  changes: z.array(z.any()), // registros do servidor modificados após o último sync
  timestamp: z.string().datetime(), // timestamp atual do servidor
});

export type SyncOperation = z.infer<typeof syncOperationSchema>;
export type SyncRequest = z.infer<typeof syncRequestSchema>;