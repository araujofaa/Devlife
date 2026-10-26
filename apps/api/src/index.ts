import 'dotenv/config'; // 🆕 Carrega o .env na inicialização
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first'); // 🆕 Força o uso de IPv4
import cron from 'node-cron';
import { buildApp } from './app';
import { checkUpcomingTasks } from './services/reminder.service';

const start = async () => {
  try {
    const fastify = await buildApp({ logger: true });

    await fastify.listen({
      port: Number(process.env.PORT) || 3333,
      host: '0.0.0.0',
    });

    console.log('🚀 Server listening on http://localhost:3333');
    console.log('📚 Swagger disponível em http://localhost:3333/docs');

    // Cron de lembretes (só em runtime, não em testes)
    const cronSchedule = process.env.REMINDER_CRON || '*/30 * * * *';
    cron.schedule(cronSchedule, async () => {
      await checkUpcomingTasks().catch((err) =>
        console.error('Erro no cron de lembretes:', err)
      );
    });

    checkUpcomingTasks().catch((err) =>
      console.error('Erro na verificação inicial:', err)
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();