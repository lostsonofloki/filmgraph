/**
 * Filmgraph Application Constants
 * Centralized configuration and version management
 */

// Application Version
export const APP_VERSION = '1.12.6';

// Theme Colors
export const THEME_COLORS = {
  accent: 'orange-500',
  bg: 'zinc-950',
  card: 'zinc-900',
};

// Application Info
export const APP_NAME = 'Filmgraph';
export const APP_TAGLINE = 'Your Personal Movie Logging & Visualization Platform';

// API Configuration
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Supabase Configuration
export const SUPABASE_TABLES = {
  PROFILES: 'profiles',
  MOVIE_LOGS: 'movie_logs',
  LISTS: 'lists',
  LIST_ITEMS: 'list_items',
  LIST_MEMBERS: 'list_members',
  BUG_REPORTS: 'bug_reports',
  RECOMMENDATION_FEEDBACK: 'recommendation_feedback',
  ORACLE_PROVIDER_EVENTS: 'oracle_provider_events',
};

// UI Constants
export const MOOD_CATEGORIES = {
  emotional: 'emotional',
  vibe: 'vibe',
  intellectual: 'intellectual',
};

export const WATCH_STATUS = {
  WATCHED: 'watched',
  TO_WATCH: 'to-watch',
};

// Pagination
export const ITEMS_PER_PAGE = 20;
export const TRENDING_ITEMS_PER_PAGE = 40;

// Cache Duration (in milliseconds)
export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 15 * 60 * 1000, // 15 minutes
  LONG: 60 * 60 * 1000, // 1 hour
};
