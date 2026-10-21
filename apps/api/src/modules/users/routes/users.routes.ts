import { FastifyInstance } from 'fastify';
import { authMiddleware, AuthRequest } from '../../../shared/middleware/auth';
import { prisma } from '../../../shared/database/prisma';
import { z } from 'zod';
import { hash, compare } from 'bcrypt';

// 🆕 Schema de validação do telefone
const phoneSchema = z.object({
  phone_number: z
    .string()
    .regex(
      /^[1-9]\d{9,14}$/,
      'Telefone deve ter entre 10 e 15 dígitos (DDI + DDD + número)'
    ),
});

export async function usersRoutes(fastify: FastifyInstance) {
  // Obter perfil
  fastify.get(
    '/me',
    { preHandler: authMiddleware },
    async (request: AuthRequest, reply) => {
      const userId = request.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone_number: true,     // 🆕
          phone_verified: true,   // 🆕
          created_at: true,
          reminder_offset_hours: true,
        },
      });
      return reply.send({ success: true, data: user });
    }
  );

  // 🆕 Atualizar telefone
  fastify.patch(
    '/me/phone',
    { preHandler: authMiddleware },
    async (request: AuthRequest, reply) => {
      try {
        const userId = request.user!.id;
        const { phone_number } = phoneSchema.parse(request.body);

        const updated = await prisma.user.update({
          where: { id: userId },
          data: {
            phone_number,
            phone_verified: false, // reset ao mudar o número
          },
          select: {
            id: true,
            name: true,
            phone_number: true,
            phone_verified: true,
          },
        });

        return reply.send({
          success: true,
          data: updated,
          message: 'Telefone atualizado com sucesso!',
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.message },
        });
      }
    }
  );

  // 🆕 Remover telefone
  fastify.delete(
    '/me/phone',
    { preHandler: authMiddleware },
    async (request: AuthRequest, reply) => {
      const userId = request.user!.id;
      await prisma.user.update({
        where: { id: userId },
        data: { phone_number: null, phone_verified: false },
      });
      return reply.send({
        success: true,
        message: 'Telefone removido',
      });
    }
  );

  // Atualizar nome
  fastify.patch(
    '/me/name',
    { preHandler: authMiddleware },
    async (request: AuthRequest, reply) => {
      const schema = z.object({
        name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
      });
      const { name } = schema.parse(request.body);
      const userId = request.user!.id;
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { name },
        select: { id: true, name: true, email: true },
      });
      return reply.send({ success: true, data: updated });
    }
  );

  // Alterar senha
  fastify.patch(
    '/me/password',
    { preHandler: authMiddleware },
    async (request: AuthRequest, reply) => {
      const schema = z.object({
        currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
        newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
      });
      const { currentPassword, newPassword } = schema.parse(request.body);
      const userId = request.user!.id;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' },
        });
      }

      const isMatch = await compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Senha atual incorreta' },
        });
      }

      const newHash = await hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password_hash: newHash },
      });

      return reply.send({
        success: true,
        message: 'Senha alterada com sucesso',
      });
    }
  );

  // Excluir conta
  fastify.delete(
    '/me',
    { preHandler: authMiddleware },
    async (request: AuthRequest, reply) => {
      const userId = request.user!.id;
      await prisma.user.delete({ where: { id: userId } });
      reply.clearCookie('access_token', { path: '/' });
      reply.clearCookie('refresh_token', { path: '/' });
      return reply.send({
        success: true,
        message: 'Conta excluída com sucesso',
      });
    }
  );

  // Configurações do usuário (ex: offset de lembretes)
  fastify.patch(
    '/me/settings',
    { preHandler: authMiddleware },
    async (request: AuthRequest, reply) => {
      const schema = z.object({
        reminder_offset_hours: z
          .number()
          .int()
          .min(1, 'Mínimo 1 hora')
          .max(168, 'Máximo 168 horas (7 dias)')
          .optional(),
      });
      const data = schema.parse(request.body);
      const userId = request.user!.id;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          reminder_offset_hours: data.reminder_offset_hours,
        },
        select: {
          id: true,
          name: true,
          email: true,
          reminder_offset_hours: true,
        },
      });

      return reply.send({
        success: true,
        data: updated,
        message: 'Configurações atualizadas com sucesso',
      });
    }
  );

  // 🆕 Registrar Dispositivo para Push Notification
  fastify.post(
    '/me/device',
    { preHandler: authMiddleware },
    async (request: AuthRequest, reply) => {
      try {
        const schema = z.object({
          push_token: z.string(),
          platform: z.enum(['ios', 'android']),
        });
        const { push_token, platform } = schema.parse(request.body);
        const userId = request.user!.id;

        // Salva ou atualiza o token (caso o usuário reinstale o app ou mude de celular)
        await prisma.userDevice.upsert({
          where: { push_token },
          update: { user_id: userId, platform },
          create: { user_id: userId, push_token, platform },
        });

        return reply.send({ success: true, message: 'Dispositivo registrado com sucesso' });
      } catch (err: any) {
        return reply.status(400).send({ 
          success: false, 
          error: { code: 'VALIDATION_ERROR', message: err.message } 
        });
      }
    }
  );
}