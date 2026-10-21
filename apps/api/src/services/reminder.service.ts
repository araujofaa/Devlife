import { prisma } from '../shared/database/prisma';
import { notificationService } from '../modules/notifications/service/notification.service';
import { pushService } from '../modules/notifications/service/push.service';
import { sendWhatsAppMessage } from './whatsapp.service';

/**
 * Verifica tarefas E subtarefas pendentes com vencimento dentro do prazo
 * configurado pelo usuário e envia notificações (interna, push e WhatsApp).
 */
export async function checkUpcomingTasks() {
  console.log('[Reminder] Verificando tarefas e subtarefas vencendo...');
  const now = new Date();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone_number: true,
      reminder_offset_hours: true,
    },
  });

  for (const user of users) {
    // Garante que phone_number é uma string (narrowing do TypeScript)
    if (!user.phone_number) {
      console.log(
        `[Reminder] Usuário ${user.email} sem telefone. Pulando envio.`
      );
      continue;
    }

    const phoneNumber: string = user.phone_number;
    const cleanPhone: string = phoneNumber.replace(/\D/g, '');

    const offsetHours = user.reminder_offset_hours || 24;
    const threshold = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);

    // ============================================
    // 1. TAREFAS principais
    // ============================================
    const tasks = await prisma.task.findMany({
      where: {
        user_id: user.id,
        due_date: { gte: now, lte: threshold },
        status: 'pending',
      },
    });

    // ============================================
    // 2. SUBTAREFAS pendentes
    // ============================================
    const subtasks = await prisma.subtask.findMany({
      where: {
        completed: false,
        due_date: { gte: now, lte: threshold },
        task: {
          user_id: user.id,
          deleted_at: null,
        },
      },
      include: {
        task: {
          select: { id: true, title: true },
        },
      },
    });

    if (tasks.length === 0 && subtasks.length === 0) {
      continue;
    }

    console.log(
      `[Reminder] ${user.email}: ${tasks.length} tarefa(s) + ${subtasks.length} subtarefa(s) próximas do vencimento.`
    );

    // ============================================
    // 3. Notifica cada TAREFA
    // ============================================
    for (const task of tasks) {
      const dueDate = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(task.due_date!));

      const title = '📅 O prazo para concluir a tarefa vence em breve!';
      const messageText = `O prazo para concluir a tarefa "${task.title}" vence em ${dueDate}. Não se esqueça!`;

      await notificationService.create(user.id, title, messageText);

      try {
        await pushService.sendPushToUser(user.id, title, messageText, {
          taskId: task.id,
        });
      } catch (pushError) {
        console.error(`[Reminder] Erro ao enviar push:`, pushError);
      }

      try {
        await sendWhatsAppMessage({
          to: cleanPhone,
          message: `Olá, ${user.name}!\n\n${title}\n${messageText}\n\nAcesse o DevLife em www.listapday.com.br para mais detalhes.`,
        });
        console.log(`[Reminder] WhatsApp enviado para ${cleanPhone}`);
      } catch (whatsappError) {
        console.error(`[Reminder] Erro ao enviar WhatsApp:`, whatsappError);
      }
    }

    // ============================================
    // 4. Notifica cada SUBTAREFA
    // ============================================
    for (const subtask of subtasks) {
      const dueDate = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(subtask.due_date!));

      const title = '✅ Prazo para concluir subtarefa vence em breve!';
      const messageText = `O prazo para concluir a subtarefa "${subtask.title}" (da tarefa "${subtask.task.title}") vence em ${dueDate}.`;

      await notificationService.create(user.id, title, messageText);

      try {
        await pushService.sendPushToUser(user.id, title, messageText, {
          taskId: subtask.task.id,
        });
      } catch (pushError) {
        console.error(`[Reminder] Erro ao enviar push:`, pushError);
      }

      try {
        await sendWhatsAppMessage({
          to: cleanPhone,
          message: `Olá, ${user.name}!\n\n${title}\n${messageText}\n\nAcesse o DevLife em www.listapday.com.br para mais detalhes.`,
        });
        console.log(`[Reminder] WhatsApp de subtarefa enviado para ${cleanPhone}`);
      } catch (whatsappError) {
        console.error(`[Reminder] Erro ao enviar WhatsApp:`, whatsappError);
      }
    }
  }
}