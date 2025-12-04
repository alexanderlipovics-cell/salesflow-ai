/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALESFLOW AI - API CONFIGURATION                                         ║
 * ║  Zentrale API-Konfiguration für alle Services                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// API BASE URL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erkennt ob wir in Development sind
 */
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : 
              (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

/**
 * API Base URL - automatisch basierend auf Environment
 */
export const API_BASE_URL = isDev
  ? 'http://localhost:8000'
  : 'https://salesflow-ai.onrender.com';

// ═══════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

export const API_ENDPOINTS = {
  health: '/health',
  alerts: '/api/v2/alerts',
  mentor: '/api/v2/mentor',
  contacts: '/api/v2/contacts',
  mlmImport: '/api/v1/mlm-import',
  dmo: '/api/v2/dmo',
  team: '/api/v2/team',
  dailyFlow: '/api/v1/daily-flow',
  analytics: '/api/v1/analytics',
  scripts: '/api/v2/scripts',
  reactivation: '/api/v1/reactivation',
  reviewQueue: '/api/v1/review-queue',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt eine vollständige API-URL
 */
export const getApiUrl = (endpoint: string): string => {
  const base = API_BASE_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
};

/**
 * Erstellt eine URL für einen spezifischen Endpoint
 */
export const getEndpointUrl = (endpoint: keyof typeof API_ENDPOINTS, path: string = ''): string => {
  const baseEndpoint = API_ENDPOINTS[endpoint];
  const fullPath = path ? `${baseEndpoint}${path.startsWith('/') ? path : `/${path}`}` : baseEndpoint;
  return getApiUrl(fullPath);
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  getApiUrl,
  getEndpointUrl,
  isDev,
};

