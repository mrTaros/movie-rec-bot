import cron from 'node-cron';
import { DateTime } from 'luxon';
import { TIMEZONE } from '../config.js';
import { logger } from '../utils/logger.js';
import { sendAutoDigest } from '../bot/commands.js';
import type { Database } from 'better-sqlite3';

/**
 * Запускает cron job для еженедельной подборки
 * По ТЗ: каждую пятницу в 18:00 по МСК (Europe/Moscow)
 */
export function startWeeklyDigestJob(db: Database): cron.ScheduledTask {
  // Cron: каждую пятницу в 18:00
  // Формат: секунды минуты часы день месяц день_недели
  // 5 = пятница (0 = воскресенье)
  const cronExpression = '0 18 * * 5';

  const task = cron.schedule(
    cronExpression,
    async () => {
      const now = DateTime.now().setZone(TIMEZONE);
      logger.info(
        { time: now.toISO(), timezone: TIMEZONE },
        'Running weekly digest job'
      );

      try {
        await sendAutoDigest(db);
      } catch (error) {
        logger.error({ error }, 'Weekly digest job failed');
      }
    },
    {
      timezone: TIMEZONE,
    }
  );

  // Логируем следующий запуск
  const nextRun = getNextFriday18();
  logger.info(
    {
      cronExpression,
      timezone: TIMEZONE,
      nextRun: nextRun.toISO(),
    },
    'Weekly digest job scheduled'
  );

  return task;
}

/**
 * Вычисляет дату следующей пятницы 18:00 МСК
 */
function getNextFriday18(): DateTime {
  let date = DateTime.now().setZone(TIMEZONE);

  // Если сейчас пятница и ещё не 18:00, вернём сегодня
  if (date.weekday === 5 && date.hour < 18) {
    return date.set({ hour: 18, minute: 0, second: 0, millisecond: 0 });
  }

  // Иначе находим следующую пятницу
  while (date.weekday !== 5) {
    date = date.plus({ days: 1 });
  }

  return date.set({ hour: 18, minute: 0, second: 0, millisecond: 0 });
}
