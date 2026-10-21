import { FastifyRequest, FastifyReply } from 'fastify';
import { syncService } from '../service/sync.service';
import { syncRequestSchema } from '../schemas/sync.schemas';
import { AuthRequest } from '../../../shared/middleware/auth';

export const syncController = {
  async sync(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { operations, last_sync_timestamp } = syncRequestSchema.parse(request.body);

      const lastSyncDate = last_sync_timestamp ? new Date(last_sync_timestamp) : undefined;
      const result = await syncService.sync(userId, operations, lastSyncDate);

      return reply.send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'SYNC_ERROR', message: err.message },
      });
    }
  },
};