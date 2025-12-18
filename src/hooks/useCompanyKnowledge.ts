/**
 * Hook für Company Knowledge
 * 
 * Lädt das vertriebsrelevante Wissen des Users beim Mount
 * und bietet Funktionen zum Speichern / Aktualisieren.
 */

import { useEffect, useState } from "react";
import {
  getCurrentUserCompanyKnowledge,
  upsertCompanyKnowledge,
  type CompanyKnowledge,
  type CompanyKnowledgeUpdatePayload,
} from "@/services/salesCompanyKnowledgeService";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type UseCompanyKnowledgeResult = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  knowledge: CompanyKnowledge | null;
  save: (payload: CompanyKnowledgeUpdatePayload) => Promise<void>;
  refetch: () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useCompanyKnowledge(): UseCompanyKnowledgeResult {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knowledge, setKnowledge] = useState<CompanyKnowledge | null>(null);

  const loadKnowledge = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCurrentUserCompanyKnowledge();
      setKnowledge(data);
    } catch (err: any) {
      console.error("Fehler beim Laden von Company Knowledge:", err);
      setError(
        err?.message || "Dein Company Knowledge konnte nicht geladen werden."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (payload: CompanyKnowledgeUpdatePayload) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await upsertCompanyKnowledge(payload);
      setKnowledge(updated);
    } catch (err: any) {
      console.error("Fehler beim Speichern von Company Knowledge:", err);
      setError(
        err?.message || "Company Knowledge konnte nicht gespeichert werden."
      );
      throw err; // Weitergeben, damit UI reagieren kann
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    error,
    knowledge,
    save,
    refetch: loadKnowledge,
  };
}
