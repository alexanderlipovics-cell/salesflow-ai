/**
 * Hunter Block - Neue Leads laden
 * 
 * CTA-Box die anzeigt wie viele neue Kontakte noch benötigt werden
 */

import React from "react";
import { Target, TrendingUp, Zap } from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface HunterBlockProps {
  needed: number;
  onLoadMore: () => void;
  loading?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export const HunterBlock: React.FC<HunterBlockProps> = ({ needed, onLoadMore, loading }) => {
  if (needed <= 0) {
    // Kein Bedarf - zeige Erfolgs-Message
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
            <Target className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-emerald-400">Läuft bei dir!</h3>
            <p className="mt-1 text-sm text-slate-300">
              Du hast genug Kontakte für heute. Konzentriere dich auf deine Follow-ups und Termine.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
          <Zap className="h-6 w-6 text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-400">Neue Kontakte benötigt</h3>
          <p className="mt-1 text-sm text-slate-300">
            Du brauchst noch <span className="font-bold text-amber-400">{needed} neue Kontakte</span> um im Plan zu bleiben.
          </p>
        </div>
      </div>

      {/* Motivation */}
      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 flex-shrink-0 text-emerald-400" />
          <div className="text-xs text-slate-300">
            <p className="font-medium">Warum ist das wichtig?</p>
            <p className="mt-1 text-slate-400">
              Neue Kontakte sind der Motor für künftige Abschlüsse. Je mehr du heute säst, desto mehr kannst du in den kommenden Wochen ernten.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={onLoadMore}
        disabled={loading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-orange-400 disabled:opacity-50"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
            Lade...
          </>
        ) : (
          <>
            <Target className="h-4 w-4" />
            Neue Leads laden
          </>
        )}
      </button>

      {/* Tipp */}
      <p className="mt-3 text-center text-xs text-slate-500">
        Tipp: Nutze den Lead-Hunter oder importiere neue Kontakte
      </p>
    </div>
  );
};

