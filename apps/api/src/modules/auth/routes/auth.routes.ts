import { FastifyInstance } from 'fastify';
import { authController } from '../controller/auth.controller';

export async function authRoutes(fastify: FastifyInstance) {
  // ============================================
  // REGISTRO — 3 por hora por IP
  // Evita criação em massa de contas
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
  // + bloqueio de conta após 5 falhas (no service)
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
  // VERIFICAR E-MAIL — sem rate limit agressivo
  // (o usuário clica no link, então não precisa proteger muito)
  // ============================================
  fastify.get('/verify-email', authController.verifyEmail);

  // ============================================
  // REENVIAR VERIFICAÇÃO — 3 por hora por IP
  // Evita spam de e-mails
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
  // Evita spam de e-mails de recuperação
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
  // (é chamado quando o access token expira - precisa de folga)
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