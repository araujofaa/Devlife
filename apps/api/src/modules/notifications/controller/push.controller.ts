import { FastifyRequest, FastifyReply } from 'fastify';
import { pushService } from '../service/push.service';
import { AuthRequest } from '../../../shared/middleware/auth';
import { z } from 'zod';

const pushSubscriptionSchema = z.union([
  z.object({
    endpoint: z.string(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  z.object({
    expoToken: z.string(),
  }),
]);

export const pushController = {
  async subscribe(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const payload = pushSubscriptionSchema.parse(request.body);
      
      // 🆕 LOG: Recebemos a inscrição
      console.log(`[Push Controller] Recebida inscrição do usuário ${userId}`);
      
      await pushService.subscribe(userId, payload);
      
      return reply.send({ success: true, message: 'Inscrição salva com sucesso' });
    } catch (err: any) {
      console.error('[Push Controller] Erro ao salvar:', err);
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
    }
  },

  async unsubscribe(request: AuthRequest, reply: FastifyReply) {
    try {
      const userId = request.user!.id;
      const { endpoint, expoToken } = request.body as { endpoint?: string; expoToken?: string };
      
      await pushService.unsubscribe(userId, { endpoint, expoToken });
      
      return reply.send({ success: true, message: 'Inscrição removida' });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'ERROR', message: err.message },
      });
    }
  },
};