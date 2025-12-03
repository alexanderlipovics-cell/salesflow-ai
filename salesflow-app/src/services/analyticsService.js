/**
 * Analytics Service
 * ==================
 * API-Calls für Template- und Channel-Analytics
 * Teil des Learning Systems - Performance-Tracking für Vorlagen
 */

import { API_CONFIG } from './apiConfig';

// API Base URL aus zentraler Config
const getApiBase = () => API_CONFIG.baseUrl;

// =============================================================================
// TEMPLATE ANALYTICS
// =============================================================================

/**
 * Holt Template-Performance-Daten
 * @param {Object} params - Filter-Parameter
 * @param {string} params.fromDate - Start-Datum (YYYY-MM-DD)
 * @param {string} params.toDate - End-Datum (YYYY-MM-DD)
 * @param {string} params.verticalId - Optional: Vertical-Filter
 * @param {string} params.channel - Optional: Kanal-Filter
 * @param {number} params.limit - Max. Anzahl Ergebnisse (default: 50)
 * @returns {Promise<TemplateAnalyticsResponse>}
 */
export async function fetchTemplateAnalytics({
  fromDate,
  toDate,
  verticalId,
  channel,
  limit = 50,
} = {}) {
  const params = new URLSearchParams();
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  if (verticalId) params.set('vertical_id', verticalId);
  if (channel) params.set('channel', channel);
  params.set('limit', String(limit));

  const response = await fetch(`${getApiBase()}/analytics/templates?${params}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// CHANNEL ANALYTICS
// =============================================================================

/**
 * Holt Kanal-Performance-Daten (aggregiert über alle Templates)
 * @param {Object} params - Filter-Parameter
 * @param {string} params.fromDate - Start-Datum (YYYY-MM-DD)
 * @param {string} params.toDate - End-Datum (YYYY-MM-DD)
 * @param {string} params.verticalId - Optional: Vertical-Filter
 * @returns {Promise<ChannelAnalyticsResponse>}
 */
export async function fetchChannelAnalytics({
  fromDate,
  toDate,
  verticalId,
} = {}) {
  const params = new URLSearchParams();
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  if (verticalId) params.set('vertical_id', verticalId);

  const response = await fetch(`${getApiBase()}/analytics/channels?${params}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// SINGLE TEMPLATE ANALYTICS
// =============================================================================

/**
 * Holt Detail-Analytics für ein einzelnes Template
 * @param {string} templateId - Template-ID
 * @param {Object} params - Filter-Parameter
 * @returns {Promise<TemplateDetailResponse>}
 */
export async function fetchTemplateDetail(templateId, {
  fromDate,
  toDate,
} = {}) {
  const params = new URLSearchParams();
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);

  const response = await fetch(
    `${getApiBase()}/analytics/templates/${templateId}?${params}`,
    {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// TIME-SERIES ANALYTICS
// =============================================================================

/**
 * Holt Zeitreihen-Daten für Template-Performance
 * @param {Object} params - Filter-Parameter
 * @param {string} params.fromDate - Start-Datum
 * @param {string} params.toDate - End-Datum
 * @param {string} params.groupBy - Gruppierung: 'day' | 'week' | 'month'
 * @param {string} params.templateId - Optional: Spezifisches Template
 * @param {string} params.channel - Optional: Spezifischer Kanal
 * @returns {Promise<TimeSeriesResponse>}
 */
export async function fetchTimeSeriesAnalytics({
  fromDate,
  toDate,
  groupBy = 'day',
  templateId,
  channel,
} = {}) {
  const params = new URLSearchParams();
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  params.set('group_by', groupBy);
  if (templateId) params.set('template_id', templateId);
  if (channel) params.set('channel', channel);

  const response = await fetch(`${getApiBase()}/analytics/timeseries?${params}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// DEMO DATA GENERATORS (für Entwicklung)
// =============================================================================

/**
 * Generiert Demo-Daten für Template-Analytics
 */
export function generateDemoTemplateData() {
  const templates = [
    { name: 'Erstkontakt Warm', channel: 'instagram_dm', sent: 145, replied: 52, won: 8 },
    { name: 'Follow-up Tag 3', channel: 'whatsapp', sent: 98, replied: 41, won: 12 },
    { name: 'Interesse wecken', channel: 'facebook_dm', sent: 67, replied: 28, won: 5 },
    { name: 'Einladung Call', channel: 'linkedin_dm', sent: 54, replied: 22, won: 7 },
    { name: 'Newsletter Opener', channel: 'email', sent: 234, replied: 45, won: 9 },
    { name: 'Story Reaktion', channel: 'instagram_dm', sent: 89, replied: 38, won: 6 },
    { name: 'Reactivation', channel: 'whatsapp', sent: 45, replied: 18, won: 3 },
  ];

  const totalSent = templates.reduce((sum, t) => sum + t.sent, 0);
  const totalReplied = templates.reduce((sum, t) => sum + t.replied, 0);
  const totalWon = templates.reduce((sum, t) => sum + t.won, 0);

  return {
    from_date: getDateDaysAgo(30),
    to_date: getToday(),
    vertical_id: null,
    channel: null,
    total_sent: totalSent,
    total_replied: totalReplied,
    total_deals: totalWon,
    overall_reply_rate: totalReplied / totalSent,
    overall_win_rate: totalWon / totalSent,
    results: templates.map((t, i) => ({
      template_id: `template_${i + 1}`,
      template_name: t.name,
      channel: t.channel,
      vertical_id: 'network_marketing',
      events_suggested: Math.round(t.sent * 1.3),
      events_sent: t.sent,
      events_replied: t.replied,
      events_positive_reply: Math.round(t.replied * 0.7),
      events_negative_reply: Math.round(t.replied * 0.2),
      events_no_reply: t.sent - t.replied,
      events_deal_won: t.won,
      events_deal_lost: Math.round(t.won * 0.3),
      reply_rate: t.replied / t.sent,
      positive_reply_rate: (t.replied * 0.7) / t.sent,
      win_rate: t.won / t.sent,
      has_enough_data: t.sent >= 20,
      confidence: t.sent >= 50 ? 'high' : t.sent >= 20 ? 'medium' : 'low',
    })),
  };
}

/**
 * Generiert Demo-Daten für Channel-Analytics
 */
export function generateDemoChannelData() {
  return {
    from_date: getDateDaysAgo(30),
    to_date: getToday(),
    vertical_id: null,
    results: [
      {
        channel: 'instagram_dm',
        events_sent: 234,
        events_replied: 98,
        events_positive_reply: 68,
        events_deal_won: 14,
        reply_rate: 0.42,
        positive_reply_rate: 0.29,
        win_rate: 0.06,
      },
      {
        channel: 'whatsapp',
        events_sent: 143,
        events_replied: 59,
        events_positive_reply: 45,
        events_deal_won: 15,
        reply_rate: 0.41,
        positive_reply_rate: 0.31,
        win_rate: 0.105,
      },
      {
        channel: 'facebook_dm',
        events_sent: 67,
        events_replied: 28,
        events_positive_reply: 18,
        events_deal_won: 5,
        reply_rate: 0.42,
        positive_reply_rate: 0.27,
        win_rate: 0.075,
      },
      {
        channel: 'linkedin_dm',
        events_sent: 54,
        events_replied: 22,
        events_positive_reply: 17,
        events_deal_won: 7,
        reply_rate: 0.41,
        positive_reply_rate: 0.31,
        win_rate: 0.13,
      },
      {
        channel: 'email',
        events_sent: 234,
        events_replied: 45,
        events_positive_reply: 32,
        events_deal_won: 9,
        reply_rate: 0.19,
        positive_reply_rate: 0.14,
        win_rate: 0.038,
      },
    ],
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Formatiert eine Rate als Prozent-String
 * @param {number|null} rate - Rate zwischen 0 und 1
 * @param {number} decimals - Anzahl Dezimalstellen
 * @returns {string}
 */
export function formatRate(rate, decimals = 1) {
  if (rate == null) return '-';
  return `${(rate * 100).toFixed(decimals)}%`;
}

/**
 * Gibt einen Konfidenz-Farbcode zurück
 * @param {string} confidence - 'high' | 'medium' | 'low'
 * @returns {string} - Hex-Farbe
 */
export function getConfidenceColor(confidence) {
  const colors = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#94a3b8',
  };
  return colors[confidence] || colors.low;
}

/**
 * Prüft ob genug Daten für reliable Stats vorhanden sind
 * @param {number} eventCount - Anzahl Events
 * @param {number} minThreshold - Minimum (default: 20)
 * @returns {boolean}
 */
export function hasEnoughData(eventCount, minThreshold = 20) {
  return eventCount >= minThreshold;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  fetchTemplateAnalytics,
  fetchChannelAnalytics,
  fetchTemplateDetail,
  fetchTimeSeriesAnalytics,
  generateDemoTemplateData,
  generateDemoChannelData,
  formatRate,
  getConfidenceColor,
  hasEnoughData,
};

