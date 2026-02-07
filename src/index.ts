import { bot } from './bot/bot.js';
import { createDatabase, closeDatabase, createRepositories } from './db/database.js';
import { registerCommands } from './bot/commands.js';
import { startWeeklyDigestJob } from './jobs/weeklyDigest.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

// Главная функция запуска бота
async function main() {
  logger.info('🎬 Movie Rec Bot starting...');
  logger.info({ config: { timezone: config.TIMEZONE, dbPath: config.DB_PATH } });

  // Инициализируем БД
  const db = createDatabase();
  const repos = createRepositories(db);

  // Регистрируем команды
  registerCommands(db);

  // Запускаем cron job
  const cronTask = startWeeklyDigestJob(db);

  // Периодически чистим старые записи (раз в день)
  setInterval(
    () => {
      logger.debug('Running cleanup tasks...');
      repos.sentItems.cleanupOldItems();
      repos.rateLimit.cleanupOldEntries();
    },
    24 * 60 * 60 * 1000 // 24 часа
  );

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    
    // Останавливаем cron
    cronTask.stop();
    
    // Останавливаем бота
    await bot.stop();
    
    // Закрываем БД
    closeDatabase(db);
    
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Запускаем бота
  logger.info('🤖 Bot started successfully! Long polling enabled.');
  await bot.start();
}

// Запуск с обработкой ошибок
main().catch((error) => {
  logger.error({ error }, 'Fatal error during startup');
  process.exit(1);
});
