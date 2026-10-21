import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../service/auth.service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../schemas/auth.schemas';

export const authController = {
  // ============================================
  // REGISTER — NÃO retorna tokens (precisa verificar e-mail)
  // ============================================
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);
      const result = await authService.register(data);

      return reply.status(201).send({
        success: true,
        data: {
          user: result.user,
          message: result.message,
        },
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: err.message },
      });
    }
  },

  // ============================================
  // LOGIN — retorna tokens (cookies + JSON para o mobile)
  // ============================================
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = loginSchema.parse(request.body);
      const result = await authService.login(data);

      // 🆕 Cookies para a Web
      reply.setCookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 15,
      });
      reply.setCookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      // 🆕 Retorna os tokens no JSON para o Mobile
      return reply.status(200).send({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (err: any) {
      const isLocked =
        err.message?.includes('bloqueada') ||
        err.message?.includes('tentativas falhas');
      const status = isLocked ? 429 : 401;

      return reply.status(status).send({
        success: false,
        error: { code: 'AUTH_ERROR', message: err.message },
      });
    }
  },

  // ============================================
  // VERIFICAR E-MAIL
  // ============================================
  async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = request.query as { token: string };
      if (!token) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Token não fornecido' },
        });
      }

      const result = await authService.verifyEmail(token);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VERIFICATION_ERROR', message: err.message },
      });
    }
  },

  // ============================================
  // REENVIAR VERIFICAÇÃO
  // ============================================
  async resendVerification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = request.body as { email: string };
      if (!email) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'E-mail não fornecido' },
        });
      }

      const result = await authService.resendVerification(email);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'RESEND_ERROR', message: err.message },
      });
    }
  },

  // ============================================
  // RECUPERAÇÃO DE SENHA
  // ============================================
  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = request.body as { email: string };
      if (!email) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'E-mail não fornecido' },
        });
      }

      const result = await authService.forgotPassword(email);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'FORGOT_ERROR', message: err.message },
      });
    }
  },

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token, newPassword } = request.body as {
        token: string;
        newPassword: string;
      };

      if (!token || !newPassword) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Token e nova senha são obrigatórios',
          },
        });
      }

      const result = await authService.resetPassword(token, newPassword);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'RESET_ERROR', message: err.message },
      });
    }
  },

  // ============================================
  // REFRESH — renovação de token
  // ============================================
  async refresh(request: FastifyRequest, reply: FastifyReply) {
    try {
      const refreshToken = request.cookies?.refresh_token;

      if (!refreshToken) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Refresh token não fornecido',
          },
        });
      }

      const result = await authService.refresh(refreshToken);

      reply.setCookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 15,
      });

      return reply.status(200).send({
        success: true,
        data: { accessToken: result.accessToken },
      });
    } catch (err: any) {
      return reply.status(401).send({
        success: false,
        error: { code: 'AUTH_ERROR', message: err.message },
      });
    }
  },

  // ============================================
  // LOGOUT
  // ============================================
  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const refreshToken = request.cookies?.refresh_token;

      if (!refreshToken) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Refresh token não fornecido',
          },
        });
      }

      await authService.logout(refreshToken);

      reply.clearCookie('access_token', { path: '/' });
      reply.clearCookie('refresh_token', { path: '/' });

      return reply.status(200).send({
        success: true,
        message: 'Logout realizado com sucesso',
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'LOGOUT_ERROR', message: err.message },
      });
    }
  },
};