/**
 * Service für Objection Templates - wiederverwendbare Einwand-Antworten
 * 
 * Templates können manuell erstellt oder via Playbook-Suggestor (KI-gestützt)
 * generiert werden. Sie dienen als Bausteine für schnelle, konsistente
 * Antworten auf wiederkehrende Einwände.
 * 
 * WICHTIG: Das "key"-Feld wird verwendet, um ein Template einem Follow-up-Step
 * zuzuordnen. Der Wert entspricht einem FollowUpStepKey aus followupSequence.ts.
 */

import { supabaseClient } from "@/lib/supabaseClient";
import type { FollowUpStepKey } from "@/config/followupSequence";

// Re-export für einfachen Import
export type { FollowUpStepKey };

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type ObjectionTemplateStatus = "draft" | "active" | "archived";

export type ObjectionTemplate = {
  id: string;
  /** Follow-up Step Key (z.B. 'fu_1_bump', 'fu_2_value') - null wenn generisch */
  key: FollowUpStepKey | string | null;
  title: string;
  /** Vertical: 'network', 'real_estate', 'finance', 'generic' oder null */
  vertical: string | null;
  objection_text: string;
  template_message: string;
  notes: string | null;
  source: string | null;
  status: ObjectionTemplateStatus;
  created_at: string;
  updated_at: string;
};

export type CreateObjectionTemplateInput = {
  title: string;
  vertical?: string | null;
  objectionText: string;
  templateMessage: string;
  notes?: string | null;
  source?: string | null;
  status?: ObjectionTemplateStatus;
  key?: FollowUpStepKey | null;
};

// ─────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Erstellt ein neues Objection Template in Supabase
 */
export async function createObjectionTemplate(
  input: CreateObjectionTemplateInput
): Promise<ObjectionTemplate> {
  const { data, error } = await supabaseClient
    .from("objection_templates")
    .insert({
      title: input.title,
      vertical: input.vertical ?? null,
      objection_text: input.objectionText,
      template_message: input.templateMessage,
      notes: input.notes ?? null,
      source: input.source ?? "analytics_play_suggestor",
      status: input.status ?? "draft",
    })
    .select("*")
    .single();

  if (error) {
    console.error("Fehler beim Speichern des Templates:", error);
    throw new Error("Template konnte nicht gespeichert werden: " + error.message);
  }

  return data as ObjectionTemplate;
}

/**
 * Holt alle aktiven Templates (optional nach Vertical gefiltert)
 * 
 * Optional: Kann später für eine Template-Bibliothek genutzt werden
 */
export async function listActiveTemplates(
  vertical?: string | null
): Promise<ObjectionTemplate[]> {
  let query = supabaseClient
    .from("objection_templates")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (vertical) {
    query = query.eq("vertical", vertical);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fehler beim Laden der Templates:", error);
    throw new Error("Templates konnten nicht geladen werden: " + error.message);
  }

  return (data as ObjectionTemplate[]) ?? [];
}

/**
 * Holt ALLE aktiven Templates (für Follow-up Overrides)
 */
export async function listActiveObjectionTemplates(): Promise<ObjectionTemplate[]> {
  const { data, error } = await supabaseClient
    .from("objection_templates")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fehler beim Laden aktiver Templates:", error);
    throw new Error("Aktive Templates konnten nicht geladen werden: " + error.message);
  }

  return (data ?? []) as ObjectionTemplate[];
}

/**
 * Holt ALLE Templates (für Manager-Seite)
 */
export async function listAllObjectionTemplates(): Promise<ObjectionTemplate[]> {
  const { data, error } = await supabaseClient
    .from("objection_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fehler beim Laden aller Templates:", error);
    throw new Error("Templates konnten nicht geladen werden: " + error.message);
  }

  return (data ?? []) as ObjectionTemplate[];
}

/**
 * Aktualisiert ein Template (key, vertical, status, etc.)
 */
export async function updateObjectionTemplate(
  id: string,
  updates: Partial<{
    key: FollowUpStepKey | string | null;
    vertical: string | null;
    status: ObjectionTemplateStatus;
    title: string;
    template_message: string;
    notes: string | null;
  }>
): Promise<ObjectionTemplate> {
  const { data, error } = await supabaseClient
    .from("objection_templates")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Fehler beim Aktualisieren des Templates:", error);
    throw new Error("Template konnte nicht aktualisiert werden: " + error.message);
  }

  return data as ObjectionTemplate;
}

/**
 * Setzt ein Template als aktives Override für einen Step + Vertical.
 * Stellt sicher, dass nur EIN aktives Template pro Step+Vertical existiert.
 */
export async function setActiveTemplateForStepAndVertical(
  templateId: string,
  stepKey: FollowUpStepKey,
  vertical: string | null
): Promise<void> {
  // 1) Alle Templates für diesen StepKey + Vertical auf "draft" setzen
  let clearQuery = supabaseClient
    .from("objection_templates")
    .update({ status: "draft" })
    .eq("key", stepKey);

  // Handle null vertical correctly
  if (vertical === null || vertical === "" || vertical === "generic") {
    clearQuery = clearQuery.is("vertical", null);
  } else {
    clearQuery = clearQuery.eq("vertical", vertical);
  }

  const { error: clearError } = await clearQuery;

  if (clearError) {
    console.error("Fehler beim Zurücksetzen alter aktiver Templates:", clearError);
    throw new Error(
      "Aktive Templates konnten nicht zurückgesetzt werden: " + clearError.message
    );
  }

  // 2) Gewähltes Template auf "active" setzen und key/vertical setzen
  await updateObjectionTemplate(templateId, {
    key: stepKey,
    vertical: vertical || null,
    status: "active",
  });
}

/**
 * Entfernt ein aktives Override für einen Step + Vertical
 * (setzt alle Templates für diese Kombination auf draft)
 */
export async function clearActiveTemplateForStepAndVertical(
  stepKey: FollowUpStepKey,
  vertical: string | null
): Promise<void> {
  let query = supabaseClient
    .from("objection_templates")
    .update({ status: "draft", key: null })
    .eq("key", stepKey);

  if (vertical === null || vertical === "" || vertical === "generic") {
    query = query.is("vertical", null);
  } else {
    query = query.eq("vertical", vertical);
  }

  const { error } = await query;

  if (error) {
    console.error("Fehler beim Löschen des aktiven Templates:", error);
    throw new Error("Aktives Template konnte nicht entfernt werden: " + error.message);
  }
}

