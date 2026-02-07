// Global TypeScript types for the project

export interface MovieItem {
  id: number;
  title: string;
  originalLanguage: string;
  originCountry?: string[];
}

export interface SeriesItem {
  id: number;
  name: string;
  originalLanguage: string;
  originCountry?: string[];
}

export interface DigestContent {
  movies: MovieItem[];
  series: SeriesItem[];
}

export interface BotSettings {
  enabled: boolean;
  targetChatId?: number;
  targetThreadId?: number;
}

export interface RateLimitKey {
  chatId: number;
  userId: number;
  action: string;
}

// TMDB API Types
export interface TmdbMovieResponse {
  id: number;
  title: string;
  original_language: string;
  origin_country?: string[];
  poster_path?: string;
  overview?: string;
  vote_average?: number;
  release_date?: string;
}

export interface TmdbSeriesResponse {
  id: number;
  name: string;
  original_language: string;
  origin_country?: string[];
  poster_path?: string;
  overview?: string;
  vote_average?: number;
  first_air_date?: string;
}

export interface TmdbTrendingResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}
