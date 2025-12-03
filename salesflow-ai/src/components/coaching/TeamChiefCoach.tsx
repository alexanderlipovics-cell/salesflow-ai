/**
 * TEAM-CHIEF Coach Component
 * AI-powered squad coaching dashboard for team leaders
 */
import React, { useState } from "react";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Users,
  MessageSquare,
  Trophy,
  Loader2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { SquadCoachingOutput, CoachingAction } from "@/types/coaching";
import { supabaseClient } from "@/lib/supabaseClient";
import clsx from "clsx";

interface TeamChiefCoachProps {
  squadId: string;
}

export const TeamChiefCoach: React.FC<TeamChiefCoachProps> = ({ squadId }) => {
  const [coaching, setCoaching] = useState<SquadCoachingOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fetchCoaching = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get auth token
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

      const response = await fetch(`${API_BASE_URL}/api/squad/coach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ squad_id: squadId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      setCoaching(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch coaching insights");
      console.error("Coaching fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case "empathisch":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "klar":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "motiviert":
        return "bg-green-100 text-green-800 border-green-200";
      case "fordernd":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">TEAM-CHIEF Coach</h2>
            <p className="text-sm text-slate-400">KI-gestützte Insights für dein Squad</p>
          </div>
        </div>

        <button
          onClick={fetchCoaching}
          disabled={loading}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analysiere...
            </span>
          ) : (
            "Squad analysieren"
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <p>{error}</p>
        </div>
      )}

      {coaching && (
        <>
          {/* Summary */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              <Brain className="h-5 w-5 text-purple-400" />
              Zusammenfassung
            </h3>
            <p className="text-slate-200 leading-relaxed">{coaching.summary}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Highlights */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-400">
                <TrendingUp className="h-5 w-5" />
                Was läuft gut
              </h3>
              <ul className="space-y-2">
                {coaching.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-200">
                    <span className="mt-1 text-green-500">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risks */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-orange-400">
                <AlertTriangle className="h-5 w-5" />
                Risiken & Engpässe
              </h3>
              <ul className="space-y-2">
                {coaching.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-200">
                    <span className="mt-1 text-orange-500">⚠</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Priorities */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Target className="h-5 w-5 text-blue-400" />
              Prioritäten diese Woche
            </h3>
            <ol className="space-y-3">
              {coaching.priorities.map((priority, i) => (
                <li key={i} className="flex gap-3 text-slate-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-700 text-sm font-medium">
                    {i + 1}
                  </span>
                  <span>{priority}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Coaching Actions */}
          {coaching.coaching_actions.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Users className="h-5 w-5 text-purple-400" />
                Konkrete Coaching-Aktionen
              </h3>
              <div className="space-y-4">
                {coaching.coaching_actions.map((action, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-600 bg-slate-900/50 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-white">{action.target_name}</h4>
                      <span
                        className={clsx(
                          "rounded-full border px-2 py-1 text-xs font-medium",
                          getToneColor(action.tone_hint)
                        )}
                      >
                        {action.tone_hint}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{action.reason}</p>
                    <div className="h-px bg-slate-700" />
                    <p className="text-sm font-medium text-slate-200">
                      💡 Empfehlung: {action.suggested_action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Celebrations */}
          {coaching.celebrations.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-yellow-400">
                <Trophy className="h-5 w-5" />
                Feiern & Wertschätzen
              </h3>
              <ul className="space-y-2">
                {coaching.celebrations.map((celebration, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-200">
                    <span className="mt-1 text-yellow-500">🏆</span>
                    <span>{celebration}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Messages */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              Nachrichtenvorlagen
            </h3>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-white">An das gesamte Squad:</h4>
                  <button
                    onClick={() => handleCopy(coaching.suggested_messages.to_squad)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                  >
                    {copiedText === coaching.suggested_messages.to_squad ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="rounded-lg border border-slate-600 bg-slate-900/50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-200">
                    {coaching.suggested_messages.to_squad}
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-700" />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-white">An Underperformer (Vorlage):</h4>
                  <button
                    onClick={() => handleCopy(coaching.suggested_messages.to_underperformer_template)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                  >
                    {copiedText === coaching.suggested_messages.to_underperformer_template ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="rounded-lg border border-slate-600 bg-blue-950/30 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-200">
                    {coaching.suggested_messages.to_underperformer_template}
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-700" />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-white">An Top-Performer (Vorlage):</h4>
                  <button
                    onClick={() => handleCopy(coaching.suggested_messages.to_top_performer_template)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                  >
                    {copiedText === coaching.suggested_messages.to_top_performer_template ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="rounded-lg border border-slate-600 bg-green-950/30 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-200">
                    {coaching.suggested_messages.to_top_performer_template}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

