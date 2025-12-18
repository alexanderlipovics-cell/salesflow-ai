/**
 * Service für Sales Company Knowledge
 * 
 * Lädt und speichert vertriebsrelevantes Wissen aus der Tabelle
 * `sales_company_knowledge` (Company Name, Produkte, Zielgruppe, etc.)
 */

import { supabaseClient } from "@/lib/supabaseClient";
import api from "@/lib/api";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type CompanyKnowledge = {
  id?: string;
  user_id?: string;
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
  created_at?: string;
  updated_at?: string;
};

export type CompanyKnowledgeUpdatePayload = Partial<
  Omit<CompanyKnowledge, "id" | "user_id" | "created_at" | "updated_at">
>;

// ─────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Lädt das Company Knowledge des aktuellen Users.
 * Gibt null zurück, wenn noch keins existiert.
 */
export async function getCurrentUserCompanyKnowledge(): Promise<CompanyKnowledge | null> {
  // Get user ID from API (works with custom JWT auth)
  let userId: string | null = null;
  
  try {
    const userData = await api.get("/auth/me");
    userId = userData?.id;
  } catch (apiError) {
    // Fallback to Supabase auth if API fails
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Nicht authentifiziert. Bitte melde dich an.");
    }
    userId = user.id;
  }

  if (!userId) {
    throw new Error("Nicht authentifiziert. Bitte melde dich an.");
  }

  const { data, error } = await supabaseClient
    .from("sales_company_knowledge")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Fehler beim Laden von Company Knowledge:", error);
    throw new Error(
      error.message || "Company Knowledge konnte nicht geladen werden."
    );
  }

  return data;
}

/**
 * Speichert oder aktualisiert das Company Knowledge.
 * Nutzt UPSERT, um entweder zu erstellen oder zu aktualisieren.
 */
export async function upsertCompanyKnowledge(
  payload: CompanyKnowledgeUpdatePayload
): Promise<CompanyKnowledge> {
  // Get user ID from API (works with custom JWT auth)
  let userId: string | null = null;
  
  try {
    const userData = await api.get("/auth/me");
    userId = userData?.id;
  } catch (apiError) {
    // Fallback to Supabase auth if API fails
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Nicht authentifiziert. Bitte melde dich an.");
    }
    userId = user.id;
  }

  if (!userId) {
    throw new Error("Nicht authentifiziert. Bitte melde dich an.");
  }

  // Upsert: Wenn ein Datensatz mit dieser user_id existiert, wird er aktualisiert.
  // Ansonsten wird ein neuer erstellt.
  const { data, error } = await supabaseClient
    .from("sales_company_knowledge")
    .upsert(
      {
        user_id: userId,
        ...payload,
      },
      {
        onConflict: "user_id", // Falls UNIQUE Constraint auf user_id existiert
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Fehler beim Speichern von Company Knowledge:", error);
    throw new Error(
      error.message || "Company Knowledge konnte nicht gespeichert werden."
    );
  }

  return data;
}

