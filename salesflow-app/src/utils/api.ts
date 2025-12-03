/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  API UTILITIES                                                             ║
 * ║  Zentrale API-Funktionen mit Error Handling, Retry, Caching                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTime?: number; // in ms
}

// =============================================================================
// CACHE
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const apiCache = new Map<string, CacheEntry<any>>();
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 Minuten

function getCacheKey(endpoint: string, options?: RequestOptions): string {
  return `${options?.method || 'GET'}:${endpoint}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache<T>(key: string, data: T, cacheTime: number = DEFAULT_CACHE_TIME): void {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + cacheTime,
  });
}

export function clearCache(pattern?: string): void {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export function parseApiError(error: any, status?: number): ApiError {
  // Network Error
  if (error instanceof TypeError && error.message.includes('Network')) {
    return {
      message: 'Keine Internetverbindung. Bitte prüfe deine Verbindung.',
      code: 'NETWORK_ERROR',
      status: 0,
    };
  }
  
  // Timeout
  if (error.name === 'AbortError') {
    return {
      message: 'Anfrage hat zu lange gedauert. Bitte versuche es erneut.',
      code: 'TIMEOUT',
      status: 408,
    };
  }
  
  // API Error Response
  if (typeof error === 'object' && error !== null) {
    return {
      message: error.message || error.detail || 'Ein Fehler ist aufgetreten.',
      code: error.code || 'API_ERROR',
      status: status || error.status,
      details: error.details,
    };
  }
  
  // String Error
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'UNKNOWN',
    };
  }
  
  // Unknown Error
  return {
    message: 'Ein unbekannter Fehler ist aufgetreten.',
    code: 'UNKNOWN',
  };
}

export function getErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'Ungültige Anfrage. Bitte prüfe deine Eingaben.';
    case 401: return 'Nicht autorisiert. Bitte melde dich erneut an.';
    case 403: return 'Zugriff verweigert. Du hast keine Berechtigung.';
    case 404: return 'Nicht gefunden.';
    case 409: return 'Konflikt. Die Daten wurden bereits geändert.';
    case 422: return 'Validierungsfehler. Bitte prüfe deine Eingaben.';
    case 429: return 'Zu viele Anfragen. Bitte warte einen Moment.';
    case 500: return 'Serverfehler. Bitte versuche es später erneut.';
    case 502: return 'Server nicht erreichbar. Bitte versuche es später.';
    case 503: return 'Service vorübergehend nicht verfügbar.';
    default: return 'Ein Fehler ist aufgetreten.';
  }
}

// =============================================================================
// MAIN API FUNCTION
// =============================================================================

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = 30000,
    retries = 2,
    cache = method === 'GET',
    cacheTime = DEFAULT_CACHE_TIME,
  } = options;
  
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_CONFIG.baseUrl}${endpoint}`;
  
  const cacheKey = getCacheKey(endpoint, options);
  
  // Check Cache (nur für GET)
  if (cache && method === 'GET') {
    const cached = getFromCache<T>(cacheKey);
    if (cached) {
      return { data: cached, error: null, status: 200 };
    }
  }
  
  // Request mit Retry-Logic
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Parse Response
      let data: T | null = null;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      }
      
      // Success
      if (response.ok) {
        // Cache speichern
        if (cache && method === 'GET' && data) {
          setCache(cacheKey, data, cacheTime);
        }
        
        return { data, error: null, status: response.status };
      }
      
      // Error Response
      return {
        data: null,
        error: parseApiError(data, response.status),
        status: response.status,
      };
      
    } catch (error) {
      lastError = error;
      
      // Bei Netzwerk-Fehlern retry versuchen
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }
  
  // Alle Retries fehlgeschlagen
  return {
    data: null,
    error: parseApiError(lastError),
    status: 0,
  };
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
    
  put: <T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),
    
  patch: <T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),
    
  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;

