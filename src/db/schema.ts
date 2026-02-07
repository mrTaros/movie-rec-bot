import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import type { BotSettings } from '../utils/types.js';

export function initializeSchema(db: Database.Database): void {
  logger.info('Initializing database schema...');

  // Таблица настроек (key-value store)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Таблица отправленных items (для дедупликации 30 дней)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sent_items (
      item_id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL CHECK(item_type IN ('movie', 'series')),
      sent_at INTEGER NOT NULL
    )
  `);

  // Таблица rate limiting
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limit (
      key TEXT PRIMARY KEY,
      last_used_at INTEGER NOT NULL
    )
  `);

  // Индексы для быстрых запросов
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sent_items_sent_at 
    ON sent_items(sent_at)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_rate_limit_last_used 
    ON rate_limit(last_used_at)
  `);

  // Инициализируем настройки по умолчанию
  const settingsStmt = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );

  settingsStmt.run('enabled', 'true');
  settingsStmt.run('target_chat_id', '');
  settingsStmt.run('target_thread_id', '');

  logger.info('Database schema initialized successfully');
}

// Утилиты для работы с настройками
export class SettingsRepository {
  constructor(private db: Database.Database) {}

  getSettings(): BotSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string;
      value: string;
    }>;

    const settings: Record<string, string> = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return {
      enabled: settings.enabled === 'true',
      targetChatId: settings.target_chat_id ? Number(settings.target_chat_id) : undefined,
      targetThreadId: settings.target_thread_id ? Number(settings.target_thread_id) : undefined,
    };
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(key, value);
  }

  setEnabled(enabled: boolean): void {
    this.setSetting('enabled', enabled.toString());
  }

  setBinding(chatId: number, threadId?: number): void {
    this.setSetting('target_chat_id', chatId.toString());
    this.setSetting('target_thread_id', threadId?.toString() || '');
  }

  clearBinding(): void {
    this.setSetting('target_chat_id', '');
    this.setSetting('target_thread_id', '');
  }
}

// Утилиты для работы с sent_items (дедупликация)
export class SentItemsRepository {
  constructor(private db: Database.Database) {}

  addItem(itemId: string, itemType: 'movie' | 'series'): void {
    const now = Math.floor(Date.now() / 1000);
    this.db
      .prepare('INSERT OR IGNORE INTO sent_items (item_id, item_type, sent_at) VALUES (?, ?, ?)')
      .run(itemId, itemType, now);
  }

  hasBeenSent(itemId: string): boolean {
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const result = this.db
      .prepare('SELECT 1 FROM sent_items WHERE item_id = ? AND sent_at > ?')
      .get(itemId, thirtyDaysAgo);
    return result !== undefined;
  }

  cleanupOldItems(): void {
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const info = this.db
      .prepare('DELETE FROM sent_items WHERE sent_at <= ?')
      .run(thirtyDaysAgo);
    logger.debug(`Cleaned up ${info.changes} old sent items`);
  }
}

// Утилиты для rate limiting
export class RateLimitRepository {
  constructor(private db: Database.Database) {}

  canUseCommand(chatId: number, userId: number, action: string): boolean {
    const key = `${chatId}:${userId}:${action}`;
    const now = Math.floor(Date.now() / 1000);
    const thirtySecondsAgo = now - 30;

    const result = this.db
      .prepare('SELECT last_used_at FROM rate_limit WHERE key = ?')
      .get(key) as { last_used_at: number } | undefined;

    if (!result || result.last_used_at < thirtySecondsAgo) {
      this.db
        .prepare('INSERT OR REPLACE INTO rate_limit (key, last_used_at) VALUES (?, ?)')
        .run(key, now);
      return true;
    }

    return false;
  }

  cleanupOldEntries(): void {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 60 * 60;
    const info = this.db
      .prepare('DELETE FROM rate_limit WHERE last_used_at <= ?')
      .run(oneHourAgo);
    logger.debug(`Cleaned up ${info.changes} old rate limit entries`);
  }
}
