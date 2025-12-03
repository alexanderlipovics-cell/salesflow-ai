/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - ACTIVITY TRACKING TYPES & CONSTANTS                      ║
 * ║  Type-Definitionen und Konstanten für Activity Tracking                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mögliche Activity-Typen
 */
export const ACTIVITY_TYPES = {
  NEW_CONTACT: 'new_contact',
  FOLLOWUP: 'followup',
  REACTIVATION: 'reactivation',
  CALL: 'call',
  MESSAGE: 'message',
  MEETING: 'meeting',
  PRESENTATION: 'presentation',
  CLOSE_WON: 'close_won',
  CLOSE_LOST: 'close_lost',
  REFERRAL: 'referral',
};

/**
 * Activity Channels
 */
export const ACTIVITY_CHANNELS = {
  WHATSAPP: 'whatsapp',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TELEGRAM: 'telegram',
  PHONE: 'phone',
  EMAIL: 'email',
  ZOOM: 'zoom',
  IN_PERSON: 'in_person',
  OTHER: 'other',
};

/**
 * Activity Outcomes
 */
export const ACTIVITY_OUTCOMES = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative',
  PENDING: 'pending',
};

/**
 * Status Level für Daily Flow
 */
export const STATUS_LEVELS = {
  AHEAD: 'ahead',
  ON_TRACK: 'on_track',
  SLIGHTLY_BEHIND: 'slightly_behind',
  BEHIND: 'behind',
};

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY TYPE META
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Konfiguration für Activity-Typen
 */
export const ACTIVITY_TYPE_META = {
  new_contact: {
    label: 'Neuer Kontakt',
    emoji: '👋',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    daily_flow_category: 'new_contacts',
  },
  followup: {
    label: 'Follow-up',
    emoji: '📞',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.1)',
    daily_flow_category: 'followups',
  },
  reactivation: {
    label: 'Reaktivierung',
    emoji: '🔄',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    daily_flow_category: 'reactivations',
  },
  call: {
    label: 'Anruf',
    emoji: '📱',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    daily_flow_category: null,
  },
  message: {
    label: 'Nachricht',
    emoji: '💬',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    daily_flow_category: null,
  },
  meeting: {
    label: 'Meeting',
    emoji: '🤝',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.1)',
    daily_flow_category: null,
  },
  presentation: {
    label: 'Präsentation',
    emoji: '📊',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    daily_flow_category: null,
  },
  close_won: {
    label: 'Deal gewonnen',
    emoji: '🎉',
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    daily_flow_category: null,
  },
  close_lost: {
    label: 'Deal verloren',
    emoji: '❌',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    daily_flow_category: null,
  },
  referral: {
    label: 'Empfehlung',
    emoji: '🌟',
    color: '#A855F7',
    bgColor: 'rgba(168, 85, 247, 0.1)',
    daily_flow_category: null,
  },
};

/**
 * Konfiguration für Channels
 */
export const CHANNEL_META = {
  whatsapp: { label: 'WhatsApp', emoji: '💬' },
  instagram: { label: 'Instagram', emoji: '📸' },
  facebook: { label: 'Facebook', emoji: '👤' },
  telegram: { label: 'Telegram', emoji: '✈️' },
  phone: { label: 'Telefon', emoji: '📞' },
  email: { label: 'E-Mail', emoji: '📧' },
  zoom: { label: 'Zoom', emoji: '🎥' },
  in_person: { label: 'Persönlich', emoji: '🤝' },
  other: { label: 'Sonstiges', emoji: '📋' },
};

/**
 * Konfiguration für Status Levels
 */
export const STATUS_LEVEL_META = {
  ahead: {
    label: 'Voraus',
    emoji: '🔥',
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.1)',
  },
  on_track: {
    label: 'Auf Kurs',
    emoji: '✓',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.1)',
  },
  slightly_behind: {
    label: 'Leicht hinten',
    emoji: '⚡',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  behind: {
    label: 'Aufholen nötig',
    emoji: '💪',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gibt die Konfiguration für einen Activity-Typ zurück
 * @param {string} activityType 
 * @returns {Object}
 */
export function getActivityTypeMeta(activityType) {
  return ACTIVITY_TYPE_META[activityType] || ACTIVITY_TYPE_META.new_contact;
}

/**
 * Gibt die Konfiguration für einen Channel zurück
 * @param {string} channel 
 * @returns {Object}
 */
export function getChannelMeta(channel) {
  return CHANNEL_META[channel] || CHANNEL_META.other;
}

/**
 * Gibt die Konfiguration für ein Status Level zurück
 * @param {string} statusLevel 
 * @returns {Object}
 */
export function getStatusLevelMeta(statusLevel) {
  return STATUS_LEVEL_META[statusLevel] || STATUS_LEVEL_META.behind;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY MESSAGE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt eine menschliche Summary-Nachricht basierend auf dem Status
 * @param {Object} status - Daily Flow Status Object
 * @returns {string}
 */
export function buildSummaryMessage(status) {
  if (!status) return '';
  
  const { status_level, daily } = status;
  const nc = daily.new_contacts;
  const fu = daily.followups;
  const re = daily.reactivations;
  
  const fmt = (n) => Math.round(n).toString();
  
  switch (status_level) {
    case 'ahead':
      return `Du liegst heute klar vor deinem Plan – ${fmt(nc.done)}/${fmt(nc.target)} neue Kontakte, ${fmt(fu.done)}/${fmt(fu.target)} Follow-ups und ${fmt(re.done)}/${fmt(re.target)} Reaktivierungen. Stark! 🔥`;
    
    case 'on_track':
      return `Du bist heute auf Kurs – ${fmt(nc.done)}/${fmt(nc.target)} neue Kontakte, ${fmt(fu.done)}/${fmt(fu.target)} Follow-ups und ${fmt(re.done)}/${fmt(re.target)} Reaktivierungen. Weiter so! ✓`;
    
    case 'slightly_behind':
      return `Du bist leicht hinter deinem Tagesziel – bisher ${fmt(nc.done)}/${fmt(nc.target)} neue Kontakte, ${fmt(fu.done)}/${fmt(fu.target)} Follow-ups und ${fmt(re.done)}/${fmt(re.target)} Reaktivierungen. Mit ein, zwei Fokusblocks holst du das noch rein. 💪`;
    
    case 'behind':
      return `Heute ist noch viel Luft nach oben – aktuell ${fmt(nc.done)}/${fmt(nc.target)} neue Kontakte, ${fmt(fu.done)}/${fmt(fu.target)} Follow-ups und ${fmt(re.done)}/${fmt(re.target)} Reaktivierungen. Lass uns jetzt mit den wichtigsten Kontakten starten.`;
    
    default:
      return `${fmt(nc.done)}/${fmt(nc.target)} Kontakte, ${fmt(fu.done)}/${fmt(fu.target)} Follow-ups, ${fmt(re.done)}/${fmt(re.target)} Reaktivierungen`;
  }
}

/**
 * Erstellt eine Tipp-Nachricht basierend auf dem Status
 * @param {Object} status - Daily Flow Status Object
 * @returns {string|null}
 */
export function buildTipMessage(status) {
  if (!status) return null;
  
  const { daily } = status;
  
  const missingContacts = Math.max(0, daily.new_contacts.target - daily.new_contacts.done);
  const missingFollowups = Math.max(0, daily.followups.target - daily.followups.done);
  const missingReactivations = Math.max(0, daily.reactivations.target - daily.reactivations.done);
  
  const total = missingContacts + missingFollowups + missingReactivations;
  
  if (total === 0) {
    return '🎉 Du hast dein Tagesziel erreicht! Gönn dir eine Pause oder leg noch einen drauf.';
  }
  
  if (total <= 3) {
    return `💡 Nur noch ${total} Aktivität${total > 1 ? 'en' : ''} bis zum Tagesziel – du schaffst das!`;
  }
  
  if (missingContacts > missingFollowups && missingContacts > missingReactivations) {
    return `💡 Fokus heute: ${Math.round(missingContacts)} neue Kontakte. Wer könnte heute von deinem Angebot profitieren?`;
  }
  
  if (missingFollowups > 0) {
    return `💡 ${Math.round(missingFollowups)} Follow-ups stehen noch aus. Wer wartet auf deine Antwort?`;
  }
  
  return null;
}

/**
 * Formatiert ein relatives Datum
 * @param {string} dateString - ISO Date String
 * @returns {string}
 */
export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min`;
  if (diffHours < 24) return `vor ${diffHours} Std`;
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

/**
 * Gibt das heutige Datum als YYYY-MM-DD zurück
 * @returns {string}
 */
export function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Berechnet den Wochenstart (Montag) für ein Datum
 * @param {Date} date 
 * @returns {Date}
 */
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // Constants
  ACTIVITY_TYPES,
  ACTIVITY_CHANNELS,
  ACTIVITY_OUTCOMES,
  STATUS_LEVELS,
  ACTIVITY_TYPE_META,
  CHANNEL_META,
  STATUS_LEVEL_META,
  
  // Helpers
  getActivityTypeMeta,
  getChannelMeta,
  getStatusLevelMeta,
  buildSummaryMessage,
  buildTipMessage,
  formatRelativeTime,
  getTodayDateString,
  getWeekStart,
};

