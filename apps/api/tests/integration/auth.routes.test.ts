import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createTestApp, cleanDatabase } from '../helpers/testApp';
import { prisma } from '../../src/shared/database/prisma';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe('POST /auth/register', () => {
  it('deve registrar um novo usuário', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'João Silva',
        email: 'joao@example.com',
        password: 'senha123',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('joao@example.com');

    const user = await prisma.user.findUnique({
      where: { email: 'joao@example.com' },
    });
    expect(user).toBeTruthy();
    expect(user?.email_verified).toBe(false);
  });

  it('deve rejeitar email duplicado', async () => {
    // Cria o primeiro
    await prisma.user.create({
      data: {
        email: 'existe@example.com',
        name: 'Existente',
        password_hash: 'hash',
        email_verified: true,
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Novo',
        email: 'existe@example.com',
        password: 'senha123',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toContain('já cadastrado');
  });

  it('deve rejeitar email inválido', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Teste',
        email: 'nao-e-email',
        password: 'senha123',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('deve fazer login com credenciais válidas', async () => {
    // Cria usuário verificado
    const user = await prisma.user.create({
      data: {
        email: 'login@example.com',
        name: 'Login Test',
        password_hash: '$2b$10$abcdefghijklmnopqrstuv', // hash de "senha123" fake - vamos usar bcrypt real
        email_verified: true,
      },
    });

    // Vamos usar o fluxo real: registrar + verificar
    await cleanDatabase();

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Login Test',
        email: 'login@example.com',
        password: 'senha123',
      },
    });

    await prisma.user.update({
      where: { email: 'login@example.com' },
      data: { email_verified: true },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'login@example.com',
        password: 'senha123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('login@example.com');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('deve rejeitar login de usuário não verificado', async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Não Verificado',
        email: 'noverificado@example.com',
        password: 'senha123',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'noverificado@example.com',
        password: 'senha123',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.message).toContain('não verificado');
  });

  it('deve rejeitar senha incorreta', async () => {
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Test',
        email: 'senhaerrada@example.com',
        password: 'senha123',
      },
    });

    await prisma.user.update({
      where: { email: 'senhaerrada@example.com' },
      data: { email_verified: true },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'senhaerrada@example.com',
        password: 'senha_errada',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});