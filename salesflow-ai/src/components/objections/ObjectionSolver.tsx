/**
 * EINWAND-KILLER (Objection Solver) Component
 * Popover/Slide-over component that generates 3 personalized objection responses
 */

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  X,
  Loader2,
  Clipboard,
  CheckCircle2,
  Brain,
  Zap,
  Heart,
  TrendingUp,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { useObjectionSolver, type SolveObjectionParams } from "@/hooks/useObjectionSolver";
import { supabaseClient } from "@/lib/supabaseClient";
import clsx from "clsx";

// ============================================================================
// Types
// ============================================================================

interface ObjectionSolverProps {
  leadId: string | null;
  onClose: () => void;
  onMessageCopied?: (message: string) => void;
}

// Common objection categories
const OBJECTION_CATEGORIES = [
  { key: "price_too_high", label: "Zu teuer 💰", icon: TrendingUp },
  { key: "pyramid_scheme", label: "Pyramidenschema 📊", icon: AlertTriangle },
  { key: "no_time", label: "Keine Zeit ⏰", icon: Zap },
  { key: "spouse_decision", label: "Partner entscheidet 👥", icon: Heart },
  { key: "market_saturation", label: "Markt gesättigt 📉", icon: Brain },
  { key: "too_good_to_be_true", label: "Zu gut um wahr zu sein 🤔", icon: ShieldAlert },
];

// ============================================================================
// Main Component
// ============================================================================

export default function ObjectionSolver({
  leadId,
  onClose,
  onMessageCopied,
}: ObjectionSolverProps) {
  const [selectedObjection, setSelectedObjection] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    });
  }, []);

  // Query params for the hook
  const queryParams: SolveObjectionParams | null =
    selectedObjection && leadId && userId
      ? {
          objection_key: selectedObjection,
          lead_id: leadId,
          user_id: userId,
        }
      : null;

  // Fetch objection responses
  const { data, isLoading, error, responses, leadName, disgType } = useObjectionSolver(
    queryParams,
    {
      enabled: !!queryParams,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleObjectionSelect = (key: string) => {
    setSelectedObjection(key);
  };

  const handleCopyMessage = async (variant: "logical" | "emotional" | "provocative", message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(variant);
      setTimeout(() => setCopiedId(null), 2000);

      // Callback
      if (onMessageCopied) {
        onMessageCopied(message);
      }

      // Optional: Close modal after copy
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error("Copy failed:", err);
      alert("Konnte Nachricht nicht kopieren. Bitte manuell kopieren.");
    }
  };

  const handleReset = () => {
    setSelectedObjection(null);
    setCopiedId(null);
  };

  // ============================================================================
  // Render: Category Selection
  // ============================================================================

  if (!selectedObjection) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
        <div className="w-full max-w-2xl animate-in slide-in-from-bottom-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:slide-in-from-bottom-0">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">EINWAND-KILLER 🛡️</h2>
                <p className="text-sm text-slate-400">Wähle eine Einwand-Kategorie</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OBJECTION_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.key}
                  onClick={() => handleObjectionSelect(category.key)}
                  className="group flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-left transition-all hover:border-blue-500/50 hover:bg-slate-800"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400 group-hover:bg-blue-500/10 group-hover:text-blue-500">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-slate-200">{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: Results (3 Cards)
  // ============================================================================

  const cardConfig = [
    {
      key: "logical" as const,
      title: "The Logician 🧠",
      description: "Datenbasiert, ruhig, strukturiert",
      color: "blue",
      badge: disgType === "G" || disgType === "S" ? `Passt zu '${disgType}' Profil` : null,
    },
    {
      key: "emotional" as const,
      title: "The Empath ❤️",
      description: "Story-basiert, empathisch, persönlich",
      color: "purple",
      badge: disgType === "I" || disgType === "S" ? `Passt zu '${disgType}' Profil` : null,
    },
    {
      key: "provocative" as const,
      title: "The Challenger ⚡",
      description: "Direkt, provokant, herausfordernd",
      color: "orange",
      badge: disgType === "D" ? `Passt zu '${disgType}' Profil` : null,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-6xl animate-in slide-in-from-bottom-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:slide-in-from-bottom-0">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">3 Antwort-Strategien</h2>
            <p className="text-sm text-slate-400">
              {leadName && `Für ${leadName}`}
              {disgType && ` • DISG-Typ: ${disgType}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Zurück
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
              <p className="mt-4 text-slate-400">Generiere personalisierte Antworten...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <p className="mt-4 text-red-400">{error.message || "Fehler beim Generieren"}</p>
              <button
                onClick={handleReset}
                className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
              >
                Zurück
              </button>
            </div>
          </div>
        )}

        {/* Results: 3 Cards */}
        {!isLoading && !error && responses && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {cardConfig.map((config) => {
              const message = responses[config.key];
              const isCopied = copiedId === config.key;

              return (
                <div
                  key={config.key}
                  className={clsx(
                    "group relative overflow-hidden rounded-xl border p-5 transition-all",
                    config.color === "blue" &&
                      "border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40",
                    config.color === "purple" &&
                      "border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40",
                    config.color === "orange" &&
                      "border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40"
                  )}
                >
                  {/* Badge */}
                  {config.badge && (
                    <div className="mb-3">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          config.color === "blue" && "bg-blue-500/20 text-blue-400",
                          config.color === "purple" && "bg-purple-500/20 text-purple-400",
                          config.color === "orange" && "bg-orange-500/20 text-orange-400"
                        )}
                      >
                        {config.badge}
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <h3
                    className={clsx(
                      "mb-2 text-lg font-bold",
                      config.color === "blue" && "text-blue-400",
                      config.color === "purple" && "text-purple-400",
                      config.color === "orange" && "text-orange-400"
                    )}
                  >
                    {config.title}
                  </h3>
                  <p className="mb-4 text-sm text-slate-400">{config.description}</p>

                  {/* Message Content */}
                  <div className="mb-4 min-h-[120px] rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                    <p className="whitespace-pre-line text-sm text-slate-200">{message}</p>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopyMessage(config.key, message)}
                    className={clsx(
                      "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                      isCopied
                        ? "bg-green-500/20 text-green-400"
                        : clsx(
                            config.color === "blue" &&
                              "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
                            config.color === "purple" &&
                              "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
                            config.color === "orange" &&
                              "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                          )
                    )}
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Kopiert!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Kopieren & Schließen
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

