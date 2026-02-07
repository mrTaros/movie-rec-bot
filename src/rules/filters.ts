import type { TmdbMovieResponse, TmdbSeriesResponse } from '../utils/types.js';

// Список индийских языковых кодов
const INDIAN_LANGUAGES = [
  'hi', // Hindi
  'ta', // Tamil
  'te', // Telugu
  'ml', // Malayalam
  'kn', // Kannada
  'bn', // Bengali
  'mr', // Marathi
  'pa', // Punjabi
  'gu', // Gujarati
  'or', // Odia
  'as', // Assamese
  'ur', // Urdu
  'sa', // Sanskrit
];

/**
 * Проверяет, является ли контент индийским
 * По ТЗ исключаем если:
 * - original_language относится к индийским языкам
 * - origin_country содержит 'IN'
 */
export function isIndianContent(
  item: TmdbMovieResponse | TmdbSeriesResponse
): boolean {
  // Проверка языка
  if (INDIAN_LANGUAGES.includes(item.original_language.toLowerCase())) {
    return true;
  }

  // Проверка страны происхождения
  if (item.origin_country && item.origin_country.includes('IN')) {
    return true;
  }

  return false;
}

/**
 * Фильтрует массив, исключая индийский контент
 */
export function filterIndianContent<T extends TmdbMovieResponse | TmdbSeriesResponse>(
  items: T[]
): T[] {
  return items.filter((item) => !isIndianContent(item));
}
