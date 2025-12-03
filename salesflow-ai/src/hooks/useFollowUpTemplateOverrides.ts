/**
 * Hook für Follow-up Template Overrides
 * 
 * Lädt alle aktiven Objection Templates aus Supabase, die als Follow-up-Overrides
 * konfiguriert sind (d.h. haben einen "key" = FollowUpStepKey).
 * 
 * Die Follow-ups Page nutzt diese Overrides, um DB-Templates vor der
 * Standard-Konfiguration (followupSequence.ts) zu priorisieren.
 */

import { useEffect, useState } from "react";
import {
  listActiveObjectionTemplates,
  type ObjectionTemplate,
  type FollowUpStepKey,
} from "@/services/objectionTemplatesService";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type FollowUpTemplateOverrideLookup = {
  // Key-Format: `${stepKey}::${verticalMapped}`
  // Beispiel: "fu_1_bump::network" oder "fu_2_value::generic"
  [key: string]: ObjectionTemplate;
};

export type UseFollowUpTemplateOverridesResult = {
  loading: boolean;
  error: string | null;
  overrides: FollowUpTemplateOverrideLookup;
  refetch: () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Mapped Vertical-Strings auf normalisierte Werte
 */
export function mapVertical(raw?: string | null): string {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("network")) return "network";
  if (v.includes("real") || v.includes("immo")) return "real_estate";
  if (v.includes("finanz") || v.includes("finance")) return "finance";
  return "generic";
}

/**
 * Baut einen Lookup-Key: `${stepKey}::${verticalMapped}`
 */
export function buildOverrideKey(stepKey?: string | null, vertical?: string | null): string {
  if (!stepKey) return "";
  return `${stepKey}::${mapVertical(vertical)}`;
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useFollowUpTemplateOverrides(): UseFollowUpTemplateOverridesResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<FollowUpTemplateOverrideLookup>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const templates = await listActiveObjectionTemplates();

      const map: FollowUpTemplateOverrideLookup = {};
      for (const t of templates) {
        if (!t.key) continue; // Nur Templates mit gesetztem Step-Key

        const key = buildOverrideKey(t.key as FollowUpStepKey, t.vertical);
        
        // Wenn mehrere Templates für dieselbe Kombination existieren,
        // nimm das jüngste (nach created_at)
        const existing = map[key];
        if (!existing) {
          map[key] = t;
        } else {
          if (new Date(t.created_at) > new Date(existing.created_at)) {
            map[key] = t;
          }
        }
      }
      setOverrides(map);
    } catch (err: any) {
      console.error("Fehler beim Laden der Follow-up Overrides:", err);
      setError(
        err?.message ||
          "Aktive Follow-up-Templates konnten nicht geladen werden."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { loading, error, overrides, refetch: load };
}
