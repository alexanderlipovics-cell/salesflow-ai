/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  OUTREACH API                                                              ║
 * ║  API Functions für Outreach Messages & Tracking                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export type OutreachStatus = 'sent' | 'seen' | 'replied' | 'ghosted' | 'stale';
export type MessageType = 'intro' | 'follow_up' | 'value' | 'closing' | 'ghost_buster' | 'custom';
export type Platform = 'instagram' | 'whatsapp' | 'linkedin' | 'telegram' | 'email' | 'other';

export interface OutreachMessage {
  id: string;
  contact_name: string;
  contact_handle: string | null;
  contact_profile_url: string | null;
  platform: Platform;
  message_type: MessageType;
  message_preview: string;
  status: OutreachStatus;
  sent_at: string;
  seen_at: string | null;
  replied_at: string | null;
  is_ghost: boolean;
  ghost_since: string | null;
  ghost_followup_count: number;
  notes: string | null;
  lead_id: string | null;
}

export interface OutreachStats {
  total_sent: number;
  total_seen: number;
  total_replied: number;
  total_ghosts: number;
  reply_rate: number;
  ghost_rate: number;
  avg_reply_time_hours: number | null;
}

export interface PendingCheckIn {
  id: string;
  contact_name: string;
  platform: Platform;
  sent_at: string;
  hours_since_sent: number;
  suggested_action: 'wait' | 'follow_up' | 'ghost_buster';
}

export interface OutreachCreateRequest {
  contact_name: string;
  contact_handle?: string;
  contact_profile_url?: string;
  platform: Platform;
  message_type: MessageType;
  message_preview: string;
  lead_id?: string;
  notes?: string;
}

// =============================================================================
// HELPER
// =============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Nicht authentifiziert');
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// =============================================================================
// MESSAGES
// =============================================================================

/**
 * Listet Outreach-Nachrichten.
 */
export async function listMessages(options: {
  status?: OutreachStatus;
  platform?: Platform;
  messageType?: MessageType;
  isGhost?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<{
  messages: OutreachMessage[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (options.status) params.append('status', options.status);
  if (options.platform) params.append('platform', options.platform);
  if (options.messageType) params.append('message_type', options.messageType);
  if (options.isGhost !== undefined) params.append('is_ghost', options.isGhost.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  
  const queryString = params.toString();
  return apiRequest(`/outreach/messages${queryString ? `?${queryString}` : ''}`);
}

/**
 * Erstellt eine Outreach-Nachricht.
 */
export async function createMessage(data: OutreachCreateRequest): Promise<OutreachMessage> {
  return apiRequest<OutreachMessage>('/outreach/messages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Holt eine Outreach-Nachricht.
 */
export async function getMessage(messageId: string): Promise<OutreachMessage> {
  return apiRequest<OutreachMessage>(`/outreach/messages/${messageId}`);
}

/**
 * Updated eine Outreach-Nachricht.
 */
export async function updateMessage(
  messageId: string,
  update: Partial<{
    status: OutreachStatus;
    seen_at: string;
    replied_at: string;
    is_ghost: boolean;
    notes: string;
  }>
): Promise<OutreachMessage> {
  return apiRequest<OutreachMessage>(`/outreach/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
}

// =============================================================================
// STATUS UPDATES
// =============================================================================

/**
 * Markiert als gesehen.
 */
export async function markAsSeen(messageId: string): Promise<OutreachMessage> {
  return apiRequest<OutreachMessage>(`/outreach/messages/${messageId}/seen`, {
    method: 'POST',
  });
}

/**
 * Markiert als beantwortet.
 */
export async function markAsReplied(messageId: string): Promise<OutreachMessage> {
  return apiRequest<OutreachMessage>(`/outreach/messages/${messageId}/replied`, {
    method: 'POST',
  });
}

/**
 * Markiert als Ghost.
 */
export async function markAsGhost(messageId: string): Promise<OutreachMessage> {
  return apiRequest<OutreachMessage>(`/outreach/messages/${messageId}/ghost`, {
    method: 'POST',
  });
}

// =============================================================================
// STATS
// =============================================================================

/**
 * Holt Outreach-Statistiken.
 */
export async function getStats(options: {
  days?: number;
  platform?: Platform;
} = {}): Promise<OutreachStats> {
  const params = new URLSearchParams();
  if (options.days) params.append('days', options.days.toString());
  if (options.platform) params.append('platform', options.platform);
  
  const queryString = params.toString();
  return apiRequest<OutreachStats>(`/outreach/stats${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// PENDING CHECK-INS
// =============================================================================

/**
 * Holt ausstehende Check-ins.
 */
export async function getPendingCheckIns(limit: number = 10): Promise<PendingCheckIn[]> {
  return apiRequest<PendingCheckIn[]>(`/outreach/check-ins?limit=${limit}`);
}

/**
 * Führt Check-in durch.
 */
export async function performCheckIn(
  messageId: string,
  data: {
    status: 'seen' | 'replied' | 'ghost';
    notes?: string;
  }
): Promise<OutreachMessage> {
  return apiRequest<OutreachMessage>(`/outreach/messages/${messageId}/check-in`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Überspringt Check-in.
 */
export async function skipCheckIn(
  messageId: string,
  reason?: string
): Promise<{ success: boolean }> {
  return apiRequest(`/outreach/messages/${messageId}/skip-check-in`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk Status Update.
 */
export async function bulkUpdateStatus(
  messageIds: string[],
  status: OutreachStatus
): Promise<{ updated: number }> {
  return apiRequest('/outreach/messages/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ message_ids: messageIds, status }),
  });
}

// =============================================================================
// NAMED EXPORT
// =============================================================================

export const outreachApi = {
  // Messages
  listMessages,
  createMessage,
  getMessage,
  updateMessage,
  
  // Status Updates
  markAsSeen,
  markAsReplied,
  markAsGhost,
  
  // Stats
  getStats,
  
  // Check-ins
  getPendingCheckIns,
  performCheckIn,
  skipCheckIn,
  
  // Bulk
  bulkUpdateStatus,
};

export default outreachApi;

