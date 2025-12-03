/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - OBJECTION BRAIN SERVICE                                   ║
 * ║  Einwand-Suche, DISG-Antworten, Kategorie-Management                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fuzzy-Suche nach Einwänden
 * @param {string} searchText - Suchbegriff
 * @param {Object} options - Filteroptionen
 * @returns {Promise<Array>} Gefundene Einwände
 */
export async function searchObjections(searchText, options = {}) {
  const { category = null, vertical = null, limit = 10 } = options;
  
  const { data, error } = await supabase.rpc('search_objections', {
    p_search_text: searchText,
    p_category: category,
    p_vertical: vertical,
    p_limit: limit
  });

  if (error) {
    console.error('❌ Objection Search Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Einwände nach Kategorie abrufen
 * @param {string} category - Kategorie-Name
 * @param {string} [vertical] - Optional: Branche
 * @returns {Promise<Array>} Einwände der Kategorie
 */
export async function getObjectionsByCategory(category, vertical = null) {
  const { data, error } = await supabase.rpc('get_objections_by_category', {
    p_category: category,
    p_vertical: vertical
  });

  if (error) {
    console.error('❌ Get Objections Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * DISG-spezifische Antwort abrufen
 * @param {string} objectionId - UUID des Einwands
 * @param {string} disgType - DISG-Typ ('d', 'i', 's', 'g')
 * @returns {Promise<Object>} Antwort-Daten
 */
export async function getDISGResponse(objectionId, disgType) {
  const { data, error } = await supabase.rpc('get_disg_response', {
    p_objection_id: objectionId,
    p_disg_type: disgType.toLowerCase()
  });

  if (error) {
    console.error('❌ DISG Response Error:', error);
    throw error;
  }

  return data || {};
}

/**
 * Alle verfügbaren Kategorien abrufen
 * @returns {Promise<Array>} Liste der Kategorien
 */
export async function getObjectionCategories() {
  const { data, error } = await supabase.rpc('get_objection_categories');

  if (error) {
    console.error('❌ Get Categories Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Top-Einwände (meistgenutzt) abrufen
 * @param {number} [limit=10] - Anzahl
 * @returns {Promise<Array>} Top-Einwände
 */
export async function getTopObjections(limit = 10) {
  const { data, error } = await supabase.rpc('get_top_objections', {
    p_limit: limit
  });

  if (error) {
    console.error('❌ Get Top Objections Error:', error);
    throw error;
  }

  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Kategorie-Label auf Deutsch
 */
export const CATEGORY_LABELS = {
  price: '💰 Preis',
  time: '⏰ Zeit',
  trust: '🤝 Vertrauen',
  need: '🤔 Bedarf',
  authority: '👔 Entscheidung',
  stall: '⏸️ Verzögerung',
  competition: '🏆 Konkurrenz',
  mlm_stigma: '🚫 MLM-Skepsis',
  limiting_belief: '🧠 Glaubenssatz',
  third_party: '👥 Dritte Person',
  financial: '💸 Finanzen',
  social_fear: '😰 Soziale Angst',
  no_need: '❌ Kein Bedarf'
};

/**
 * DISG-Typ Labels
 */
export const DISG_LABELS = {
  d: { name: 'Dominant', emoji: '🦁', color: '#EF4444', description: 'Direkt, ergebnisorientiert' },
  i: { name: 'Initiativ', emoji: '🦋', color: '#F59E0B', description: 'Begeisternd, optimistisch' },
  s: { name: 'Stetig', emoji: '🐢', color: '#10B981', description: 'Geduldig, teamorientiert' },
  g: { name: 'Gewissenhaft', emoji: '🦉', color: '#3B82F6', description: 'Analytisch, präzise' }
};

/**
 * Kategorie-Label abrufen
 */
export function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

/**
 * DISG-Info abrufen
 */
export function getDISGInfo(type) {
  return DISG_LABELS[type?.toLowerCase()] || DISG_LABELS.d;
}

/**
 * Beste Antwort-Strategie empfehlen
 * @param {Object} objection - Einwand-Objekt
 * @param {string} [disgType] - Optional: DISG-Typ des Leads
 * @returns {Object} Empfohlene Strategie
 */
export function recommendResponseStrategy(objection, disgType = null) {
  // Wenn DISG-Typ bekannt, DISG-spezifische Antwort empfehlen
  if (disgType && objection.disg_responses?.[disgType]) {
    return {
      type: 'disg',
      label: `${DISG_LABELS[disgType].emoji} ${DISG_LABELS[disgType].name}-Antwort`,
      response: objection.disg_responses[disgType]
    };
  }
  
  // Sonst nach Severity empfehlen
  const severity = objection.severity || 5;
  
  if (severity >= 7) {
    return {
      type: 'emotional',
      label: '❤️ Emotionale Antwort',
      response: objection.responses?.emotional
    };
  } else if (severity <= 3) {
    return {
      type: 'provocative',
      label: '⚡ Provokative Antwort',
      response: objection.responses?.provocative
    };
  } else {
    return {
      type: 'logical',
      label: '🧠 Logische Antwort',
      response: objection.responses?.logical
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  searchObjections,
  getObjectionsByCategory,
  getDISGResponse,
  getObjectionCategories,
  getTopObjections,
  getCategoryLabel,
  getDISGInfo,
  recommendResponseStrategy,
  CATEGORY_LABELS,
  DISG_LABELS
};

