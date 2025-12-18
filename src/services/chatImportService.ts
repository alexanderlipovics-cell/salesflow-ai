/**
 * Chat Import Service
 * 
 * API Integration für den Chat Import.
 * Verbindet Frontend mit Claude's Chat Parser Backend.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/apiConfig';

// ============================================
// TYPES
// ============================================

export interface ParsedLeadData {
  name: string;
  phone?: string;
  email?: string;
  last_message?: string;
  sentiment: 'hot' | 'warm' | 'neutral' | 'cold' | 'ghost';
  suggested_next_action?: string;
  source_channel: string;
  raw_chat_segment?: string;
}

export interface ChatImportResult {
  parsed_leads: ParsedLeadData[];
  unparsed_text?: string;
  total_leads_found: number;
  total_leads_imported: number;
}

// ============================================
// API FUNCTIONS
// ============================================

export async function importChatPaste(chatText: string): Promise<ChatImportResult> {
  const response = await apiClient.post<ChatImportResult>(
    API_ENDPOINTS.CHAT_IMPORT.PASTE,
    { chat_text: chatText }
  );
  return response.data;
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const chatImportQueryKeys = {
  all: ['chat-import'] as const,
};

export default {
  importChatPaste,
};
