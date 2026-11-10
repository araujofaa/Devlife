import { FastifyInstance } from 'fastify';
import { authController } from '../controller/auth.controller';

export async function authRoutes(fastify: FastifyInstance) {
  // ============================================
  // REGISTRO — 3 por hora por IP
  // ============================================
  fastify.post(
    '/register',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 hour',
        },
      },
    },
    authController.register
  );

  // ============================================
  // LOGIN — 10 por 15 min por IP+email
  // ============================================
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
          keyGenerator: (req: any) => {
            const email = req.body?.email || 'unknown';
            return `${req.ip}:${email}`;
          },
          errorResponseBuilder: (req, context) => {
            return {
              statusCode: 429, // 🆕 ESSENCIAL: Define o status HTTP correto
              success: false,
              error: {
                code: 'RATE_LIMITED',
                message: `Muitas tentativas de login. Aguarde ${Math.ceil(
                  context.ttl / 1000
                )} segundos antes de tentar novamente.`,
              },
            };
          },
        },
      },
    },
    authController.login
  );

  // ============================================
  // VERIFICAR E-MAIL
  // ============================================
  fastify.get('/verify-email', authController.verifyEmail);

  // ============================================
  // REENVIAR VERIFICAÇÃO — 3 por hora por IP
  // ============================================
  fastify.post(
    '/resend-verification',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 hour',
        },
      },
    },
    authController.resendVerification
  );

  // ============================================
  // ESQUECI SENHA — 3 por hora por IP
  // ============================================
  fastify.post(
    '/forgot-password',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 hour',
        },
      },
    },
    authController.forgotPassword
  );

  // ============================================
  // RESET DE SENHA — 5 por hora por IP
  // ============================================
  fastify.post(
    '/reset-password',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
        },
      },
    },
    authController.resetPassword
  );

  // ============================================
  // REFRESH — 30 por 15 min
  // ============================================
  fastify.post(
    '/refresh',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '15 minutes',
        },
      },
    },
    authController.refresh
  );

  // ============================================
  // LOGOUT — 20 por 15 min
  // ============================================
  fastify.post(
    '/logout',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '15 minutes',
        },
      },
    },
    authController.logout
  );
}