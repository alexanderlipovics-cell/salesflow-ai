/**
 * Hook für Objection Analytics - Manager-Dashboard für Einwände-Statistiken
 */

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type ObjectionAnalyticsBucket = {
  key: string; // z.B. Einwand-Text, Vertical, Channel
  label: string; // Label für UI
  count: number;
  percentage: number;
};

export type ObjectionAnalyticsSummary = {
  from: string; // ISO-String Start
  to: string; // ISO-String Ende
  totalSessions: number;
  topObjections: ObjectionAnalyticsBucket[];
  byVertical: ObjectionAnalyticsBucket[];
  byChannel: ObjectionAnalyticsBucket[];
};

export type UseObjectionAnalyticsResult = {
  loading: boolean;
  error: string | null;
  summary: ObjectionAnalyticsSummary | null;
  refetch: () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────

export function useObjectionAnalytics(days: number = 7): UseObjectionAnalyticsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ObjectionAnalyticsSummary | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // Helper: Buckets erstellen
  // ─────────────────────────────────────────────────────────────────

  function buildBuckets(
    items: any[],
    key: "objection_text" | "vertical" | "channel",
    labelMapper?: (value: string | null) => string,
    limit?: number
  ): ObjectionAnalyticsBucket[] {
    // 1. Count pro key
    const countMap = new Map<string, number>();

    items.forEach((item) => {
      const value = item[key] || "";
      const currentCount = countMap.get(value) || 0;
      countMap.set(value, currentCount + 1);
    });

    // 2. In Array umwandeln und sortieren
    const buckets = Array.from(countMap.entries())
      .map(([value, count]) => ({
        key: value,
        count,
      }))
      .sort((a, b) => b.count - a.count); // DESC

    // 3. Optional Limit
    const limitedBuckets = limit ? buckets.slice(0, limit) : buckets;

    // 4. Percentage berechnen + Label mappen
    const totalSessions = items.length;

    return limitedBuckets.map((bucket) => ({
      key: bucket.key,
      label: labelMapper ? labelMapper(bucket.key) : bucket.key || "Unbekannt",
      count: bucket.count,
      percentage: totalSessions > 0 ? (bucket.count / totalSessions) * 100 : 0,
    }));
  }

  // ─────────────────────────────────────────────────────────────────
  // Helper: Vertical Label Mapper
  // ─────────────────────────────────────────────────────────────────

  function mapVerticalLabel(value: string | null): string {
    switch ((value || "").toLowerCase()) {
      case "network":
        return "Network Marketing";
      case "real_estate":
      case "immo":
        return "Immobilien";
      case "finance":
        return "Finance";
      default:
        return "Allgemein";
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Helper: Channel Label Mapper
  // ─────────────────────────────────────────────────────────────────

  function mapChannelLabel(value: string | null): string {
    switch ((value || "").toLowerCase()) {
      case "whatsapp":
        return "WhatsApp";
      case "instagram":
        return "Instagram DM";
      case "phone":
        return "Telefon";
      case "email":
        return "E-Mail";
      default:
        return "Unbekannter Kanal";
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Fetch-Funktion
  // ─────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Zeitraum berechnen
      const now = new Date();
      const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const fromIso = fromDate.toISOString();
      const toIso = now.toISOString();

      // Query
      const { data, error: queryError } = await supabaseClient
        .from("objection_sessions")
        .select("id, vertical, channel, objection_text, created_at")
        .gte("created_at", fromIso)
        .lte("created_at", toIso);

      if (queryError) {
        throw queryError;
      }

      if (!data || data.length === 0) {
        setSummary({
          from: fromIso,
          to: toIso,
          totalSessions: 0,
          topObjections: [],
          byVertical: [],
          byChannel: [],
        });
        return;
      }

      // Auswertung
      const totalSessions = data.length;

      const topObjections = buildBuckets(
        data,
        "objection_text",
        (value) => value || "Unbekannter Einwand",
        5
      );

      const byVertical = buildBuckets(data, "vertical", mapVerticalLabel);

      const byChannel = buildBuckets(data, "channel", mapChannelLabel);

      setSummary({
        from: fromIso,
        to: toIso,
        totalSessions,
        topObjections,
        byVertical,
        byChannel,
      });
    } catch (err: any) {
      console.error("useObjectionAnalytics Fehler:", err);
      setError(err?.message || "Fehler beim Laden der Einwände-Statistiken.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  // ─────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────

  return {
    loading,
    error,
    summary,
    refetch: fetchData,
  };
}

