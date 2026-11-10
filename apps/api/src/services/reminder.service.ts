import { prisma } from '../shared/database/prisma';
import { notificationService } from '../modules/notifications/service/notification.service';
import { pushService } from '../modules/notifications/service/push.service';
import { sendWhatsAppTemplate } from './whatsapp.service';

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
    const phoneNumber = user.phone_number;
    const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : null;
    
    const offsetHours = user.reminder_offset_hours || 24;
    const threshold = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);

    // 1. TAREFAS principais (🆕 Filtra por reminder_sent: false)
    const tasks = await prisma.task.findMany({
      where: {
        user_id: user.id,
        due_date: { gte: now, lte: threshold },
        status: 'pending',
        reminder_sent: false, // 🆕 Só pega as que ainda não foram notificadas
      },
    });

    // 2. SUBTAREFAS pendentes (🆕 Filtra por reminder_sent: false)
    const subtasks = await prisma.subtask.findMany({
      where: {
        completed: false,
        due_date: { gte: now, lte: threshold },
        task: { user_id: user.id, deleted_at: null },
        reminder_sent: false, // 🆕 Só pega as que ainda não foram notificadas
      },
      include: { task: { select: { id: true, title: true } } },
    });

    if (tasks.length === 0 && subtasks.length === 0) continue;

    // Notifica TAREFAS
    for (const task of tasks) {
      const dueDate = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(task.due_date!));

      const title = '📅 O prazo para concluir a tarefa vence em breve!';
      const messageText = `O prazo para concluir a tarefa "${task.title}" vence em ${dueDate}. Não se esqueça!`;
      
      await notificationService.create(user.id, title, messageText);
      
      try {
        await pushService.sendPushToUser(user.id, title, messageText, { taskId: task.id });
      } catch (pushError) {
        console.error(`[Reminder] Erro ao enviar push:`, pushError);
      }

      if (cleanPhone) {
        try {
          await sendWhatsAppTemplate({
            to: cleanPhone,
            templateName: 'lembrete_tarefa_vencendo',
            languageCode: 'pt_BR',
            parameters: [user.name, task.title, dueDate]
          });
        } catch (whatsappError) {
          console.error(`[Reminder] Erro ao enviar WhatsApp:`, whatsappError);
        }
      }

      // 🆕 MARCA COMO NOTIFICADA NO BANCO
      await prisma.task.update({
        where: { id: task.id },
        data: { reminder_sent: true } as any,
      });
    }

    // Notifica SUBTAREFAS
    for (const subtask of subtasks) {
      const dueDate = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(subtask.due_date!));

      const title = '✅ Prazo para concluir subtarefa vence em breve!';
      const messageText = `O prazo para concluir a subtarefa "${subtask.title}" (da tarefa "${subtask.task.title}") vence em ${dueDate}.`;

      await notificationService.create(user.id, title, messageText);
      
      try {
        await pushService.sendPushToUser(user.id, title, messageText, { taskId: subtask.task.id });
      } catch (pushError) {
        console.error(`[Reminder] Erro ao enviar push:`, pushError);
      }

      if (cleanPhone) {
        try {
          await sendWhatsAppTemplate({
            to: cleanPhone,
            templateName: 'lembrete_tarefa_vencendo',
            languageCode: 'pt_BR',
            parameters: [user.name, subtask.title, dueDate]
          });
        } catch (whatsappError) {
          console.error(`[Reminder] Erro ao enviar WhatsApp:`, whatsappError);
        }
      }

      // 🆕 MARCA COMO NOTIFICADA NO BANCO
      await prisma.subtask.update({
        where: { id: subtask.id },
        data: { reminder_sent: true } as any,
      });
    }
  }
}