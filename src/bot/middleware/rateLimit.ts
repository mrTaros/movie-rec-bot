import { Context, MiddlewareFn } from 'grammy';
import type { RateLimitRepository } from '../../db/schema.js';
import { logger } from '../../utils/logger.js';

/**
 * Middleware для rate limiting (1 команда в 30 секунд)
 */
export function rateLimit(
  rateLimitRepo: RateLimitRepository,
  action: string
): MiddlewareFn<Context> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) {
      return next();
    }

    const canUse = rateLimitRepo.canUseCommand(chatId, userId, action);

    if (!canUse) {
      logger.debug({ userId, chatId, action }, 'Rate limit hit');
      // В личке отвечаем, в группе молчим
      if (ctx.chat.type === 'private') {
        await ctx.reply('⏱️ Подождите 30 секунд перед следующей командой.');
      }
      return;
    }

    return next();
  };
}
