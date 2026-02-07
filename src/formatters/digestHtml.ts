import type { DigestContent } from '../utils/types.js';

/**
 * Экранирует HTML специальные символы
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Форматирует подборку в HTML для Telegram
 * По ТЗ: только названия, без описаний, списком
 * IMDb ссылки НЕ делаем (т.к. нет imdb_id в trending данных)
 */
export function formatDigestHtml(content: DigestContent): string {
  const lines: string[] = [];

  // Секция фильмов
  lines.push('<b>🎬 Movies</b>');
  if (content.movies.length > 0) {
    content.movies.forEach((movie) => {
      const title = escapeHtml(movie.title);
      lines.push(`• ${title}`);
    });
  } else {
    lines.push('• (нет доступных фильмов)');
  }

  // Пустая строка между секциями
  lines.push('');

  // Секция сериалов
  lines.push('<b>📺 Series</b>');
  if (content.series.length > 0) {
    content.series.forEach((series) => {
      const name = escapeHtml(series.name);
      lines.push(`• ${name}`);
    });
  } else {
    lines.push('• (нет доступных сериалов)');
  }

  return lines.join('\n');
}
