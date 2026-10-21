import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

export async function whatsappWebhookRoutes(fastify: FastifyInstance) {
  // Verificação do webhook (GET)
  fastify.get('/webhooks/whatsapp', async (request, reply) => {
    const query = request.query as any;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return reply.status(200).send(challenge);
    }
    return reply.status(403).send('Forbidden');
  });

  // Recebimento de mensagens (POST)
  fastify.post('/webhooks/whatsapp', async (request, reply) => {
    // Verificar assinatura (recomendado)
    const signature = request.headers['x-hub-signature-256'];
    // ... validação com APP_SECRET ...

    // Processar a mensagem recebida
    const body = request.body as any;
    // ... sua lógica para responder ...

    return reply.status(200).send('EVENT_RECEIVED');
  });
}