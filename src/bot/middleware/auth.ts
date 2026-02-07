import { Context, MiddlewareFn } from 'grammy';
import { OWNER_USER_ID } from '../../config.js';
import { logger } from '../../utils/logger.js';

/**
 * Middleware для проверки owner-only команд
 */
export function ownerOnly(): MiddlewareFn<Context> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (userId !== OWNER_USER_ID) {
      logger.warn({ userId, ownerId: OWNER_USER_ID }, 'Unauthorized command attempt');
      await ctx.reply('❌ Эта команда доступна только владельцу бота.');
      return;
    }

    return next();
  };
}
