/**
 * TEAM-CHIEF Demo & Testing Component
 * Interactive testing interface for AI squad coaching
 */
import React, { useState } from "react";
import {
  Brain,
  Play,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Target,
  Users,
  MessageSquare,
  Trophy,
  Loader2,
  Copy,
  CheckCircle,
} from "lucide-react";
import { TEST_SCENARIOS, ScenarioType } from "@/data/testScenarios";
import { TeamChiefOutput } from "@/types/teamChief";
import { validateInput, validateOutput, scoreOutput } from "@/utils/teamChiefValidation";
import { supabaseClient } from "@/lib/supabaseClient";
import clsx from "clsx";

export const TeamChiefDemo: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>("balanced");
  const [output, setOutput] = useState<TeamChiefOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [quality, setQuality] = useState<any>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const scenario = TEST_SCENARIOS[selectedScenario];

  const runCoaching = async () => {
    setLoading(true);
    setError(null);
    setValidationErrors([]);
    setQuality(null);
    setOutput(null);

    try {
      // Validate input
      const inputValidation = validateInput(scenario.data);
      if (!inputValidation.valid) {
        setValidationErrors(inputValidation.errors);
        throw new Error("Input validation failed");
      }

      // Get auth token
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

      // Call API with test input data directly (for testing)
      const response = await fetch(`${API_BASE_URL}/api/squad/coach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          squad_id: scenario.data.squad.id,
          test_input: scenario.data, // Send test data directly
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Validate output
      const outputValidation = validateOutput(data);
      if (!outputValidation.valid) {
        setValidationErrors(outputValidation.errors);
        console.warn("Output validation issues:", outputValidation.errors);
      }

      // Score quality
      const qualityScore = scoreOutput(data);
      setQuality(qualityScore);

      setOutput(data);
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
      case "ermutigend":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6 p-6 min-h-screen bg-slate-900 text-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">TEAM-CHIEF Demo & Testing</h2>
            <p className="text-sm text-slate-400">
              Test AI Coaching mit verschiedenen Squad-Szenarien
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Szenario auswählen</h3>
        <div className="space-y-4">
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value as ScenarioType)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            {Object.values(TEST_SCENARIOS).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="rounded-lg border border-slate-600 bg-slate-900/50 p-4">
            <h4 className="mb-2 font-semibold text-white">{scenario.name}</h4>
            <p className="mb-3 text-sm text-slate-400">{scenario.description}</p>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div>
                <span className="text-slate-500">Squad:</span> {scenario.data.squad.name}
              </div>
              <div>
                <span className="text-slate-500">Leader:</span> {scenario.data.leader.name}
              </div>
              <div>
                <span className="text-slate-500">Members:</span> {scenario.data.summary.member_count}
              </div>
              <div>
                <span className="text-slate-500">Aktiv:</span> {scenario.data.summary.active_members}
              </div>
              <div>
                <span className="text-slate-500">Punkte:</span> {scenario.data.summary.total_points} / {scenario.data.challenge.target_points}
              </div>
              <div>
                <span className="text-slate-500">Kontakte:</span> {scenario.data.summary.total_contacts}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-slate-400">Erwarteter Fokus:</p>
              <ul className="space-y-1 text-xs text-slate-300">
                {scenario.expected_focus.map((focus, i) => (
                  <li key={i}>• {focus}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={runCoaching}
            disabled={loading}
            className="w-full rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysiere Squad...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Play className="h-4 w-4" />
                Coaching starten
              </span>
            )}
          </button>

          {validationErrors.length > 0 && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
              <div className="mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                <p className="font-semibold">Validierungsfehler:</p>
              </div>
              <ul className="space-y-1 text-xs">
                {validationErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quality Score */}
      {quality && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Output Quality Score
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-green-500">{quality.score}/100</div>
              <div className="flex-1">
                <div className="h-4 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full bg-green-600 transition-all"
                    style={{ width: `${quality.score}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              {Object.entries(quality.breakdown).map(([key, score]) => (
                <div key={key} className="rounded-lg border border-slate-600 bg-slate-900/50 p-2">
                  <div className="text-xs capitalize text-slate-400">{key}</div>
                  <div className="text-lg font-bold text-white">{score as number}/20</div>
                </div>
              ))}
            </div>

            {quality.feedback.length > 0 && (
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-300">Feedback:</p>
                {quality.feedback.map((fb: string, i: number) => (
                  <p key={i} className="text-slate-400">• {fb}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Output Display */}
      {output && (
        <div className="space-y-6">
          {/* Tabs Navigation */}
          <div className="flex gap-2 border-b border-slate-700">
            {["overview", "actions", "messages", "raw"].map((tab) => (
              <button
                key={tab}
                className={clsx(
                  "px-4 py-2 text-sm font-medium capitalize transition-colors",
                  "border-b-2 border-transparent hover:border-purple-500 hover:text-purple-400"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
                <Brain className="h-5 w-5 text-purple-400" />
                Zusammenfassung
              </h3>
              <p className="leading-relaxed text-slate-200">{output.summary}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Highlights */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-400">
                  <TrendingUp className="h-5 w-5" />
                  Was läuft gut
                </h3>
                <ul className="space-y-2">
                  {output.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-200">
                      <span className="mt-1 text-green-500">✓</span>
                      <span className="text-sm">{h}</span>
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
                  {output.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-200">
                      <span className="mt-1 text-orange-500">⚠</span>
                      <span className="text-sm">{r}</span>
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
                {output.priorities.map((p, i) => (
                  <li key={i} className="flex gap-3 text-slate-200">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-700 text-sm font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm">{p}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Celebrations */}
            {output.celebrations.length > 0 && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-yellow-400">
                  <Trophy className="h-5 w-5" />
                  Feiern & Wertschätzen
                </h3>
                <ul className="space-y-2">
                  {output.celebrations.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-200">
                      <span className="mt-1 text-yellow-500">🏆</span>
                      <span className="text-sm">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Coaching Actions */}
          {output.coaching_actions.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Users className="h-5 w-5 text-purple-400" />
                Konkrete Coaching-Aktionen ({output.coaching_actions.length})
              </h3>
              <div className="space-y-4">
                {output.coaching_actions.map((action, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-600 bg-slate-900/50 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-white">
                        {action.target_type === "squad" ? "👥" : "👤"} {action.target_name}
                      </h4>
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
                    <div className="rounded-md bg-blue-950/50 border border-blue-500/20 p-3">
                      <p className="mb-1 text-xs font-semibold text-blue-400">💡 Empfehlung:</p>
                      <p className="text-sm text-blue-300">{action.suggested_action}</p>
                    </div>
                  </div>
                ))}
              </div>
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
                  <h4 className="font-semibold text-white">👥 An das gesamte Squad</h4>
                  <button
                    onClick={() => handleCopy(output.suggested_messages.to_squad)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                  >
                    {copiedText === output.suggested_messages.to_squad ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="rounded-lg border border-slate-600 bg-slate-900/50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-200">
                    {output.suggested_messages.to_squad}
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-700" />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-white">⚠️ An Underperformer (Template)</h4>
                  <button
                    onClick={() => handleCopy(output.suggested_messages.to_underperformer_template)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                  >
                    {copiedText === output.suggested_messages.to_underperformer_template ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="rounded-lg border border-slate-600 bg-blue-950/30 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-200">
                    {output.suggested_messages.to_underperformer_template}
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-700" />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-white">🌟 An Top-Performer (Template)</h4>
                  <button
                    onClick={() => handleCopy(output.suggested_messages.to_top_performer_template)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                  >
                    {copiedText === output.suggested_messages.to_top_performer_template ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="rounded-lg border border-slate-600 bg-green-950/30 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-200">
                    {output.suggested_messages.to_top_performer_template}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Raw JSON */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Raw JSON Output</h3>
            <div className="space-y-2">
              <pre className="max-h-96 overflow-auto rounded-lg border border-slate-600 bg-slate-900/50 p-4 text-xs text-slate-200">
                {JSON.stringify(output, null, 2)}
              </pre>
              <button
                onClick={() => handleCopy(JSON.stringify(output, null, 2))}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                {copiedText === JSON.stringify(output, null, 2) ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Copy className="h-3 w-3" />
                    Copy JSON
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

