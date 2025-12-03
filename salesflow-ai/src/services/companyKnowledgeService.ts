/**
 * Service für Company Knowledge - Vertriebsrelevantes Wissen
 * 
 * Verwaltet zentrale Firmen-Informationen (Vision, Produkte, Preise, USPs,
 * rechtliche Hinweise, Kommunikationsstil), die von KI-Endpunkten als
 * Kontext verwendet werden.
 */

import { supabaseClient } from "@/lib/supabaseClient";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type CompanyKnowledge = {
  id: string;
  user_id: string;
  company_name: string | null;
  vision: string | null;
  target_audience: string | null;
  products: string | null;
  pricing: string | null;
  usps: string | null;
  legal_disclaimers: string | null;
  communication_style: string | null;
  no_go_phrases: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyKnowledgeInput = {
  company_name?: string | null;
  vision?: string | null;
  target_audience?: string | null;
  products?: string | null;
  pricing?: string | null;
  usps?: string | null;
  legal_disclaimers?: string | null;
  communication_style?: string | null;
  no_go_phrases?: string | null;
  notes?: string | null;
};

// ─────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Lädt das Company Knowledge des aktuell eingeloggten Users.
 * 
 * @returns CompanyKnowledge oder null wenn noch nicht gepflegt
 */
export async function getCurrentCompanyKnowledge(): Promise<CompanyKnowledge | null> {
  // User aus Session holen
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    console.warn("Keine User-Session – Company Knowledge nicht geladen.");
    return null;
  }

  // Knowledge abfragen (neuester Eintrag)
  const { data, error } = await supabaseClient
    .from("sales_company_knowledge")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Fehler beim Laden von Company Knowledge:", error);
    throw new Error("Vertriebs-Wissen konnte nicht geladen werden: " + error.message);
  }

  return (data as CompanyKnowledge) ?? null;
}

/**
 * Speichert oder aktualisiert das Company Knowledge des aktuellen Users.
 * 
 * Nutzt UPSERT: Wenn bereits ein Eintrag existiert, wird er aktualisiert.
 * Wenn nicht, wird ein neuer erstellt.
 * 
 * @param input Die zu speichernden Daten
 * @returns Das gespeicherte CompanyKnowledge
 */
export async function upsertCurrentCompanyKnowledge(
  input: CompanyKnowledgeInput
): Promise<CompanyKnowledge> {
  // User aus Session holen
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    throw new Error("Kein eingeloggter User – Vertriebs-Wissen kann nicht gespeichert werden.");
  }

  // Prüfen ob bereits ein Eintrag existiert
  const { data: existing } = await supabaseClient
    .from("sales_company_knowledge")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const payload = {
    user_id: user.id,
    company_name: input.company_name ?? null,
    vision: input.vision ?? null,
    target_audience: input.target_audience ?? null,
    products: input.products ?? null,
    pricing: input.pricing ?? null,
    usps: input.usps ?? null,
    legal_disclaimers: input.legal_disclaimers ?? null,
    communication_style: input.communication_style ?? null,
    no_go_phrases: input.no_go_phrases ?? null,
    notes: input.notes ?? null,
  };

  let data;
  let error;

  if (existing) {
    // Update
    const result = await supabaseClient
      .from("sales_company_knowledge")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    
    data = result.data;
    error = result.error;
  } else {
    // Insert
    const result = await supabaseClient
      .from("sales_company_knowledge")
      .insert(payload)
      .select("*")
      .single();
    
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error("Fehler beim Speichern von Company Knowledge:", error);
    throw new Error("Vertriebs-Wissen konnte nicht gespeichert werden: " + error.message);
  }

  return data as CompanyKnowledge;
}

/**
 * Löscht das Company Knowledge des aktuellen Users.
 * 
 * Wird selten gebraucht, aber für Vollständigkeit implementiert.
 */
export async function deleteCurrentCompanyKnowledge(): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    throw new Error("Kein eingeloggter User.");
  }

  const { error } = await supabaseClient
    .from("sales_company_knowledge")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Fehler beim Löschen von Company Knowledge:", error);
    throw new Error("Vertriebs-Wissen konnte nicht gelöscht werden: " + error.message);
  }
}

