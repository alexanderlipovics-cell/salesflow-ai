/**
 * API Configuration
 * Production-ready configuration for API client
 */

// Check if we're in development
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const API_CONFIG = {
  // Environment switching
  USE_MOCK_API: isDevelopment, // Auto: Mock in dev, Live in production

  // API Base URLs
  LIVE_API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/mobile/',
  MOCK_API_BASE_URL: 'mock://', // Special protocol for mock

  // Timeouts
  TIMEOUT_MS: 10000,
  RETRY_TIMEOUT_MS: 5000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],

  // Caching
  CACHE_TTL_MS: 60000, // 1 minute
  CACHE_MAX_SIZE: 100, // Max cached items

  // Offline queue
  OFFLINE_QUEUE_MAX: 50,
  OFFLINE_RETRY_INTERVAL_MS: 5000,
} as const;

export type ApiConfig = typeof API_CONFIG;

