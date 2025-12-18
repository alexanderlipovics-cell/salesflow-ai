/**
 * Follow-Up Block - Fällige Follow-ups
 * 
 * Zeigt alle fälligen Follow-ups mit Actions
 */

import React from "react";
import { MessageCircle, Clock, AlertTriangle, CheckCircle2, SkipForward, Copy } from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type FollowUpTask = {
  status_id: string;
  lead_id: string;
  lead_name: string | null;
  current_step_code: string;
  next_follow_up_at: string;
  days_overdue: number;
  message_template?: string | null;
};

interface FollowUpBlockProps {
  followups: FollowUpTask[];
  loading?: boolean;
  onComplete: (statusId: string) => void;
  onSkip: (statusId: string) => void;
  onCopyMessage?: (message: string) => void;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export const FollowUpBlock: React.FC<FollowUpBlockProps> = ({
  followups,
  loading,
  onComplete,
  onSkip,
  onCopyMessage,
}) => {
  const getStepLabel = (stepCode: string): string => {
    const labels: Record<string, string> = {
      initial_contact: "Erstkontakt",
      fu_1_bump: "Follow-up 1",
      fu_2_value: "Follow-up 2",
      fu_3_decision: "Follow-up 3",
      fu_4_last_touch: "Follow-up 4",
      rx_1_update: "Reaktivierung 1",
      rx_2_value_asset: "Reaktivierung 2",
      rx_3_yearly_checkin: "Jahres-Check",
      rx_loop_checkin: "Loop Check-in",
    };
    return labels[stepCode] || stepCode;
  };

  const handleCopyMessage = (followup: FollowUpTask) => {
    if (followup.message_template && onCopyMessage) {
      onCopyMessage(followup.message_template);
    }
  };

  const sortedFollowups = [...followups].sort((a, b) => b.days_overdue - a.days_overdue);
  const hasWarning = followups.length > 20;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-100">Follow-ups fällig</h3>
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-700/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            hasWarning ? "bg-amber-500/10" : "bg-emerald-500/10"
          }`}>
            <MessageCircle className={`h-5 w-5 ${hasWarning ? "text-amber-400" : "text-emerald-400"}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Follow-ups fällig</h3>
            <p className="text-xs text-slate-400">{followups.length} warten auf dich</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${hasWarning ? "text-amber-400" : "text-emerald-400"}`}>
            {followups.length}
          </p>
        </div>
      </div>

      {/* Warning wenn zu viele */}
      {hasWarning && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-200">Fokus - Du hast einen Berg vor dir</p>
            <p className="mt-1 text-xs text-amber-300/80">
              Arbeite die überfälligsten zuerst ab. Jeden Follow-up den du erledigst, bringt dich näher ans Ziel.
            </p>
          </div>
        </div>
      )}

      {/* Follow-ups */}
      {followups.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-600 bg-slate-900/50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-2 text-sm font-medium text-emerald-400">Alle Follow-ups erledigt!</p>
          <p className="text-xs text-slate-500">Zeit für neue Kontakte</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sortedFollowups.slice(0, 10).map((followup) => {
            const isOverdue = followup.days_overdue > 0;
            const isUrgent = followup.days_overdue > 3;

            return (
              <div
                key={followup.status_id}
                className={`rounded-lg border p-4 transition ${
                  isUrgent
                    ? "border-red-500/30 bg-red-500/5"
                    : isOverdue
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-slate-700 bg-slate-900/50"
                }`}
              >
                {/* Lead Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-200">
                      {followup.lead_name || "Unbekannter Lead"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-slate-300">
                        {getStepLabel(followup.current_step_code)}
                      </span>
                      {isOverdue && (
                        <span className={`flex items-center gap-1 ${
                          isUrgent ? "text-red-400" : "text-amber-400"
                        }`}>
                          <Clock className="h-3 w-3" />
                          {followup.days_overdue} Tag{followup.days_overdue > 1 ? "e" : ""} überfällig
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {followup.message_template && onCopyMessage && (
                    <button
                      onClick={() => handleCopyMessage(followup)}
                      className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Nachricht kopieren
                    </button>
                  )}
                  <button
                    onClick={() => onComplete(followup.status_id)}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-emerald-400"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Erledigt
                  </button>
                  <button
                    onClick={() => onSkip(followup.status_id)}
                    className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-700"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    Skip
                  </button>
                </div>
              </div>
            );
          })}

          {/* Mehr anzeigen */}
          {followups.length > 10 && (
            <p className="text-center text-xs text-slate-500">
              ... und {followups.length - 10} weitere
            </p>
          )}
        </div>
      )}
    </div>
  );
};

