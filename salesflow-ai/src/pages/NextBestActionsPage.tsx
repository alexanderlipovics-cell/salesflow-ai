/**
 * Next Best Actions Page
 * 
 * KI-gestützte Priorisierung aller offenen Tasks.
 * Zeigt die 5-15 wichtigsten Aufgaben mit Score und Begründung.
 */

import { AlertTriangle, Loader2, Target, RefreshCw, ArrowRight } from 'lucide-react';
import { useNextBestActions } from '@/hooks/useNextBestActions';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function NextBestActionsPage() {
  const { loading, error, actions, refetch } = useNextBestActions();
  const navigate = useNavigate();

  // Format DateTime
  const formatDateTime = (iso: string | null) => {
    if (!iso) return 'kein Fälligkeitsdatum';
    const d = new Date(iso);
    return `${d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })} ${d.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  // Task Type Label
  const getTaskTypeLabel = (type: string): string => {
    if (type === 'follow_up') return 'Follow-up';
    if (type === 'hunter') return 'Hunter';
    if (type === 'field_ops') return 'Field Ops';
    return type.replace('_', ' ');
  };

  // Score Color
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-red-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-emerald-400';
  };

  // Score Badge Color
  const getScoreBadgeColor = (score: number): string => {
    if (score >= 80) return 'bg-red-500/10 border-red-500/30';
    if (score >= 60) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-emerald-500/10 border-emerald-500/30';
  };

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 pb-24 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* Header */}
        {/* ───────────────────────────────────────────────────────────── */}

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Nächste beste Aktionen</h1>
                <p className="text-sm text-slate-400">
                  KI-priorisierte Aufgaben – deine smarteste To-do-Liste.
                </p>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium transition hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Neu berechnen
          </button>
        </div>

        {/* Info Banner */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-400">
            💡 <strong>KI-Priorisierung:</strong> Deine Tasks werden nach Dringlichkeit,
            Potenzial und Momentum bewertet. Fokussiere dich auf die Top-Aufgaben!
          </p>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Loading State */}
        {/* ───────────────────────────────────────────────────────────── */}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
            <p className="mt-4 text-sm text-slate-400">
              KI bewertet gerade deine offenen Tasks …
            </p>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Error State */}
        {/* ───────────────────────────────────────────────────────────── */}

        {error && !loading && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Fehler</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Empty State */}
        {/* ───────────────────────────────────────────────────────────── */}

        {!loading && !error && actions.length === 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center">
            <Target className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-300">
              Aktuell keine offenen Aufgaben
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Sobald du offene Tasks hast, priorisiert die KI sie hier für dich. 🎯
            </p>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Actions List */}
        {/* ───────────────────────────────────────────────────────────── */}

        {!loading && actions.length > 0 && (
          <div className="space-y-4">
            {actions.map((action, index) => (
              <ActionCard
                key={action.task_id}
                action={action}
                rank={index + 1}
                onNavigate={navigate}
                getTaskTypeLabel={getTaskTypeLabel}
                formatDateTime={formatDateTime}
                getScoreColor={getScoreColor}
                getScoreBadgeColor={getScoreBadgeColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────

interface ActionCardProps {
  action: ReturnType<typeof useNextBestActions>['actions'][0];
  rank: number;
  onNavigate: (path: string) => void;
  getTaskTypeLabel: (type: string) => string;
  formatDateTime: (iso: string | null) => string;
  getScoreColor: (score: number) => string;
  getScoreBadgeColor: (score: number) => string;
}

function ActionCard({
  action,
  rank,
  onNavigate,
  getTaskTypeLabel,
  formatDateTime,
  getScoreColor,
  getScoreBadgeColor,
}: ActionCardProps) {
  const handleOpenTask = () => {
    if (action.task_type === 'follow_up') {
      onNavigate('/follow-ups');
    } else if (action.task_type === 'hunter') {
      onNavigate('/hunter');
    } else {
      onNavigate('/daily-command');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 transition hover:border-slate-600">
      <div className="flex items-start gap-4">
        {/* Rank Badge */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-lg font-bold text-emerald-400">
          {rank}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Task Type & Lead Name */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {getTaskTypeLabel(action.task_type)}
            </span>
            <span className="text-xs text-slate-600">•</span>
            <span className="text-base font-semibold text-slate-100">
              {action.lead_name || 'Unbekannter Lead'}
            </span>
          </div>

          {/* Due Date & Timeframe */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>Fällig: {formatDateTime(action.due_at)}</span>
            {action.recommended_timeframe && (
              <>
                <span>•</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                  Empfehlung: {action.recommended_timeframe}
                </span>
              </>
            )}
          </div>

          {/* Label */}
          <p className="mt-3 text-sm font-medium text-slate-200">{action.label}</p>

          {/* Reason */}
          <p className="mt-1 text-sm text-slate-400">{action.reason}</p>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleOpenTask}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-emerald-400"
            >
              Aktion öffnen
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Score Badge */}
        <div className={`flex flex-col items-center rounded-lg border p-3 ${getScoreBadgeColor(action.score)}`}>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Priorität
          </p>
          <p className={`mt-1 text-3xl font-bold ${getScoreColor(action.score)}`}>
            {Math.round(action.score)}
          </p>
        </div>
      </div>
    </div>
  );
}

