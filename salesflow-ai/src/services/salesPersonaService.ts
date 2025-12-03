/**
 * Service für Sales Agent Personas - User-spezifische KI-Einstellungen
 * 
 * Jeder User kann eine Persona wählen, die bestimmt, wie die KI für ihn spricht:
 * - speed: Kurz, direkt, max Output
 * - balanced: Standard-Mischung aus Effizienz und Beziehung
 * - relationship: Wärmer, mehr Kontext, Fokus auf Beziehungsebene
 */

import { supabaseClient } from "@/lib/supabaseClient";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type PersonaKey = "speed" | "balanced" | "relationship";

export type SalesAgentPersona = {
  user_id: string;
  persona_key: PersonaKey;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Holt die aktuelle Persona des eingeloggten Users
 * Fallback: "balanced" wenn nicht gesetzt oder bei Fehler
 */
export async function getCurrentUserPersona(): Promise<PersonaKey> {
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    console.warn("Keine User-Session gefunden, nutze Persona 'balanced'.");
    return "balanced";
  }

  const { data, error } = await supabaseClient
    .from("sales_agent_personas")
    .select("persona_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Fehler beim Laden der Persona:", error);
    return "balanced";
  }

  if (!data || !data.persona_key) {
    return "balanced";
  }

  const key = data.persona_key as PersonaKey;
  if (!["speed", "balanced", "relationship"].includes(key)) {
    return "balanced";
  }
  return key;
}

/**
 * Setzt die Persona für den eingeloggten User
 * Upsert: Erstellt neuen Eintrag oder aktualisiert bestehenden
 */
export async function updateCurrentUserPersona(
  persona: PersonaKey,
  notes?: string | null
): Promise<SalesAgentPersona> {
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    throw new Error("Kein eingeloggter User – Persona kann nicht gesetzt werden.");
  }

  const { data, error } = await supabaseClient
    .from("sales_agent_personas")
    .upsert(
      {
        user_id: user.id,
        persona_key: persona,
        notes: notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    console.error("Fehler beim Setzen der Persona:", error);
    throw new Error("Persona konnte nicht gespeichert werden: " + error.message);
  }

  return data as SalesAgentPersona;
}

