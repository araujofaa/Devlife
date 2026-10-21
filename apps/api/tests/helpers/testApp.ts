import { buildApp } from '../../src/app';
import { prisma } from '../../src/shared/database/prisma';
import { FastifyInstance } from 'fastify';

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false });
  return app;
}

export async function cleanDatabase() {
  // Ordem importa por causa das FKs
  await prisma.attachment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.note.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(app: FastifyInstance, overrides = {}) {
  const userData = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'senha123',
    ...overrides,
  };

  // Registra
  await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: userData,
  });

  // Marca como verificado diretamente no banco
  const user = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email_verified: true },
    });
  }

  // Faz login
  const loginResponse = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: {
      email: userData.email,
      password: userData.password,
    },
  });

  const cookies = loginResponse.headers['set-cookie'];
  const cookieHeader = Array.isArray(cookies)
    ? cookies.map((c) => c.split(';')[0]).join('; ')
    : '';

  return {
    user: user!,
    credentials: userData,
    cookie: cookieHeader,
  };
}