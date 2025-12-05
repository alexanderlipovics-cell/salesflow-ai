/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALESFLOW MOBILE - API HELPER SERVICE                                     ║
 * ║  Zentrale API-Funktionen für Chat und Backend-Kommunikation               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_BASE_URL } from '../src/config/api';

// ═══════════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const BACKEND_API_URL = 'https://salesflow-ai.onrender.com';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
  company_id?: string;
  user_id?: string;
  include_context?: boolean;
}

export interface ChatResponse {
  reply?: string;
  response?: string;
  message?: string;
  context_used?: boolean;
  tokens_used?: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sendet eine Chat-Nachricht an das Backend
 */
export const sendChatMessage = async (
  request: ChatRequest,
  authToken?: string
): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/v2/mentor/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: JSON.stringify({
        message: request.message,
        conversation_history: request.conversation_history || [],
        company_id: request.company_id,
        include_context: request.include_context ?? true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chat API Fehler:', response.status, errorText);
      throw new Error(`API Fehler: ${response.status} - ${errorText}`);
    }

    const data: ChatResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Fehler beim Senden der Chat-Nachricht:', error);
    throw error;
  }
};

/**
 * Prüft die Backend-Verbindung
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Backend Health Check fehlgeschlagen:', error);
    return false;
  }
};

/**
 * Holt Scripts aus Supabase (wird in ScriptsScreen verwendet)
 */
export const fetchScriptsFromSupabase = async (
  companyId?: string,
  category?: string
) => {
  try {
    const { supabase } = await import('./supabase');
    
    let query = supabase
      .from('mlm_scripts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase Fehler beim Laden der Scripts:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Fehler beim Laden der Scripts:', error);
    throw error;
  }
};

/**
 * Sucht Einwand-Antworten in Supabase
 */
export const searchObjectionResponses = async (
  searchTerm: string,
  companyId?: string
) => {
  try {
    const { supabase } = await import('./supabase');
    
    let query = supabase
      .from('objection_responses')
      .select('*')
      .eq('is_active', true)
      .or(`response_short.ilike.%${searchTerm}%,response_full.ilike.%${searchTerm}%,objection_type.ilike.%${searchTerm}%`)
      .limit(10);

    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase Fehler beim Suchen von Einwand-Antworten:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Fehler beim Suchen von Einwand-Antworten:', error);
    throw error;
  }
};

export default {
  sendChatMessage,
  checkBackendHealth,
  fetchScriptsFromSupabase,
  searchObjectionResponses,
  BACKEND_API_URL,
};

