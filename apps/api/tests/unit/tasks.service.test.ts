import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tasksService } from '../../src/modules/tasks/service/tasks.service';

// Mock do repository
vi.mock('../../src/modules/tasks/repository/tasks.repository', () => ({
  tasksRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { tasksRepository } from '../../src/modules/tasks/repository/tasks.repository';

describe('tasksService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar uma tarefa para o usuário', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Minha tarefa',
        priority: 'medium',
        status: 'pending',
        due_date: null,
        user_id: 'user-1',
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      vi.mocked(tasksRepository.create).mockResolvedValue(mockTask as any);

      const result = await tasksService.create('user-1', {
        title: 'Minha tarefa',
        priority: 'medium',
        status: 'pending',
      });

      expect(result).toEqual(mockTask);
      expect(tasksRepository.create).toHaveBeenCalledWith({
        title: 'Minha tarefa',
        priority: 'medium',
        status: 'pending',
        user: { connect: { id: 'user-1' } },
      });
    });
  });

  describe('getById', () => {
    it('deve retornar a tarefa quando ela existe', async () => {
      const mockTask = { id: 'task-1', title: 'Tarefa', user_id: 'user-1' };
      vi.mocked(tasksRepository.findById).mockResolvedValue(mockTask as any);

      const result = await tasksService.getById('user-1', 'task-1');
      expect(result).toEqual(mockTask);
    });

    it('deve lançar erro quando a tarefa não existe', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(null);

      await expect(
        tasksService.getById('user-1', 'inexistente')
      ).rejects.toThrow('Tarefa não encontrada');
    });
  });

  describe('delete', () => {
    it('deve lançar erro se a tarefa não pertence ao usuário', async () => {
      vi.mocked(tasksRepository.findById).mockResolvedValue(null);

      await expect(
        tasksService.delete('user-1', 'task-1')
      ).rejects.toThrow('Tarefa não encontrada');

      expect(tasksRepository.delete).not.toHaveBeenCalled();
    });
  });
});