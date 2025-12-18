/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - SUCCESS PATTERNS SERVICE                                        ║
 * ║  Analysiert Team-Performance und identifiziert Top-Performer               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════════════════════
// UUID VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Prüft ob ein String eine gültige UUID ist
 * @param {string} value - Der zu prüfende String
 * @returns {boolean} true wenn gültige UUID
 */
export function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Success Pattern Types
 * @typedef {'elite_performer' | 'script_master' | 'closing_expert' | 'timing_champion' | 'solid_performer'} SuccessPatternType
 */

/**
 * Mentor Areas
 * @typedef {'script_optimization' | 'closing_techniques' | 'time_management'} MentorArea
 */

/**
 * Success Pattern Object
 * @typedef {Object} SuccessPattern
 * @property {string} user_id - UUID des Users
 * @property {string} email - E-Mail-Adresse
 * @property {string} full_name - Vollständiger Name
 * @property {number} leads_created - Anzahl erstellter Leads (30 Tage)
 * @property {number} first_messages - Anzahl gesendeter Erstnachrichten
 * @property {number} replies - Anzahl erhaltener Antworten
 * @property {number} signups - Anzahl Abschlüsse
 * @property {number} reply_rate_percent - Reply-Rate in Prozent
 * @property {number} conversion_rate_percent - Conversion-Rate in Prozent
 * @property {number} overdue_count - Anzahl überfälliger Tasks
 * @property {number|null} avg_completion_hours - Durchschnittliche Task-Completion in Stunden
 * @property {SuccessPatternType} success_pattern - Erkanntes Erfolgsmuster
 * @property {number} success_score - Erfolgs-Score (0-100)
 * @property {string[]} strengths - Stärken des Users
 * @property {MentorArea[]} can_mentor_in - Bereiche für Mentoring
 * @property {Object} recommendations - Empfehlungen
 */

/**
 * Pattern Summary für Dashboard
 * @typedef {Object} PatternSummary
 * @property {number} total_performers - Gesamtzahl Performer
 * @property {number} elite_performers - Anzahl Elite-Performer
 * @property {number} script_masters - Anzahl Script-Master
 * @property {number} closing_experts - Anzahl Closing-Experten
 * @property {number} timing_champions - Anzahl Timing-Champions
 * @property {number} solid_performers - Anzahl solider Performer
 * @property {number} avg_team_score - Durchschnittlicher Team-Score
 * @property {Object} top_performer - Top-Performer Details
 * @property {Object} available_mentors - Verfügbare Mentoren nach Bereich
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt alle Success Patterns für einen Workspace
 * @param {string} workspaceId - UUID des Workspaces
 * @returns {Promise<SuccessPattern[]>} Array von Success Patterns
 */
export async function getSuccessPatterns(workspaceId) {
  // Validiere UUID bevor API-Aufruf
  if (!isValidUUID(workspaceId)) {
    console.warn('⚠️ getSuccessPatterns: Ungültige Workspace-ID:', workspaceId);
    return []; // Leeres Array statt Fehler
  }

  const { data, error } = await supabase.rpc('get_squad_success_patterns', {
    p_workspace_id: workspaceId
  });

  if (error) {
    console.error('❌ Fehler beim Laden der Success Patterns:', error);
    throw error;
  }

  return data || [];
}

/**
 * Holt Top-Mentoren für einen bestimmten Bereich
 * @param {string} workspaceId - UUID des Workspaces
 * @param {MentorArea} [mentorArea] - Optional: Spezifischer Mentor-Bereich
 * @param {number} [limit=5] - Maximale Anzahl Ergebnisse
 * @returns {Promise<SuccessPattern[]>} Array von Mentor-Profilen
 */
export async function getTopMentors(workspaceId, mentorArea = null, limit = 5) {
  // Validiere UUID bevor API-Aufruf
  if (!isValidUUID(workspaceId)) {
    console.warn('⚠️ getTopMentors: Ungültige Workspace-ID:', workspaceId);
    return []; // Leeres Array statt Fehler
  }

  const { data, error } = await supabase.rpc('get_top_mentors', {
    p_workspace_id: workspaceId,
    p_mentor_area: mentorArea,
    p_limit: limit
  });

  if (error) {
    console.error('❌ Fehler beim Laden der Mentoren:', error);
    throw error;
  }

  return data || [];
}

/**
 * Holt die Pattern-Summary für das Dashboard
 * @param {string} workspaceId - UUID des Workspaces
 * @returns {Promise<PatternSummary>} Dashboard-Summary
 */
export async function getPatternSummary(workspaceId) {
  // Validiere UUID bevor API-Aufruf
  if (!isValidUUID(workspaceId)) {
    console.warn('⚠️ getPatternSummary: Ungültige Workspace-ID:', workspaceId);
    return null; // null statt Fehler
  }

  const { data, error } = await supabase.rpc('get_pattern_summary', {
    p_workspace_id: workspaceId
  });

  if (error) {
    console.error('❌ Fehler beim Laden der Pattern-Summary:', error);
    throw error;
  }

  return data || {};
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gibt das deutsche Label für einen Pattern-Typ zurück
 * @param {SuccessPatternType} pattern - Pattern-Typ
 * @returns {string} Deutsches Label
 */
export function getPatternLabel(pattern) {
  const labels = {
    elite_performer: '🏆 Elite-Performer',
    script_master: '📝 Script-Master',
    closing_expert: '🎯 Closing-Experte',
    timing_champion: '⏰ Timing-Champion',
    solid_performer: '💪 Solider Performer'
  };
  return labels[pattern] || pattern;
}

/**
 * Gibt das Emoji für einen Pattern-Typ zurück
 * @param {SuccessPatternType} pattern - Pattern-Typ
 * @returns {string} Emoji
 */
export function getPatternEmoji(pattern) {
  const emojis = {
    elite_performer: '🏆',
    script_master: '📝',
    closing_expert: '🎯',
    timing_champion: '⏰',
    solid_performer: '💪'
  };
  return emojis[pattern] || '👤';
}

/**
 * Gibt die Farbe für einen Pattern-Typ zurück
 * @param {SuccessPatternType} pattern - Pattern-Typ
 * @returns {string} Hex-Farbcode
 */
export function getPatternColor(pattern) {
  const colors = {
    elite_performer: '#FFD700', // Gold
    script_master: '#8B5CF6',   // Purple
    closing_expert: '#10B981',  // Green
    timing_champion: '#F59E0B', // Amber
    solid_performer: '#3B82F6'  // Blue
  };
  return colors[pattern] || '#6B7280';
}

/**
 * Gibt das deutsche Label für einen Mentor-Bereich zurück
 * @param {MentorArea} area - Mentor-Bereich
 * @returns {string} Deutsches Label
 */
export function getMentorAreaLabel(area) {
  const labels = {
    script_optimization: '📝 Script-Optimierung',
    closing_techniques: '🎯 Closing-Techniken',
    time_management: '⏰ Zeitmanagement'
  };
  return labels[area] || area;
}

/**
 * Berechnet den Score-Level (Bronze, Silber, Gold, Platin)
 * @param {number} score - Success Score (0-100)
 * @returns {{ level: string, emoji: string, color: string }}
 */
export function getScoreLevel(score) {
  if (score >= 90) return { level: 'Platin', emoji: '💎', color: '#E5E7EB' };
  if (score >= 80) return { level: 'Gold', emoji: '🥇', color: '#FFD700' };
  if (score >= 70) return { level: 'Silber', emoji: '🥈', color: '#C0C0C0' };
  if (score >= 50) return { level: 'Bronze', emoji: '🥉', color: '#CD7F32' };
  return { level: 'Starter', emoji: '⭐', color: '#6B7280' };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gruppiert Performer nach Pattern-Typ
 * @param {SuccessPattern[]} patterns - Array von Success Patterns
 * @returns {Object<SuccessPatternType, SuccessPattern[]>} Gruppierte Patterns
 */
export function groupByPattern(patterns) {
  return patterns.reduce((groups, pattern) => {
    const key = pattern.success_pattern;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(pattern);
    return groups;
  }, {});
}

/**
 * Findet den besten Mentor für einen bestimmten Bereich
 * @param {SuccessPattern[]} patterns - Array von Success Patterns
 * @param {MentorArea} area - Gewünschter Mentor-Bereich
 * @returns {SuccessPattern|null} Bester Mentor oder null
 */
export function findBestMentor(patterns, area) {
  const mentors = patterns.filter(p => p.can_mentor_in.includes(area));
  if (mentors.length === 0) return null;
  return mentors.reduce((best, current) => 
    current.success_score > best.success_score ? current : best
  );
}

/**
 * Berechnet Team-Statistiken
 * @param {SuccessPattern[]} patterns - Array von Success Patterns
 * @returns {Object} Team-Statistiken
 */
export function calculateTeamStats(patterns) {
  if (patterns.length === 0) {
    return {
      avgScore: 0,
      avgReplyRate: 0,
      avgConversionRate: 0,
      totalSignups: 0,
      topPattern: null
    };
  }

  const avgScore = patterns.reduce((sum, p) => sum + p.success_score, 0) / patterns.length;
  const avgReplyRate = patterns.reduce((sum, p) => sum + p.reply_rate_percent, 0) / patterns.length;
  const avgConversionRate = patterns.reduce((sum, p) => sum + p.conversion_rate_percent, 0) / patterns.length;
  const totalSignups = patterns.reduce((sum, p) => sum + p.signups, 0);

  // Häufigstes Pattern finden
  const patternCounts = {};
  patterns.forEach(p => {
    patternCounts[p.success_pattern] = (patternCounts[p.success_pattern] || 0) + 1;
  });
  const topPattern = Object.entries(patternCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  return {
    avgScore: Math.round(avgScore * 10) / 10,
    avgReplyRate: Math.round(avgReplyRate * 10) / 10,
    avgConversionRate: Math.round(avgConversionRate * 10) / 10,
    totalSignups,
    topPattern
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT DEFAULT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // Core
  getSuccessPatterns,
  getTopMentors,
  getPatternSummary,
  // Helpers
  isValidUUID,
  getPatternLabel,
  getPatternEmoji,
  getPatternColor,
  getMentorAreaLabel,
  getScoreLevel,
  // Analytics
  groupByPattern,
  findBestMentor,
  calculateTeamStats
};

