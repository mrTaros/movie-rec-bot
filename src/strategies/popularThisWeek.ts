import { tmdbClient, TmdbApiError } from '../providers/tmdb.js';
import { filterIndianContent } from '../rules/filters.js';
import { filterDuplicates } from '../rules/dedup.js';
import type { SentItemsRepository } from '../db/schema.js';
import type { DigestContent, MovieItem, SeriesItem } from '../utils/types.js';
import { logger } from '../utils/logger.js';

/**
 * Получает трендовые фильмы и сериалы за неделю
 * Применяет фильтры (Индия) и дедупликацию
 * 
 * По ТЗ: всегда отправлять что есть, даже если меньше 3+3
 */
export async function getPopularThisWeek(
  sentItemsRepo: SentItemsRepository
): Promise<DigestContent> {
  try {
    logger.info('Fetching popular content for this week...');

    // Получаем трендовые фильмы и сериалы параллельно
    const [moviesResponse, seriesResponse] = await Promise.all([
      tmdbClient.getTrendingMovies(1),
      tmdbClient.getTrendingSeries(1),
    ]);

    // Применяем фильтры
    let movies = moviesResponse.results;
    let series = seriesResponse.results;

    // 1. Фильтр индийского контента
    movies = filterIndianContent(movies);
    series = filterIndianContent(series);

    logger.debug(
      `After India filter: ${movies.length} movies, ${series.length} series`
    );

    // 2. Дедупликация (30 дней)
    movies = filterDuplicates(movies, sentItemsRepo);
    series = filterDuplicates(series, sentItemsRepo);

    logger.debug(
      `After dedup: ${movies.length} movies, ${series.length} series`
    );

    // Берём первые 3 фильма и 3 сериала (или меньше если не хватает)
    const selectedMovies = movies.slice(0, 3);
    const selectedSeries = series.slice(0, 3);

    logger.info(
      `Selected ${selectedMovies.length} movies and ${selectedSeries.length} series`
    );

    // Нормализуем к внутренним типам
    const result: DigestContent = {
      movies: selectedMovies.map((m) => ({
        id: m.id,
        title: m.title,
        originalLanguage: m.original_language,
        originCountry: m.origin_country,
      })),
      series: selectedSeries.map((s) => ({
        id: s.id,
        name: s.name,
        originalLanguage: s.original_language,
        originCountry: s.origin_country,
      })),
    };

    return result;
  } catch (error) {
    if (error instanceof TmdbApiError) {
      logger.error({ error: error.message }, 'TMDB API error');
      throw error;
    }
    logger.error({ error }, 'Failed to fetch popular content');
    throw new Error('Failed to fetch popular content');
  }
}
