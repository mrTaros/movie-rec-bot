import Database from 'better-sqlite3';
import { dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { DB_PATH } from '../config.js';
import { logger } from '../utils/logger.js';
import {
  initializeSchema,
  SettingsRepository,
  SentItemsRepository,
  RateLimitRepository,
} from './schema.js';

// Создаём папку для БД если её нет
function ensureDbDirectory(dbPath: string): void {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    logger.info(`Created database directory: ${dir}`);
  }
}

// Инициализируем БД
export function createDatabase(): Database.Database {
  ensureDbDirectory(DB_PATH);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // Улучшает производительность

  logger.info(`Database connected: ${DB_PATH}`);

  // Инициализируем схему
  initializeSchema(db);

  return db;
}

// Создаём репозитории
export function createRepositories(db: Database.Database) {
  return {
    settings: new SettingsRepository(db),
    sentItems: new SentItemsRepository(db),
    rateLimit: new RateLimitRepository(db),
  };
}

// Graceful shutdown
export function closeDatabase(db: Database.Database): void {
  db.close();
  logger.info('Database connection closed');
}
