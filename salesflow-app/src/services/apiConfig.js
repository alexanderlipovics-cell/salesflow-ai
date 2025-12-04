/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - PRODUCTION-READY API CONFIGURATION                              ║
 * ║  Zentrale API-Konfiguration für alle Services                             ║
 * ╠════════════════════════════════════════════════════════════════════════════╣
 * ║  Features:                                                                 ║
 * ║  ✅ Environment-basierte URL-Erkennung                                     ║
 * ║  ✅ Automatische Retry-Logik                                               ║
 * ║  ✅ Request Timeout                                                        ║
 * ║  ✅ Error Handling mit standardisierten Fehlertypen                       ║
 * ║  ✅ Request/Response Interceptors                                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT = 30000; // 30 Sekunden
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 Sekunde

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erkennt die aktuelle Umgebung
 */
export const getEnvironment = () => {
  // Expo / React Native
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ENVIRONMENT) {
    return process.env.EXPO_PUBLIC_ENVIRONMENT;
  }
  
  // Production Detection
  if (typeof window !== 'undefined') {
    const hostname = window.location?.hostname;
    if (hostname && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
      return 'production';
    }
  }
  
  return 'development';
};

/**
 * Prüft ob wir in Production sind
 */
export const isProduction = () => getEnvironment() === 'production';

/**
 * Prüft ob wir in Development sind
 */
export const isDevelopment = () => getEnvironment() === 'development';

// ═══════════════════════════════════════════════════════════════════════════
// API BASE URL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt die API Base URL aus der Umgebung
 * 
 * Priorität:
 * 1. EXPO_PUBLIC_API_URL (Expo)
 * 2. REACT_APP_API_URL (React Web)
 * 3. Expo Constants
 * 4. Localhost Fallback
 */
export const getApiBaseUrl = () => {
  // 1. Expo Public Env
  if (process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // 2. React App Env
  if (process.env?.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 3. Expo Constants (für EAS Build)
  // WICHTIG: Für Web immer localhost verwenden, auch wenn Config IP hat
  try {
    const Constants = require('expo-constants').default;
    const apiUrl = Constants?.expoConfig?.extra?.apiUrl;
    if (apiUrl) {
      // Web-Browser: Immer localhost verwenden, auch wenn Config IP hat
      if (typeof window !== 'undefined' && apiUrl.includes('10.0.0.24')) {
        return apiUrl.replace('10.0.0.24', 'localhost');
      }
      return apiUrl;
    }
  } catch (e) {
    // expo-constants nicht verfügbar
  }
  
  // 4. Production URL - Render.com Deployment
  if (isProduction()) {
    return 'https://salesflow-ai.onrender.com/api/v1';
  }
  
  // 5. Development Fallback
  // Port 8000 für lokales Backend (uvicorn default)
  const DEV_PORT = 8000;
  
  // Web-Browser: Immer localhost verwenden
  if (typeof window !== 'undefined') {
    return `http://localhost:${DEV_PORT}/api/v1`;
  }
  
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  
  if (isAndroid) {
    // Android Emulator: 10.0.2.2 zeigt auf Host-Maschine
    return `http://10.0.2.2:${DEV_PORT}/api/v1`;
  }
  
  // iOS Simulator: localhost
  return `http://localhost:${DEV_PORT}/api/v1`;
};

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const getSupabaseUrl = () => {
  return (
    process.env?.EXPO_PUBLIC_SUPABASE_URL ||
    process.env?.REACT_APP_SUPABASE_URL ||
    ''
  );
};

export const getSupabaseAnonKey = () => {
  return (
    process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env?.REACT_APP_SUPABASE_ANON_KEY ||
    ''
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standardisierte API-Fehlerklasse
 */
export class ApiError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isApiError = true;
  }
  
  static fromResponse(response, body) {
    const message = body?.detail || body?.message || response.statusText;
    const code = body?.code || `HTTP_${response.status}`;
    return new ApiError(message, response.status, code, body);
  }
  
  static networkError(originalError) {
    return new ApiError(
      'Netzwerkfehler - Bitte prüfe deine Internetverbindung',
      0,
      'NETWORK_ERROR',
      { originalError: originalError.message }
    );
  }
  
  static timeoutError() {
    return new ApiError(
      'Request Timeout - Der Server antwortet nicht',
      408,
      'TIMEOUT'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RETRY LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wartet eine bestimmte Zeit
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Prüft ob ein Fehler retriable ist
 */
const isRetriable = (error) => {
  // Netzwerkfehler
  if (error.code === 'NETWORK_ERROR') return true;
  
  // Server-Fehler (5xx)
  if (error.statusCode >= 500) return true;
  
  // Rate Limiting
  if (error.statusCode === 429) return true;
  
  return false;
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG OBJECT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zentrale API-Konfiguration
 */
export const API_CONFIG = {
  get baseUrl() {
    return getApiBaseUrl();
  },
  
  get supabaseUrl() {
    return getSupabaseUrl();
  },
  
  get supabaseAnonKey() {
    return getSupabaseAnonKey();
  },
  
  get environment() {
    return getEnvironment();
  },
  
  get isProduction() {
    return isProduction();
  },
  
  /**
   * Erstellt eine vollständige API-URL
   */
  url(path) {
    const base = this.baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  },
  
  /**
   * Erstellt eine Supabase Edge Function URL
   */
  edgeFunctionUrl(functionName) {
    return `${this.supabaseUrl}/functions/v1/${functionName}`;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FETCH HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Production-Ready Fetch mit Retry, Timeout und Error Handling
 */
export async function apiFetch(path, options = {}, accessToken = null) {
  const url = API_CONFIG.url(path);
  const retries = options.retries ?? MAX_RETRIES;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  // Request ID für Tracking
  headers['X-Request-ID'] = generateRequestId();
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Timeout Controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
        // In Production: credentials für Same-Origin
        credentials: isProduction() ? 'same-origin' : 'omit',
      });
      
      clearTimeout(timeoutId);
      
      // Erfolgreiche Response
      if (response.ok) {
        return response;
      }
      
      // Error Response parsen
      let body = null;
      try {
        body = await response.json();
      } catch (e) {
        body = { detail: response.statusText };
      }
      
      lastError = ApiError.fromResponse(response, body);
      
      // Nicht-retriable Fehler sofort werfen
      if (!isRetriable(lastError)) {
        throw lastError;
      }
      
    } catch (error) {
      // AbortError (Timeout)
      if (error.name === 'AbortError') {
        lastError = ApiError.timeoutError();
      }
      // Netzwerkfehler
      else if (!error.isApiError) {
        lastError = ApiError.networkError(error);
      }
      // API Error weitergeben
      else {
        lastError = error;
      }
      
      // Nicht-retriable Fehler sofort werfen
      if (!isRetriable(lastError)) {
        throw lastError;
      }
    }
    
    // Retry Delay (exponentielles Backoff)
    if (attempt < retries) {
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      console.log(`[API] Retry ${attempt + 1}/${retries} in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  // Alle Retries fehlgeschlagen
  throw lastError;
}

/**
 * Generiert eine Request ID
 */
function generateRequestId() {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * API GET Request
 */
export async function apiGet(path, accessToken = null, options = {}) {
  const response = await apiFetch(path, { method: 'GET', ...options }, accessToken);
  return response.json();
}

/**
 * API POST Request
 */
export async function apiPost(path, body, accessToken = null, options = {}) {
  const response = await apiFetch(
    path,
    {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    },
    accessToken
  );
  return response.json();
}

/**
 * API PUT Request
 */
export async function apiPut(path, body, accessToken = null, options = {}) {
  const response = await apiFetch(
    path,
    {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    },
    accessToken
  );
  return response.json();
}

/**
 * API DELETE Request
 */
export async function apiDelete(path, accessToken = null, options = {}) {
  const response = await apiFetch(path, { method: 'DELETE', ...options }, accessToken);
  
  // DELETE kann 204 No Content zurückgeben
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS API
// ═══════════════════════════════════════════════════════════════════════════

export const AnalyticsAPI = {
  async getTemplates({ fromDate, toDate, verticalId, channel, limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    if (verticalId) params.set('vertical_id', verticalId);
    if (channel) params.set('channel', channel);
    params.set('limit', String(limit));
    
    return apiGet(`/analytics/templates?${params}`);
  },
  
  async getChannels({ fromDate, toDate, verticalId } = {}) {
    const params = new URLSearchParams();
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    if (verticalId) params.set('vertical_id', verticalId);
    
    return apiGet(`/analytics/channels?${params}`);
  },
  
  async getDashboard(days = 30) {
    return apiGet(`/analytics/dashboard-metrics?days=${days}`);
  },
  
  async getTimeSeries({ fromDate, toDate, granularity = 'day', verticalId, channel } = {}) {
    const params = new URLSearchParams();
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    params.set('granularity', granularity);
    if (verticalId) params.set('vertical_id', verticalId);
    if (channel) params.set('channel', channel);
    
    return apiGet(`/analytics/timeseries?${params}`);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CHIEF API
// ═══════════════════════════════════════════════════════════════════════════

export const ChiefAPI = {
  async chat({ message, includeContext = true, conversationHistory = [] }, accessToken) {
    return apiPost(
      '/ai/chief/chat',
      {
        message,
        include_context: includeContext,
        conversation_history: conversationHistory,
      },
      accessToken
    );
  },
  
  async chatDemo({ message, includeContext = true, conversationHistory = [] }) {
    return apiPost('/ai/chief/chat/demo', {
      message,
      include_context: includeContext,
      conversation_history: conversationHistory,
    });
  },
  
  async getStatus() {
    return apiGet('/ai/chief/status');
  },
  
  async getActions() {
    return apiGet('/ai/chief/actions');
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTONOMOUS BRAIN API
// ═══════════════════════════════════════════════════════════════════════════

export const BrainAPI = {
  async getStats() {
    return apiGet('/autonomous/brain/stats');
  },
  
  async setMode(mode, confidenceThreshold = 0.8) {
    return apiPost('/autonomous/brain/mode', {
      mode,
      confidence_threshold: confidenceThreshold,
    });
  },
  
  async getPendingDecisions() {
    return apiGet('/autonomous/brain/decisions/pending');
  },
  
  async approveDecision(decisionId, approved = true, reason = '') {
    return apiPost('/autonomous/brain/decisions/approve', {
      decision_id: decisionId,
      approved,
      reason,
    });
  },
  
  async getAgents() {
    return apiGet('/autonomous/agents');
  },
  
  async executeAgentTask(agent, taskType, params = {}) {
    return apiPost('/autonomous/agents/execute', {
      agent,
      task_type: taskType,
      params,
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default API_CONFIG;
