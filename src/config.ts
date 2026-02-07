import 'dotenv/config';
import { z } from 'zod';

// Schema для валидации environment variables
const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  OWNER_USER_ID: z.string().regex(/^\d+$/, 'OWNER_USER_ID must be a number').transform(Number),
  TMDB_AUTH: z.string().min(1, 'TMDB_AUTH is required (Bearer token)'),
  TIMEZONE: z.string().default('Europe/Moscow'),
  DB_PATH: z.string().default('./data/bot.db'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Парсим и валидируем ENV
function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

// Экспортируем для удобного использования
export const BOT_TOKEN = config.BOT_TOKEN;
export const OWNER_USER_ID = config.OWNER_USER_ID;
export const TMDB_AUTH = config.TMDB_AUTH;
export const TIMEZONE = config.TIMEZONE;
export const DB_PATH = config.DB_PATH;
export const LOG_LEVEL = config.LOG_LEVEL;
