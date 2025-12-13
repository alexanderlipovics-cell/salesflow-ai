/**
 * API Configuration - Zentrale Endpunkt-Definitionen
 * 
 * Verbindet Frontend mit Backend API
 */

// Base URL aus Environment oder Fallback
// Production: https://salesflow-ai.onrender.com/api
// Development: http://localhost:8000/api
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")}/api`
  : (import.meta.env.PROD ? 'https://salesflow-ai.onrender.com/api' : 'http://localhost:8000/api');

console.log('apiConfig: API Base URL configured:', API_BASE_URL);

// API Endpoints nach Feature gruppiert
export const API_ENDPOINTS = {
  // ============================================
  // FOLLOW-UP ENGINE (GPT-5.1)
  // ============================================
  FOLLOWUPS: {
    TODAY: '/api/follow-ups/today',
    GET: (leadId: string) => `/api/follow-ups/${leadId}`,
    GENERATE: (leadId: string) => `/api/follow-ups/${leadId}/generate`,
    SNOOZE: (leadId: string) => `/api/follow-ups/${leadId}/snooze`,
    BATCH_GENERATE: '/api/follow-ups/batch/generate',
    DEBUG_INFO: '/api/follow-ups/debug/info',
    DEBUG_LEADS: '/api/follow-ups/debug/leads',
    PENDING: '/api/followups/pending',
    ALL: '/api/followups/all',
    SUGGESTION_ACTION: (id: string) => `/api/followups/suggestions/${id}/action`,
    STATS: '/api/followups/stats',
  },

  // ============================================
  // TEAM TEMPLATES (GPT-5.1)
  // ============================================
  TEAM_TEMPLATES: {
    LIST: '/team-templates',
    CREATE: '/team-templates',
    GET: (id: string) => `/team-templates/${id}`,
    UPDATE: (id: string) => `/team-templates/${id}`,
    CLONE: (id: string) => `/team-templates/${id}/clone`,
    SHARE: (id: string) => `/team-templates/${id}/share`,
    SYNC_STATUS: (id: string) => `/team-templates/${id}/sync-status`,
    SYNC: (id: string) => `/team-templates/${id}/sync`,
  },

  // ============================================
  // LEAD HUNTER (Claude)
  // ============================================
  LEAD_HUNTER: {
    DAILY: '/lead-hunter/daily',
    HUNT: '/lead-hunter/hunt',
    LOOKALIKES: '/lead-hunter/lookalikes',
    REACTIVATION: '/lead-hunter/reactivation',
    QUOTA: '/lead-hunter/quota',
    CONVERT: '/lead-hunter/convert',
    HASHTAGS: '/lead-hunter/hashtags',
    SIGNALS: '/lead-hunter/signals',
  },

  // ============================================
  // SCREENSHOT IMPORT (Gemini)
  // ============================================
  SCREENSHOT: {
    ANALYZE: '/screenshot/analyze',
    IMPORT: '/screenshot/import',
    PLATFORMS: '/screenshot/supported-platforms',
    TIPS: '/screenshot/tips',
  },

  // ============================================
  // CHAT IMPORT (Claude)
  // ============================================
  CHAT_IMPORT: {
    PASTE: '/import/chat-paste',
  },

  // ============================================
  // LEADS & CRM
  // ============================================
  LEADS: {
    LIST: '/leads',
    GET: (id: string) => `/leads/${id}`,
    CREATE: '/leads',
    UPDATE: (id: string) => `/leads/${id}`,
    DELETE: (id: string) => `/leads/${id}`,
  },

  // ============================================
  // AUTH
  // ============================================
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },

  // ============================================
  // AI SERVICES
  // ============================================
  AI: {
    CHAT: '/ai/chat',
    GENERATE_MESSAGE: '/ai/generate-message',
    OBJECTION_HANDLER: '/ai/objection-handler',
  },
} as const;

// Export für einfachen Import
export default {
  API_BASE_URL,
  API_ENDPOINTS,
};

