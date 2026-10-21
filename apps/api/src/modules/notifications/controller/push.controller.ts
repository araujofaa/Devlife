import { FastifyRequest, FastifyReply } from 'fastify';
import { pushService } from '../service/push.service';
import { AuthRequest } from '../../../shared/middleware/auth';
import { z } from 'zod';

const subscriptionSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export const pushController = {
  async subscribe(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const subscription = subscriptionSchema.parse(request.body);
      await pushService.subscribe(userId, subscription);
      return reply.send({ success: true, message: 'Inscrição salva com sucesso' });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
    }
  },

  async unsubscribe(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { endpoint } = request.body as { endpoint: string };
      await pushService.unsubscribe(userId, endpoint);
      return reply.send({ success: true, message: 'Inscrição removida' });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'ERROR', message: err.message },
      });
    }
  },
};