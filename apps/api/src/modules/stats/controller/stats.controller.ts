import { FastifyReply } from 'fastify';
import { statsService } from '../service/stats.service';
import { AuthRequest } from '../../../shared/middleware/auth';

export const statsController = {
  async getDashboard(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const stats = await statsService.getDashboardStats(userId);
      return reply.send({ success: true, data: stats });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'STATS_ERROR', message: err.message },
      });
    }
  },
};