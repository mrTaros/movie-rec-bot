import { Context } from 'grammy';
import type { SettingsRepository } from '../db/schema.js';
import { logger } from '../utils/logger.js';

/**
 * Привязывает бота к текущему Topic
 * По ТЗ: работает только в теме с названием "фильмы и сериалы"
 */
export async function bindToTopic(
  ctx: Context,
  settingsRepo: SettingsRepository
): Promise<void> {
  const chatId = ctx.chat?.id;
  const threadId = ctx.message?.message_thread_id;

  if (!chatId) {
    await ctx.reply('❌ Не удалось определить чат.');
    return;
  }

  // Проверяем, что это топик (есть message_thread_id)
  if (!threadId) {
    await ctx.reply(
      '❌ Эта команда работает только внутри топика (темы) группы.\n' +
        'Напишите её в теме "фильмы и сериалы".'
    );
    return;
  }

  // Сохраняем привязку
  settingsRepo.setBinding(chatId, threadId);

  logger.info({ chatId, threadId }, 'Bot bound to topic');

  await ctx.reply(
    '✅ Бот привязан к этой теме!\n\n' +
      'Теперь:\n' +
      '• Автоматические подборки будут отправляться сюда\n' +
      '• Команды /recommend и /more работают только в этой теме'
  );
}

/**
 * Снимает привязку бота
 */
export async function unbindFromTopic(
  ctx: Context,
  settingsRepo: SettingsRepository
): Promise<void> {
  settingsRepo.clearBinding();

  logger.info('Bot unbound from topic');

  await ctx.reply(
    '✅ Привязка снята!\n\n' +
      'Теперь:\n' +
      '• Автоматические подборки будут отправляться в личку с ботом\n' +
      '• Команды работают везде'
  );
}

/**
 * Проверяет, должен ли бот отвечать в этом чате/топике
 * По ТЗ: если есть привязка, отвечаем только в привязанной теме
 */
export function shouldRespondHere(
  ctx: Context,
  settingsRepo: SettingsRepository
): boolean {
  const settings = settingsRepo.getSettings();

  // Если нет привязки, отвечаем везде
  if (!settings.targetChatId) {
    return true;
  }

  const chatId = ctx.chat?.id;
  const threadId = ctx.message?.message_thread_id;

  // Проверяем совпадение chat_id и thread_id
  const chatMatches = chatId === settings.targetChatId;
  const threadMatches = threadId === settings.targetThreadId;

  return chatMatches && threadMatches;
}
