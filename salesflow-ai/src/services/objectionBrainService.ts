/**
 * Service für Objection Brain - KI-gestützter Einwand-Coach
 */

import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────────
// Types - Generate
// ─────────────────────────────────────────────────────────────────

export type ObjectionBrainInput = {
  vertical?: string | null;
  channel?: string | null;
  objection: string;
  context?: string | null;
};

export type ObjectionVariant = {
  label: string;
  message: string;
  summary?: string | null;
};

export type ObjectionBrainResult = {
  primary: ObjectionVariant;
  alternatives: ObjectionVariant[];
  reasoning?: string | null;
};

// ─────────────────────────────────────────────────────────────────
// Types - Logging
// ─────────────────────────────────────────────────────────────────

export type ObjectionLogInput = {
  leadId?: string | null;
  vertical?: string | null;
  channel?: string | null;
  objectionText: string;
  chosenVariantLabel: string;
  chosenMessage: string;
  modelReasoning?: string | null;
  outcome?: string | null;
  source?: string | null;
};

export type ObjectionLogResult = {
  id: string;
};

// ─────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Generiert Einwand-Behandlungsvorschläge via Backend API
 */
export async function generateObjectionBrainResult(
  input: ObjectionBrainInput,
  personaKey?: "speed" | "balanced" | "relationship"
): Promise<ObjectionBrainResult> {
  const response = await fetch("/api/objection-brain/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vertical: input.vertical ?? null,
      channel: input.channel ?? null,
      objection: input.objection,
      context: input.context ?? null,
      language: "de",
      persona_key: personaKey ?? null,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Objection Brain Anfrage fehlgeschlagen (${response.status}): ${text || "Unbekannter Fehler"}`
    );
  }

  const data = (await response.json()) as ObjectionBrainResult;
  return data;
}

/**
 * Loggt die Verwendung einer Einwand-Antwort für Analytics
 * 
 * Wird aufgerufen wenn der User "Diese Antwort verwenden" klickt.
 * Speichert in objection_sessions Tabelle für spätere Auswertungen.
 */
export async function logObjectionUsage(
  input: ObjectionLogInput
): Promise<ObjectionLogResult> {
  const response = await fetch("/api/objection-brain/log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lead_id: input.leadId ?? null,
      vertical: input.vertical ?? null,
      channel: input.channel ?? null,
      objection_text: input.objectionText,
      chosen_variant_label: input.chosenVariantLabel,
      chosen_message: input.chosenMessage,
      model_reasoning: input.modelReasoning ?? null,
      outcome: input.outcome ?? null,
      source: input.source ?? "objection_brain_page",
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Objection-Log fehlgeschlagen (${response.status}): ${text || "Unbekannter Fehler"}`
    );
  }

  const data = (await response.json()) as ObjectionLogResult;
  return data;
}

// ─────────────────────────────────────────────────────────────────
// Legacy Functions (from salesflow-app)
// ─────────────────────────────────────────────────────────────────

/**
 * Fuzzy-Suche nach Einwänden
 */
export async function searchObjections(searchText: string, options: {
  category?: string | null;
  vertical?: string | null;
  limit?: number;
} = {}) {
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
 */
export async function getObjectionsByCategory(category: string, vertical: string | null = null) {
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
 */
export async function getDISGResponse(objectionId: string, disgType: string) {
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
 */
export async function getTopObjections(limit: number = 10) {
  const { data, error } = await supabase.rpc('get_top_objections', {
    p_limit: limit
  });

  if (error) {
    console.error('❌ Get Top Objections Error:', error);
    throw error;
  }

  return data || [];
}

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Kategorie-Label auf Deutsch
 */
export const CATEGORY_LABELS: Record<string, string> = {
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
export const DISG_LABELS: Record<string, { name: string; emoji: string; color: string; description: string }> = {
  d: { name: 'Dominant', emoji: '🦁', color: '#EF4444', description: 'Direkt, ergebnisorientiert' },
  i: { name: 'Initiativ', emoji: '🦋', color: '#F59E0B', description: 'Begeisternd, optimistisch' },
  s: { name: 'Stetig', emoji: '🐢', color: '#10B981', description: 'Geduldig, teamorientiert' },
  g: { name: 'Gewissenhaft', emoji: '🦉', color: '#3B82F6', description: 'Analytisch, präzise' }
};

/**
 * Kategorie-Label abrufen
 */
export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

/**
 * DISG-Info abrufen
 */
export function getDISGInfo(type: string | null | undefined) {
  return DISG_LABELS[type?.toLowerCase() || ''] || DISG_LABELS.d;
}

/**
 * Beste Antwort-Strategie empfehlen
 */
export function recommendResponseStrategy(objection: any, disgType: string | null = null) {
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
