import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';

import { healthRoutes } from './modules/health/health.routes';
import { authRoutes } from './modules/auth/routes/auth.routes';
import { usersRoutes } from './modules/users/routes/users.routes';
import { tasksRoutes } from './modules/tasks/routes/tasks.routes';
import { notesRoutes } from './modules/notes/routes/notes.routes';
import { notificationRoutes } from './modules/notifications/routes/notification.routes';
import { pushRoutes } from './modules/notifications/routes/push.routes';
import { syncRoutes } from './modules/sync/routes/sync.routes';
import { statsRoutes } from './modules/stats/routes/stats.routes';
import { attachmentsRoutes } from './modules/attachments/routes/attachments.routes';
import { categoriesRoutes } from './modules/categories/routes/categories.routes';
import { whatsappWebhookRoutes } from './modules/webhooks/whatsapp.routes';

export async function buildApp(options: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: options.logger ?? false,
  });

  // 🆕 Configuração de CORS flexível para dev e prod
  await fastify.register(cors, {
    origin: (origin, callback) => {
      // 1. Permite requisições sem Origin (Expo Go nativo, Postman, curl)
      if (!origin) return callback(null, true);

      // 2. Permite localhost em qualquer porta (Web:3000, Expo Web:8081)
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }

      // 3. Permite IPs de rede local (Expo Web/Go em celular físico na mesma rede Wi-Fi)
      // Regex que aceita 192.168.x.x, 10.x.x.x, 172.16.x.x até 172.31.x.x
      const localIpRegex = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)\d+\.\d+(:\d+)?$/;
      if (localIpRegex.test(origin)) {
        return callback(null, true);
      }

      // 4. Produção (adapte com o domínio real quando for fazer o deploy)
      const allowedOrigins = [
        'https://www.listapday.com.br',
        'https://listapday.com.br'
      ];
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Bloqueia o resto
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  await fastify.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" } // Evita bloqueio de imagens/recursos
  });

  await fastify.register(rateLimit, {
    global: true,
    max: process.env.NODE_ENV === 'test' ? 10000 : 200,
    timeWindow: '1 minute',
    allowList: [],
    keyGenerator: (req) => {
      return req.ip;
    },
    errorResponseBuilder: (req, context) => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Muitas requisições. Tente novamente em instantes.',
        },
      };
    },
  });

  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'my-secret',
    hook: 'onRequest',
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 5,
    },
  });

  // Swagger
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'DevLife API',
        description: 'API do projeto DevLife',
        version: '1.0.0',
      },
      host: 'localhost:3333',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });
  await fastify.register(swaggerUi, { routePrefix: '/docs' });

  // Rotas
  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(usersRoutes, { prefix: '/users' });
  await fastify.register(tasksRoutes, { prefix: '/tasks' });
  await fastify.register(notesRoutes, { prefix: '/notes' });
  await fastify.register(notificationRoutes, { prefix: '/notifications' });
  await fastify.register(pushRoutes, { prefix: '/notifications' });
  await fastify.register(syncRoutes, { prefix: '/sync' });
  await fastify.register(statsRoutes, { prefix: '/stats' });
  await fastify.register(attachmentsRoutes, { prefix: '/attachments' });
  await fastify.register(categoriesRoutes, { prefix: '/categories' });
  await fastify.register(whatsappWebhookRoutes);

  await fastify.get('/', async () => {
    return { success: true, data: { message: 'DevLife API' } };
  });

  await fastify.ready();

  return fastify;
}