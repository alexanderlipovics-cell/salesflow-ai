/**
 * Outreach Service - API für Social Media Akquise Tracking
 * 
 * Tracking von Nachrichten auf Instagram, Facebook, LinkedIn, WhatsApp
 * Erkennung von "Ghosts" (gelesen aber keine Antwort)
 * Automatische Follow-up Vorschläge
 */

import { API_CONFIG } from './apiConfig';

const getApiUrl = () => `${API_CONFIG.baseUrl}/outreach`;

/**
 * Hole Auth-Header für API Calls
 */
const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
});

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Quick-Log: Neue Outreach-Nachricht erfassen
 * @param {Object} data - { contact_name, platform, message_type?, ... }
 * @param {string} token - Auth Token
 */
export async function createOutreach(data, token) {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data)
  });
  
  if (!response.ok) throw new Error('Outreach konnte nicht erstellt werden');
  return response.json();
}

/**
 * Liste aller Outreach-Nachrichten
 * @param {Object} filters - { platform?, status?, is_ghost?, limit?, offset? }
 * @param {string} token
 */
export async function getOutreachList(filters = {}, token) {
  const params = new URLSearchParams();
  if (filters.platform) params.append('platform', filters.platform);
  if (filters.status) params.append('status', filters.status);
  if (filters.is_ghost !== undefined) params.append('is_ghost', filters.is_ghost);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const response = await fetch(`${getApiUrl()}?${params}`, {
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Outreach-Liste konnte nicht geladen werden');
  return response.json();
}

/**
 * Einzelnen Outreach abrufen
 */
export async function getOutreach(outreachId, token) {
  const response = await fetch(`${getApiUrl()}/${outreachId}`, {
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Outreach nicht gefunden');
  return response.json();
}

// =============================================================================
// Status Updates
// =============================================================================

/**
 * Status aktualisieren
 * @param {string} outreachId
 * @param {string} status - sent|delivered|seen|replied|positive|negative|converted|blocked
 * @param {string} token
 */
export async function updateStatus(outreachId, status, token) {
  const response = await fetch(`${getApiUrl()}/${outreachId}/status`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ status })
  });
  
  if (!response.ok) throw new Error('Status konnte nicht aktualisiert werden');
  return response.json();
}

/**
 * Quick-Action: Als "Gelesen" markieren
 * WICHTIG: Startet den Ghost-Timer!
 */
export async function markAsSeen(outreachId, token) {
  const response = await fetch(`${getApiUrl()}/${outreachId}/seen`, {
    method: 'POST',
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Konnte nicht als gelesen markiert werden');
  return response.json();
}

/**
 * Quick-Action: Antwort erhalten
 * @param {string} outreachId
 * @param {boolean|null} isPositive - true=Interesse, false=Absage, null=Neutral
 * @param {string} token
 */
export async function markAsReplied(outreachId, isPositive = null, token) {
  const params = isPositive !== null ? `?is_positive=${isPositive}` : '';
  
  const response = await fetch(`${getApiUrl()}/${outreachId}/replied${params}`, {
    method: 'POST',
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Konnte nicht als beantwortet markiert werden');
  return response.json();
}

// =============================================================================
// Ghost & Follow-up Management
// =============================================================================

/**
 * Alle Ghost-Kontakte abrufen
 * (Nachrichten die gelesen aber nicht beantwortet wurden)
 */
export async function getGhosts(filters = {}, token) {
  const params = new URLSearchParams();
  if (filters.platform) params.append('platform', filters.platform);
  if (filters.min_ghost_hours) params.append('min_ghost_hours', filters.min_ghost_hours);
  
  const response = await fetch(`${getApiUrl()}/ghosts/list?${params}`, {
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Ghosts konnten nicht geladen werden');
  return response.json();
}

/**
 * Ghost-Zusammenfassung für Dashboard
 */
export async function getGhostSummary(token) {
  const response = await fetch(`${getApiUrl()}/ghosts/summary`, {
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Ghost-Summary konnte nicht geladen werden');
  return response.json();
}

/**
 * Anstehende Follow-ups aus der Queue
 */
export async function getFollowupQueue(limit = 20, token) {
  const response = await fetch(`${getApiUrl()}/followups/queue?limit=${limit}`, {
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Follow-up Queue konnte nicht geladen werden');
  return response.json();
}

/**
 * Follow-up Aktion ausführen
 * @param {string} queueId
 * @param {string} action - send|skip|snooze
 * @param {Object} options - { skip_reason?, snooze_hours? }
 * @param {string} token
 */
export async function processFollowup(queueId, action, options = {}, token) {
  const response = await fetch(`${getApiUrl()}/followups/${queueId}/action`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      action,
      skip_reason: options.skip_reason,
      snooze_hours: options.snooze_hours
    })
  });
  
  if (!response.ok) throw new Error('Follow-up Aktion fehlgeschlagen');
  return response.json();
}

/**
 * Follow-up Nachricht generieren lassen
 */
export async function generateFollowupMessage(outreachId, customContext = null, token) {
  const response = await fetch(`${getApiUrl()}/followups/generate`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      outreach_id: outreachId,
      custom_context: customContext
    })
  });
  
  if (!response.ok) throw new Error('Follow-up konnte nicht generiert werden');
  return response.json();
}

/**
 * Mehrere Follow-ups auf einmal generieren
 */
export async function bulkGenerateFollowups(platform = null, limit = 10, token) {
  const params = new URLSearchParams();
  if (platform) params.append('platform', platform);
  params.append('limit', limit);
  
  const response = await fetch(`${getApiUrl()}/followups/bulk-generate?${params}`, {
    method: 'POST',
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Bulk-Generate fehlgeschlagen');
  return response.json();
}

// =============================================================================
// Templates
// =============================================================================

/**
 * Verfügbare Nachrichtenvorlagen abrufen
 */
export async function getTemplates(filters = {}, token) {
  const params = new URLSearchParams();
  if (filters.platform) params.append('platform', filters.platform);
  if (filters.message_type) params.append('message_type', filters.message_type);
  
  const response = await fetch(`${getApiUrl()}/templates?${params}`, {
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Templates konnten nicht geladen werden');
  return response.json();
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Outreach-Statistiken abrufen
 * @param {number} days - Zeitraum in Tagen (default: 7)
 */
export async function getStats(days = 7, token) {
  const response = await fetch(`${getApiUrl()}/stats?days=${days}`, {
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Stats konnten nicht geladen werden');
  return response.json();
}

/**
 * Statistiken nach Plattform
 */
export async function getPlatformStats(days = 30, token) {
  const response = await fetch(`${getApiUrl()}/stats/platforms?days=${days}`, {
    headers: getHeaders(token)
  });
  
  if (!response.ok) throw new Error('Platform-Stats konnten nicht geladen werden');
  return response.json();
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Plattform-Konfiguration
 */
export const PLATFORMS = {
  instagram: { 
    label: 'Instagram', 
    icon: '📸', 
    color: '#E1306C',
    ghostThreshold: 24 
  },
  facebook: { 
    label: 'Facebook', 
    icon: '👤', 
    color: '#1877F2',
    ghostThreshold: 24 
  },
  linkedin: { 
    label: 'LinkedIn', 
    icon: '💼', 
    color: '#0A66C2',
    ghostThreshold: 48 
  },
  whatsapp: { 
    label: 'WhatsApp', 
    icon: '💬', 
    color: '#25D366',
    ghostThreshold: 12 
  },
  telegram: { 
    label: 'Telegram', 
    icon: '✈️', 
    color: '#0088CC',
    ghostThreshold: 12 
  },
  tiktok: { 
    label: 'TikTok', 
    icon: '🎵', 
    color: '#000000',
    ghostThreshold: 24 
  },
  email: { 
    label: 'E-Mail', 
    icon: '📧', 
    color: '#EA4335',
    ghostThreshold: 48 
  },
  other: { 
    label: 'Sonstige', 
    icon: '💭', 
    color: '#6B7280',
    ghostThreshold: 24 
  }
};

/**
 * Message Types
 */
export const MESSAGE_TYPES = {
  cold_dm: { label: 'Kalt-Akquise', description: 'Erstkontakt ohne vorherige Interaktion' },
  warm_intro: { label: 'Warm Intro', description: 'Nach Like/Kommentar/Interaktion' },
  story_reply: { label: 'Story-Reaktion', description: 'Reaktion auf Story' },
  content_share: { label: 'Content geteilt', description: 'Interessanten Content geteilt' },
  follow_up_1: { label: '1. Follow-up', description: 'Erstes Nachfassen' },
  follow_up_2: { label: '2. Follow-up', description: 'Zweites Nachfassen' },
  follow_up_3: { label: '3. Follow-up', description: 'Letztes Nachfassen' },
  reactivation: { label: 'Reaktivierung', description: 'Nach längerer Pause' },
  value_drop: { label: 'Mehrwert', description: 'Wertvoller Inhalt ohne direkte Frage' }
};

/**
 * Status-Konfiguration
 */
export const STATUSES = {
  sent: { label: 'Gesendet', icon: '📤', color: '#6B7280' },
  delivered: { label: 'Zugestellt', icon: '✓', color: '#3B82F6' },
  seen: { label: 'Gelesen', icon: '👁️', color: '#F59E0B' },
  replied: { label: 'Geantwortet', icon: '💬', color: '#10B981' },
  positive: { label: 'Interesse', icon: '✅', color: '#22C55E' },
  negative: { label: 'Absage', icon: '❌', color: '#EF4444' },
  no_response: { label: 'Keine Antwort', icon: '👻', color: '#F97316' },
  converted: { label: 'Konvertiert', icon: '🎉', color: '#8B5CF6' },
  blocked: { label: 'Blockiert', icon: '🚫', color: '#DC2626' }
};

/**
 * Format Ghost-Hours für Anzeige
 */
export function formatGhostTime(hours) {
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  } else if (hours < 168) {
    return `${Math.round(hours / 24)}d`;
  } else {
    return `${Math.round(hours / 168)}w`;
  }
}

