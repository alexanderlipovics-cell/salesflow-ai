/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - LEAD SCORING SERVICE                                      ║
 * ║  BANT-Score Berechnung, Auto-Scoring, Statistiken                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lead-Score berechnen
 * @param {string} leadId - UUID des Leads
 * @returns {Promise<Object>} Score-Ergebnis
 */
export async function calculateLeadScore(leadId) {
  const { data, error } = await supabase.rpc('calculate_lead_score', {
    p_lead_id: leadId
  });

  if (error) {
    console.error('❌ Calculate Score Error:', error);
    throw error;
  }

  return data || {};
}

/**
 * BANT-Score aktualisieren
 * @param {string} leadId - UUID des Leads
 * @param {Object} bantValues - BANT-Werte (0-25 jeweils)
 * @returns {Promise<Object>} Aktualisierter Score
 */
export async function updateBANTScore(leadId, bantValues) {
  const { budget, authority, need, timeline, disgType } = bantValues;
  
  const { data, error } = await supabase.rpc('update_bant_score', {
    p_lead_id: leadId,
    p_budget: budget,
    p_authority: authority,
    p_need: need,
    p_timeline: timeline,
    p_disg_type: disgType
  });

  if (error) {
    console.error('❌ Update BANT Error:', error);
    throw error;
  }

  return data || {};
}

/**
 * Leads nach Score abrufen
 * @param {string} userId - UUID des Users
 * @param {Object} options - Filteroptionen
 * @returns {Promise<Array>} Sortierte Leads
 */
export async function getLeadsByScore(userId, options = {}) {
  const { category = null, minScore = 0 } = options;
  
  const { data, error } = await supabase.rpc('get_leads_by_score', {
    p_user_id: userId,
    p_category: category,
    p_min_score: minScore
  });

  if (error) {
    console.error('❌ Get Leads by Score Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Score-Statistiken abrufen
 * @param {string} userId - UUID des Users
 * @returns {Promise<Object>} Statistiken
 */
export async function getLeadScoreStats(userId) {
  const { data, error } = await supabase.rpc('get_lead_score_stats', {
    p_user_id: userId
  });

  if (error) {
    console.error('❌ Get Stats Error:', error);
    throw error;
  }

  return data || {};
}

// ═══════════════════════════════════════════════════════════════════════════
// BANT HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BANT-Fragen für Qualifizierung
 */
export const BANT_QUESTIONS = {
  budget: {
    label: '💰 Budget',
    emoji: '💰',
    color: '#10B981',
    questions: [
      'Hast du ein Budget für diese Investition eingeplant?',
      'In welcher Preisklasse denkst du?',
      'Wäre das eine einmalige oder monatliche Investition?'
    ],
    scoring: [
      { value: 0, label: 'Unbekannt' },
      { value: 5, label: 'Kein Budget' },
      { value: 10, label: 'Begrenztes Budget' },
      { value: 15, label: 'Budget vorhanden' },
      { value: 20, label: 'Gutes Budget' },
      { value: 25, label: 'Budget kein Problem' }
    ]
  },
  authority: {
    label: '👔 Entscheidung',
    emoji: '👔',
    color: '#8B5CF6',
    questions: [
      'Wer entscheidet bei euch über solche Investitionen?',
      'Musst du das mit jemandem besprechen?',
      'Bist du der/die Entscheider/in?'
    ],
    scoring: [
      { value: 0, label: 'Unbekannt' },
      { value: 5, label: 'Kein Einfluss' },
      { value: 10, label: 'Beeinflusser' },
      { value: 15, label: 'Mitentscheider' },
      { value: 20, label: 'Hauptentscheider' },
      { value: 25, label: 'Alleinentscheider' }
    ]
  },
  need: {
    label: '🎯 Bedarf',
    emoji: '🎯',
    color: '#F59E0B',
    questions: [
      'Was ist aktuell deine größte Herausforderung?',
      'Wie dringend ist das Problem für dich?',
      'Was passiert, wenn du nichts änderst?'
    ],
    scoring: [
      { value: 0, label: 'Unbekannt' },
      { value: 5, label: 'Kein Bedarf' },
      { value: 10, label: 'Leichtes Interesse' },
      { value: 15, label: 'Konkreter Bedarf' },
      { value: 20, label: 'Dringender Bedarf' },
      { value: 25, label: 'Akuter Schmerz' }
    ]
  },
  timeline: {
    label: '⏰ Zeitrahmen',
    emoji: '⏰',
    color: '#3B82F6',
    questions: [
      'Wann möchtest du starten?',
      'Gibt es eine Deadline?',
      'Wie schnell brauchst du eine Lösung?'
    ],
    scoring: [
      { value: 0, label: 'Unbekannt' },
      { value: 5, label: 'Irgendwann' },
      { value: 10, label: 'Dieses Jahr' },
      { value: 15, label: 'Dieses Quartal' },
      { value: 20, label: 'Diesen Monat' },
      { value: 25, label: 'Diese Woche' }
    ]
  }
};

/**
 * Score-Kategorie Konfiguration
 */
export const SCORE_CATEGORIES = {
  hot: { 
    label: '🔥 Hot', 
    color: '#EF4444', 
    bgColor: '#FEE2E2',
    minScore: 75,
    action: 'Sofort kontaktieren!'
  },
  warm: { 
    label: '🌡️ Warm', 
    color: '#F59E0B', 
    bgColor: '#FEF3C7',
    minScore: 50,
    action: 'Diese Woche nachfassen'
  },
  cool: { 
    label: '❄️ Cool', 
    color: '#3B82F6', 
    bgColor: '#DBEAFE',
    minScore: 25,
    action: 'Weiter qualifizieren'
  },
  cold: { 
    label: '🧊 Cold', 
    color: '#6B7280', 
    bgColor: '#F3F4F6',
    minScore: 0,
    action: 'In Nurture-Sequenz'
  }
};

/**
 * Score-Kategorie bestimmen
 */
export function getScoreCategory(score) {
  if (score >= 75) return SCORE_CATEGORIES.hot;
  if (score >= 50) return SCORE_CATEGORIES.warm;
  if (score >= 25) return SCORE_CATEGORIES.cool;
  return SCORE_CATEGORIES.cold;
}

/**
 * BANT-Score Label abrufen
 */
export function getBANTLabel(type, value) {
  const bantConfig = BANT_QUESTIONS[type];
  if (!bantConfig) return 'Unbekannt';
  
  const scoring = bantConfig.scoring.find(s => s.value === value);
  return scoring?.label || 'Unbekannt';
}

/**
 * Nächste empfohlene Aktion basierend auf BANT
 */
export function getRecommendedAction(bantScores) {
  const { budget, authority, need, timeline } = bantScores;
  
  // Priorisierung: Need > Timeline > Authority > Budget
  if (need < 10) {
    return {
      focus: 'need',
      action: '🎯 Bedarf klären',
      question: BANT_QUESTIONS.need.questions[0]
    };
  }
  
  if (timeline < 10) {
    return {
      focus: 'timeline',
      action: '⏰ Zeitrahmen klären',
      question: BANT_QUESTIONS.timeline.questions[0]
    };
  }
  
  if (authority < 10) {
    return {
      focus: 'authority',
      action: '👔 Entscheider finden',
      question: BANT_QUESTIONS.authority.questions[0]
    };
  }
  
  if (budget < 10) {
    return {
      focus: 'budget',
      action: '💰 Budget klären',
      question: BANT_QUESTIONS.budget.questions[0]
    };
  }
  
  // Alle BANT-Kriterien erfüllt
  return {
    focus: 'close',
    action: '🎯 Abschluss vorbereiten',
    question: 'Wann können wir starten?'
  };
}

/**
 * Score-Fortschritt berechnen
 */
export function calculateProgress(bantScores) {
  const total = (bantScores.budget || 0) + 
                (bantScores.authority || 0) + 
                (bantScores.need || 0) + 
                (bantScores.timeline || 0);
  return Math.round((total / 100) * 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  calculateLeadScore,
  updateBANTScore,
  getLeadsByScore,
  getLeadScoreStats,
  getScoreCategory,
  getBANTLabel,
  getRecommendedAction,
  calculateProgress,
  BANT_QUESTIONS,
  SCORE_CATEGORIES
};

