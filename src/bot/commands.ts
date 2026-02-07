import { Context } from 'grammy';
import { bot } from './bot.js';
import { ownerOnly } from './middleware/auth.js';
import { rateLimit } from './middleware/rateLimit.js';
import { bindToTopic, unbindFromTopic, shouldRespondHere } from './binding.js';
import { getPopularThisWeek } from '../strategies/popularThisWeek.js';
import { formatDigestHtml } from '../formatters/digestHtml.js';
import { markAsSent } from '../rules/dedup.js';
import { TmdbApiError } from '../providers/tmdb.js';
import type { Database } from 'better-sqlite3';
import { createRepositories } from '../db/database.js';
import { logger } from '../utils/logger.js';

/**
 * Регистрирует все команды бота
 */
export function registerCommands(db: Database) {
  const repos = createRepositories(db);

  // ============================================
  // OWNER-ONLY КОМАНДЫ
  // ============================================

  // /bind_here - привязать к топику
  bot.command('bind_here', ownerOnly(), async (ctx) => {
    await bindToTopic(ctx, repos.settings);
  });

  // /unbind - снять привязку
  bot.command('unbind', ownerOnly(), async (ctx) => {
    await unbindFromTopic(ctx, repos.settings);
  });

  // /start_bot - включить авто-режим
  bot.command('start_bot', ownerOnly(), async (ctx) => {
    repos.settings.setEnabled(true);
    logger.info('Auto mode enabled');
    await ctx.reply('✅ Автоматический режим включён.\nПодборки будут отправляться по пятницам в 18:00 МСК.');
  });

  // /stop_bot - выключить авто-режим
  bot.command('stop_bot', ownerOnly(), async (ctx) => {
    repos.settings.setEnabled(false);
    logger.info('Auto mode disabled');
    await ctx.reply('⏸️ Автоматический режим выключен.\nПодборки не будут отправляться автоматически.');
  });

  // /status - показать статус
  bot.command('status', ownerOnly(), async (ctx) => {
    const settings = repos.settings.getSettings();

    const statusLines = [
      '<b>📊 Статус бота:</b>\n',
      `• Авто-режим: ${settings.enabled ? '✅ включён' : '⏸️ выключен'}`,
      `• Привязка: ${
        settings.targetChatId
          ? `✅ chat=${settings.targetChatId}, thread=${settings.targetThreadId || 'none'}`
          : '❌ нет'
      }`,
      `• Расписание: пятница 18:00 МСК`,
    ];

    await ctx.reply(statusLines.join('\n'), { parse_mode: 'HTML' });
  });

  // ============================================
  // ПУБЛИЧНЫЕ КОМАНДЫ (с проверкой binding)
  // ============================================

  // /recommend - получить подборку
  bot.command(
    'recommend',
    rateLimit(repos.rateLimit, 'recommend'),
    async (ctx) => {
      // Проверяем, должны ли мы отвечать здесь
      if (!shouldRespondHere(ctx, repos.settings)) {
        logger.debug('Ignoring command outside bound topic');
        return;
      }

      await sendDigest(ctx, repos);
    }
  );

  // /more - ещё одна подборка
  bot.command(
    'more',
    rateLimit(repos.rateLimit, 'more'),
    async (ctx) => {
      // Проверяем, должны ли мы отвечать здесь
      if (!shouldRespondHere(ctx, repos.settings)) {
        logger.debug('Ignoring command outside bound topic');
        return;
      }

      await sendDigest(ctx, repos);
    }
  );

  logger.info('Bot commands registered');
}

/**
 * Отправляет подборку в текущий чат
 */
async function sendDigest(
  ctx: Context,
  repos: ReturnType<typeof createRepositories>
): Promise<void> {
  try {
    // Получаем контент
    const content = await getPopularThisWeek(repos.sentItems);

    // Проверяем, что получили хоть что-то
    if (content.movies.length === 0 && content.series.length === 0) {
      await ctx.reply('😔 К сожалению, не удалось найти подходящий контент. Попробуйте позже.');
      return;
    }

    // Форматируем и отправляем
    const message = formatDigestHtml(content);
    await ctx.reply(message, { parse_mode: 'HTML' });

    // Помечаем как отправленные (для дедупа)
    markAsSent(
      content.movies.map((m) => ({
        id: m.id,
        title: m.title,
        original_language: m.originalLanguage,
        origin_country: m.originCountry,
      })),
      content.series.map((s) => ({
        id: s.id,
        name: s.name,
        original_language: s.originalLanguage,
        origin_country: s.originCountry,
      })),
      repos.sentItems
    );

    logger.info(
      { movies: content.movies.length, series: content.series.length },
      'Digest sent successfully'
    );
  } catch (error) {
    if (error instanceof TmdbApiError) {
      // API недоступен
      logger.error('TMDB API unavailable');
      
      // В личке отвечаем, в группе можем тоже (1 раз)
      if (ctx.chat?.type === 'private') {
        await ctx.reply('⚠️ Источник недоступен, попробуйте позже.');
      } else {
        await ctx.reply('⚠️ Источник недоступен, попробуйте позже.');
      }
    } else {
      // Другая ошибка
      logger.error({ error }, 'Failed to send digest');
      await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    }
  }
}

/**
 * Экспортируем для использования в cron job
 */
export async function sendAutoDigest(db: Database): Promise<void> {
  const repos = createRepositories(db);
  const settings = repos.settings.getSettings();

  // Проверяем, включён ли авто-режим
  if (!settings.enabled) {
    logger.info('Auto mode disabled, skipping digest');
    return;
  }

  try {
    // Получаем контент
    const content = await getPopularThisWeek(repos.sentItems);

    // Проверяем, что получили хоть что-то
    if (content.movies.length === 0 && content.series.length === 0) {
      logger.warn('No content available for auto digest');
      return;
    }

    // Форматируем сообщение
    const message = formatDigestHtml(content);

    // Определяем, куда отправлять
    if (settings.targetChatId) {
      // Есть привязка - отправляем в тему
      await bot.api.sendMessage(settings.targetChatId, message, {
        parse_mode: 'HTML',
        message_thread_id: settings.targetThreadId,
      });

      logger.info(
        {
          chatId: settings.targetChatId,
          threadId: settings.targetThreadId,
          movies: content.movies.length,
          series: content.series.length,
        },
        'Auto digest sent to bound topic'
      );
    } else {
      // Нет привязки - не отправляем (нет личного чата в авто-режиме по ТЗ)
      logger.info('No binding set, auto digest not sent');
    }

    // Помечаем как отправленные
    markAsSent(
      content.movies.map((m) => ({
        id: m.id,
        title: m.title,
        original_language: m.originalLanguage,
        origin_country: m.originCountry,
      })),
      content.series.map((s) => ({
        id: s.id,
        name: s.name,
        original_language: s.originalLanguage,
        origin_country: s.originCountry,
      })),
      repos.sentItems
    );
  } catch (error) {
    if (error instanceof TmdbApiError) {
      logger.error('TMDB API unavailable, skipping auto digest');
    } else {
      logger.error({ error }, 'Failed to send auto digest');
    }
    // По ТЗ: если API недоступен, ничего не отправляем, только логируем
  }
}
