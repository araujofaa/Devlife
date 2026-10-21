import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/shared/database/prisma';

beforeAll(async () => {
  // Garante que estamos usando o banco de teste
  if (!process.env.DATABASE_URL?.includes('test')) {
    console.warn('⚠️  Rodando testes fora do banco de teste!');
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});