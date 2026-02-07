import type { SentItemsRepository } from '../db/schema.js';
import type { TmdbMovieResponse, TmdbSeriesResponse } from '../utils/types.js';

/**
 * Фильтрует items, исключая те, что были отправлены за последние 30 дней
 */
export function filterDuplicates<T extends TmdbMovieResponse | TmdbSeriesResponse>(
  items: T[],
  sentItemsRepo: SentItemsRepository
): T[] {
  return items.filter((item) => {
    const itemId = item.id.toString();
    return !sentItemsRepo.hasBeenSent(itemId);
  });
}

/**
 * Помечает items как отправленные
 */
export function markAsSent(
  movies: TmdbMovieResponse[],
  series: TmdbSeriesResponse[],
  sentItemsRepo: SentItemsRepository
): void {
  movies.forEach((movie) => {
    sentItemsRepo.addItem(movie.id.toString(), 'movie');
  });

  series.forEach((s) => {
    sentItemsRepo.addItem(s.id.toString(), 'series');
  });
}
