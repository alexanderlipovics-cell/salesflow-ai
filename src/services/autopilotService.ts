/**
 * Autopilot Service - API Calls für Autopilot-Funktionen
 * 
 * Features:
 * - Settings laden/speichern (global & contact-spezifisch)
 * - Message Events erstellen/listen
 * - Event Status updaten
 * - Autopilot Engine triggern
 */

import { API_CONFIG } from '../config/api';

// ============================================================================
// TYPES
// ============================================================================

export type AutopilotMode = 'off' | 'assist' | 'one_click' | 'auto';
export type MessageChannel = 'email' | 'whatsapp' | 'instagram' | 'linkedin' | 'facebook' | 'internal';
export type MessageDirection = 'inbound' | 'outbound';
export type AutopilotStatus = 'pending' | 'suggested' | 'approved' | 'sent' | 'skipped';

export interface AutopilotSettings {
  id: string;
  user_id: string;
  contact_id: string | null;
  mode: AutopilotMode;
  channels: string[];
  max_auto_replies_per_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutopilotSettingsUpdate {
  mode: AutopilotMode;
  channels: string[];
  max_auto_replies_per_day: number;
  is_active: boolean;
  contact_id?: string | null;
}

export interface MessageEvent {
  id: string;
  user_id: string;
  contact_id: string | null;
  channel: MessageChannel;
  direction: MessageDirection;
  text: string;
  normalized_text: string;
  raw_payload: Record<string, any> | null;
  suggested_reply: SuggestedReply | null;
  autopilot_status: AutopilotStatus;
  template_version: string | null;
  persona_variant: string | null;
  created_at: string;
}

export interface SuggestedReply {
  text: string;
  detected_action?: string;
  channel?: string;
  mode_used?: string;
  model?: string;
  template_version?: string;
  persona_variant?: string;
}

export interface MessageEventCreate {
  contact_id?: string;
  channel: MessageChannel;
  direction: MessageDirection;
  text: string;
  raw_payload?: Record<string, any>;
}

export interface AutopilotRunSummary {
  processed: number;
  suggested: number;
  skipped: number;
  errors: number;
  error_details?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Holt Autopilot Settings für den aktuellen User
 */
export async function getAutopilotSettings(
  token: string,
  contactId?: string
): Promise<AutopilotSettings> {
  const params = new URLSearchParams();
  if (contactId) {
    params.append('contact_id', contactId);
  }

  const url = `${API_CONFIG.LIVE_API_BASE_URL}/autopilot/settings${params.toString() ? `?${params.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Fehler beim Laden der Settings' }));
    throw new Error(error.detail || 'Fehler beim Laden der Settings');
  }

  const data = await response.json();
  return data.settings;
}

/**
 * Speichert/Aktualisiert Autopilot Settings
 */
export async function saveAutopilotSettings(
  token: string,
  settings: AutopilotSettingsUpdate
): Promise<AutopilotSettings> {
  const response = await fetch(`${API_CONFIG.LIVE_API_BASE_URL}/autopilot/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Fehler beim Speichern der Settings' }));
    throw new Error(error.detail || 'Fehler beim Speichern der Settings');
  }

  const data = await response.json();
  return data.settings;
}

/**
 * Listet Message Events für den aktuellen User
 */
export async function listMessageEvents(
  token: string,
  filters?: {
    status?: AutopilotStatus;
    contact_id?: string;
    channel?: MessageChannel;
    direction?: MessageDirection;
    limit?: number;
  }
): Promise<MessageEvent[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.contact_id) params.append('contact_id', filters.contact_id);
  if (filters?.channel) params.append('channel', filters.channel);
  if (filters?.direction) params.append('direction', filters.direction);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const url = `${API_CONFIG.LIVE_API_BASE_URL}/autopilot/message-events${params.toString() ? `?${params.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Fehler beim Laden der Events' }));
    throw new Error(error.detail || 'Fehler beim Laden der Events');
  }

  const data = await response.json();
  return data.events || [];
}

/**
 * Erstellt ein neues Message Event
 */
export async function createMessageEvent(
  token: string,
  event: MessageEventCreate
): Promise<MessageEvent> {
  const response = await fetch(`${API_CONFIG.LIVE_API_BASE_URL}/autopilot/message-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Fehler beim Erstellen des Events' }));
    throw new Error(error.detail || 'Fehler beim Erstellen des Events');
  }

  const data = await response.json();
  return data.event;
}

/**
 * Aktualisiert den Status eines Message Events
 */
export async function updateMessageEventStatus(
  token: string,
  eventId: string,
  status: AutopilotStatus
): Promise<MessageEvent> {
  const response = await fetch(`${API_CONFIG.LIVE_API_BASE_URL}/autopilot/message-event/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ autopilot_status: status }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Fehler beim Aktualisieren des Event-Status' }));
    throw new Error(error.detail || 'Fehler beim Aktualisieren des Event-Status');
  }

  const data = await response.json();
  return data.event;
}

/**
 * Triggert die Autopilot Engine einmal
 */
export async function runAutopilotOnce(
  token: string,
  limit: number = 20
): Promise<AutopilotRunSummary> {
  const response = await fetch(`${API_CONFIG.LIVE_API_BASE_URL}/autopilot/run-once?limit=${limit}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Fehler beim Ausführen des Autopiloten' }));
    throw new Error(error.detail || 'Fehler beim Ausführen des Autopiloten');
  }

  const data = await response.json();
  return data.summary;
}

