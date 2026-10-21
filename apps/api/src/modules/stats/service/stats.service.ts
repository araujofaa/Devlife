import { prisma } from '../../../shared/database/prisma';

export const statsService = {
  async getDashboardStats(userId: string) {
    const now = new Date();

    // Período da semana atual (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Período do mês atual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ============================================
    // 1. Tarefas: concluídas vs pendentes
    // ============================================
    const [tasksDone, tasksPending] = await Promise.all([
      prisma.task.count({ where: { user_id: userId, status: 'done' } }),
      prisma.task.count({ where: { user_id: userId, status: 'pending' } }),
    ]);

    // ============================================
    // 2. Progresso semanal (últimos 7 dias)
    // ============================================
    const completedThisWeek = await prisma.task.findMany({
      where: {
        user_id: userId,
        status: 'done',
        updated_at: { gte: sevenDaysAgo },
      },
      select: { updated_at: true },
    });

    const createdThisWeek = await prisma.task.findMany({
      where: {
        user_id: userId,
        created_at: { gte: sevenDaysAgo },
      },
      select: { created_at: true },
    });

    // Agrupa por dia da semana (0 = Domingo, 6 = Sábado)
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weeklyProgress = weekDays.map((day, index) => {
      const created = createdThisWeek.filter(
        (t) => new Date(t.created_at).getDay() === index
      ).length;
      const completed = completedThisWeek.filter(
        (t) => new Date(t.updated_at).getDay() === index
      ).length;
      return { day, created, completed };
    });

    // ============================================
    // 3. Distribuição por prioridade
    // ============================================
    const [lowPriority, mediumPriority, highPriority] = await Promise.all([
      prisma.task.count({ where: { user_id: userId, priority: 'low', status: 'pending' } }),
      prisma.task.count({ where: { user_id: userId, priority: 'medium', status: 'pending' } }),
      prisma.task.count({ where: { user_id: userId, priority: 'high', status: 'pending' } }),
    ]);

    const priorityDistribution = [
      { name: 'Baixa', value: lowPriority, color: '#22c55e' },
      { name: 'Média', value: mediumPriority, color: '#eab308' },
      { name: 'Alta', value: highPriority, color: '#ef4444' },
    ];

    // ============================================
    // 4. Notas criadas nos últimos 6 meses
    // ============================================
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const notesThisPeriod = await prisma.note.findMany({
      where: {
        user_id: userId,
        created_at: { gte: sixMonthsAgo },
      },
      select: { created_at: true },
    });

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const notesPerMonth = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const count = notesThisPeriod.filter((n) => {
        const d = new Date(n.created_at);
        return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
      }).length;
      notesPerMonth.push({ month: monthNames[month.getMonth()], count });
    }

    // ============================================
    // Retorno consolidado
    // ============================================
    return {
      tasks: {
        done: tasksDone,
        pending: tasksPending,
        total: tasksDone + tasksPending,
      },
      notes: {
        total: await prisma.note.count({ where: { user_id: userId } }),
        thisMonth: await prisma.note.count({
          where: { user_id: userId, created_at: { gte: startOfMonth } },
        }),
      },
      charts: {
        tasksStatus: [
          { name: 'Concluídas', value: tasksDone, color: '#22c55e' },
          { name: 'Pendentes', value: tasksPending, color: '#f59e0b' },
        ],
        weeklyProgress,
        priorityDistribution,
        notesPerMonth,
      },
    };
  },
};