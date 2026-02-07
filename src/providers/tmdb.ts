import { TMDB_AUTH } from '../config.js';
import { logger } from '../utils/logger.js';
import type {
  TmdbMovieResponse,
  TmdbSeriesResponse,
  TmdbTrendingResponse,
} from '../utils/types.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export class TmdbApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'TmdbApiError';
  }
}

export class TmdbClient {
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${TMDB_BASE_URL}${endpoint}`;

    try {
      logger.debug(`TMDB API Request: ${endpoint}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: TMDB_AUTH,
        },
      });

      if (!response.ok) {
        throw new TmdbApiError(
          `TMDB API error: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof TmdbApiError) {
        throw error;
      }
      logger.error({ error }, 'Failed to fetch from TMDB API');
      throw new TmdbApiError('Failed to connect to TMDB API');
    }
  }

  async getTrendingMovies(page: number = 1): Promise<TmdbTrendingResponse<TmdbMovieResponse>> {
    return this.request(`/trending/movie/week?language=en-US&page=${page}`);
  }

  async getTrendingSeries(page: number = 1): Promise<TmdbTrendingResponse<TmdbSeriesResponse>> {
    return this.request(`/trending/tv/week?language=en-US&page=${page}`);
  }
}

// Singleton instance
export const tmdbClient = new TmdbClient();
