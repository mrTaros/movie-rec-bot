import { Bot } from 'grammy';
import { BOT_TOKEN } from '../config.js';
import { logger } from '../utils/logger.js';

// Создаём инстанс бота
export const bot = new Bot(BOT_TOKEN);

// Глобальный error handler
bot.catch((err) => {
  logger.error({ error: err.error }, 'Bot error occurred');
});

// Логируем старт polling
bot.on('message', (ctx, next) => {
  logger.debug({
    userId: ctx.from?.id,
    username: ctx.from?.username,
    chatId: ctx.chat.id,
    text: ctx.message.text,
  }, 'Received message');
  return next();
});
