import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createTestApp, cleanDatabase, createTestUser } from '../helpers/testApp';
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

describe('Tasks CRUD', () => {
  it('deve criar, listar, atualizar e deletar uma tarefa', async () => {
    const { cookie } = await createTestUser(app);

    // CREATE
    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { cookie },
      payload: {
        title: 'Minha tarefa de teste',
        description: 'Descrição',
        priority: 'high',
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const task = createResponse.json().data;
    expect(task.title).toBe('Minha tarefa de teste');

    // LIST
    const listResponse = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: { cookie },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().data.tasks).toHaveLength(1);
    expect(listResponse.json().data.total).toBe(1);

    // UPDATE
    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/tasks/${task.id}`,
      headers: { cookie },
      payload: { status: 'done' },
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json().data.status).toBe('done');

    // DELETE
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/tasks/${task.id}`,
      headers: { cookie },
    });

    expect(deleteResponse.statusCode).toBe(200);

    // Confirma que sumiu
    const afterDelete = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: { cookie },
    });
    expect(afterDelete.json().data.tasks).toHaveLength(0);
  });

  it('não deve permitir acessar tarefa de outro usuário', async () => {
    const { cookie: cookieA } = await createTestUser(app);
    const { cookie: cookieB } = await createTestUser(app);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { cookie: cookieA },
      payload: { title: 'Tarefa do A' },
    });

    const taskId = createResponse.json().data.id;

    // Usuário B tenta acessar
    const response = await app.inject({
      method: 'GET',
      url: `/tasks/${taskId}`,
      headers: { cookie: cookieB },
    });

    expect(response.statusCode).toBe(404);
  });

  it('deve exigir autenticação', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/tasks',
    });

    expect(response.statusCode).toBe(401);
  });
});