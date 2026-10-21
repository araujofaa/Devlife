import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/shared/database/prisma', () => ({
  prisma: {
    task: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    note: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { statsService } from '../../src/modules/stats/service/stats.service';
import { prisma } from '../../src/shared/database/prisma';

describe('statsService.getDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar as estatísticas corretas', async () => {
    vi.mocked(prisma.task.count)
      .mockResolvedValueOnce(5) // done
      .mockResolvedValueOnce(3) // pending
      .mockResolvedValueOnce(1) // low
      .mockResolvedValueOnce(1) // medium
      .mockResolvedValueOnce(1); // high

    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.count)
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(2); // this month
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    const result = await statsService.getDashboardStats('user-1');

    expect(result.tasks.total).toBe(8);
    expect(result.tasks.done).toBe(5);
    expect(result.tasks.pending).toBe(3);
    expect(result.notes.total).toBe(10);
    expect(result.charts.tasksStatus).toHaveLength(2);
    expect(result.charts.priorityDistribution).toHaveLength(3);
    expect(result.charts.weeklyProgress).toHaveLength(7);
    expect(result.charts.notesPerMonth).toHaveLength(6);
  });
});