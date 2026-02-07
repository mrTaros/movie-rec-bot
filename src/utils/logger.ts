import pino from 'pino';
import { LOG_LEVEL } from '../config.js';

// Создаём логгер с красивым форматированием для разработки
export const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Утилита для безопасного логирования (маскирует токены)
export function maskSensitive(text: string): string {
  return text.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***');
}
