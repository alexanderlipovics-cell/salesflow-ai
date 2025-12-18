// src/pages/ClosingCoachPage.tsx

import React, {
  FC,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "@/lib/supabaseClient";
import { useApi, useMutation } from '@/hooks/useApi';
import { Loader2 } from 'lucide-react';

type Probability = "low" | "medium" | "high";
type Severity = "low" | "medium" | "high";

interface ClosingBlocker {
  type: string;
  severity: Severity;
  context: string;
  recommendation: string;
}

interface ClosingStrategy {
  strategy: string;
  script: string;
  confidence: number; // 0-100
}

export interface ClosingInsight {
  id: string;
  deal_id: string;
  closing_score: number; // 0-100
  closing_probability: Probability;
  detected_blockers: ClosingBlocker[];
  recommended_strategies: ClosingStrategy[];
  suggested_next_action: string;
  // Optional: zusätzliche Felder, falls Backend mehr liefert
  deal_name?: string;
  deal_value?: number;
  deal_stage?: string;
}

const getScoreColor = (score: number): string => {
  if (score < 50) return "bg-red-500/20 text-red-300 border-red-500/40";
  if (score <= 70) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
};

const getProbabilityLabel = (p: Probability): string => {
  switch (p) {
    case "low":
      return "Niedrig";
    case "medium":
      return "Mittel";
    case "high":
      return "Hoch";
    default:
      return p;
  }
};

const getSeverityColor = (severity: Severity): string => {
  switch (severity) {
    case "high":
      return "bg-red-900/70 border-red-500/60 text-red-100";
    case "medium":
      return "bg-amber-900/70 border-amber-500/60 text-amber-100";
    case "low":
    default:
      return "bg-slate-800/80 border-slate-600/60 text-slate-100";
  }
};

const formatEuro = (value?: number): string => {
  if (value == null) return "–";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
};

const ClosingCoachPage: FC = () => {
  const navigate = useNavigate();

  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  // API Hooks - Nutze bestehende Infrastruktur
  const dealsQuery = useApi<ClosingInsight[]>(
    '/api/closing-coach/my-deals',
    { immediate: true }
  );

  const analyzeMutation = useMutation<ClosingInsight>(
    'post',
    (dealId: string) => `/api/closing-coach/analyze/${dealId}`,
    {
      onSuccess: (updatedInsight) => {
        // Update deals list
        dealsQuery.refetch();
      },
      onError: (error) => {
        console.error('Analyze error:', error);
      }
    }
  );

  const deals = dealsQuery.data || [];
  const loading = dealsQuery.isLoading;
  const error = dealsQuery.error;

  const handleAnalyze = async (deal: ClosingInsight) => {
    await analyzeMutation.mutate(deal.deal_id);
  };

  const handleCopyScript = async (script: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API not available");
      }
      await navigator.clipboard.writeText(script);
      setClipboardMessage("Script in Zwischenablage kopiert.");
    } catch (err) {
      console.error(err);
      setClipboardMessage("Kopieren leider nicht möglich.");
    } finally {
      window.setTimeout(() => setClipboardMessage(null), 2500);
    }
  };

  const overallAverageScore = useMemo(() => {
    if (!deals.length) return null;
    const sum = deals.reduce((acc, d) => acc + (d.closing_score || 0), 0);
    return Math.round(sum / deals.length);
  }, [deals]);

  const analyzingId = analyzeMutation.isLoading ? analyzeMutation.data?.id || null : null;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            🎯 Closing Coach
          </h1>
          <p className="text-sm text-slate-400">
            Deals, Blocker & Strategien für maximale Abschlusswahrscheinlichkeit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {clipboardMessage && (
            <div className="rounded-md bg-emerald-900/60 px-3 py-1 text-xs text-emerald-200">
              {clipboardMessage}
            </div>
          )}
          {overallAverageScore !== null && (
            <div
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getScoreColor(
                overallAverageScore
              )}`}
            >
              Ø Closing-Score: {overallAverageScore} / 100
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Info/Error-Leiste */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-400">
            {loading
              ? "Deals werden geladen…"
              : `Deals im Coaching: ${deals.length}`}
          </div>
          <div className="flex gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              <span>&lt; 50 schwach</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              <span>50–70 heikel</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <span>&gt; 70 stark</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-900/40 px-4 py-3 text-xs text-red-100">
            {error.message || "Fehler beim Laden der Deals. Bitte später erneut versuchen."}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="mb-3 h-4 w-2/3 rounded bg-slate-800" />
                <div className="mb-2 h-3 w-1/2 rounded bg-slate-800" />
                <div className="mb-4 h-3 w-1/3 rounded bg-slate-800" />
                <div className="mb-2 h-3 w-full rounded bg-slate-800" />
                <div className="mb-2 h-3 w-4/5 rounded bg-slate-800" />
                <div className="mt-4 flex gap-2">
                  <div className="h-7 w-20 rounded bg-slate-800" />
                  <div className="h-7 w-24 rounded bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Deals-Grid */}
        {!loading && deals.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {deals.map((deal) => {
              const scoreColor = getScoreColor(deal.closing_score);
              const probabilityLabel = getProbabilityLabel(
                deal.closing_probability
              );

              return (
                <article
                  key={deal.id}
                  className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-md"
                >
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold">
                        {deal.deal_name || "Unbenannter Deal"}
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Wert: {formatEuro(deal.deal_value)} · Stage:{" "}
                        {deal.deal_stage || "—"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        ID:{" "}
                        <span className="font-mono text-[10px]">
                          {deal.deal_id}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${scoreColor}`}
                      >
                        Score: {deal.closing_score} / 100
                      </span>
                      <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-200">
                        Wahrscheinlichkeit: {probabilityLabel}
                      </span>
                    </div>
                  </div>

                  {/* Suggested next action */}
                  <div className="mb-3 rounded-md border border-slate-800 bg-slate-950/80 p-2 text-[11px] text-slate-100">
                    <span className="font-semibold text-slate-200">
                      Nächste Aktion:
                    </span>
                    <div className="mt-1 text-slate-200">
                      {deal.suggested_next_action}
                    </div>
                  </div>

                  {/* Blocker */}
                  {deal.detected_blockers && deal.detected_blockers.length > 0 && (
                    <div className="mb-3 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-300">
                        Blocker:
                      </div>
                      {deal.detected_blockers.map((blocker, idx) => (
                        <div
                          key={idx}
                          className={`rounded-md border p-2 text-[11px] ${getSeverityColor(
                            blocker.severity
                          )}`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-semibold">
                              {blocker.type}
                            </span>
                            <span className="rounded-full bg-black/30 px-2 py-0.5 text-[9px] uppercase tracking-wide">
                              {blocker.severity}
                            </span>
                          </div>
                          <p className="mb-1 text-slate-100">
                            {blocker.context}
                          </p>
                          <p className="text-[10px] text-slate-200">
                            Empfehlung: {blocker.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Strategien */}
                  {deal.recommended_strategies && deal.recommended_strategies.length > 0 && (
                    <div className="mb-3 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-300">
                        Strategien:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {deal.recommended_strategies.map((strategy, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleCopyScript(strategy.script)}
                            className="group flex-1 min-w-[120px] rounded-md border border-slate-700 bg-slate-900/80 px-2 py-2 text-left text-[11px] hover:border-emerald-500 hover:bg-slate-900"
                          >
                            <div className="mb-1 flex items-center justify-between gap-1">
                              <span className="font-semibold text-slate-100">
                                {strategy.strategy}
                              </span>
                              <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300">
                                {strategy.confidence}%
                              </span>
                            </div>
                            <p className="line-clamp-2 text-[10px] text-slate-400 group-hover:text-slate-200">
                              {strategy.script}
                            </p>
                            <div className="mt-1 text-[9px] text-emerald-400 opacity-0 group-hover:opacity-100">
                              Klicken zum Kopieren
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer / Actions */}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => handleAnalyze(deal)}
                      disabled={analyzeMutation.isLoading && analyzingId === deal.id}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 flex items-center gap-2"
                    >
                      {analyzeMutation.isLoading && analyzingId === deal.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Analysiere…
                        </>
                      ) : (
                        "Analysieren"
                      )}
                    </button>
                    <div className="text-[10px] text-slate-500">
                      Zuletzt bewertet durch Closing Coach
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && deals.length === 0 && !error && (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-300">
            Noch keine Deals im Closing Coach. Verbinde zuerst deine Deals oder
            triggere eine Analyse im CRM.
          </div>
        )}
      </div>
    </div>
  );
};

export default ClosingCoachPage;

