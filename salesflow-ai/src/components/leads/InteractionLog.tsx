/**
 * InteractionLog Component
 * 
 * Zeigt eine Timeline aller Interaktionen für einen Lead.
 */

import { useEffect, useState } from 'react';
import { Loader2, ChevronDown, Calendar, Clock } from 'lucide-react';
import { useInteractionLog } from '@/hooks/useInteractionLog';
import {
  INTERACTION_TYPE_ICONS,
  INTERACTION_TYPE_LABELS,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
  OUTCOME_COLORS,
  type LeadInteraction,
  type InteractionOutcome,
} from '@/types/interactions';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface InteractionLogProps {
  leadId: string;
  initialLimit?: number;
  showLoadMore?: boolean;
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return formatDate(dateString);
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// ─────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: InteractionOutcome }) {
  const colors = OUTCOME_COLORS[outcome];
  const label = OUTCOME_LABELS[outcome];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}
    >
      {label}
    </span>
  );
}

function InteractionCard({
  interaction,
  compact = false,
}: {
  interaction: LeadInteraction;
  compact?: boolean;
}) {
  const icon = INTERACTION_TYPE_ICONS[interaction.type];
  const typeLabel = INTERACTION_TYPE_LABELS[interaction.type];
  const channelLabel = CHANNEL_LABELS[interaction.channel];

  return (
    <div className="relative flex gap-4">
      {/* Timeline Line */}
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-lg">
          {icon}
        </div>
        <div className="w-px flex-1 bg-slate-700" />
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${compact ? 'pb-4' : 'pb-6'}`}>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          {/* Header */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{typeLabel}</span>
              <span className="text-xs text-slate-500">via {channelLabel}</span>
            </div>
            {interaction.outcome && <OutcomeBadge outcome={interaction.outcome} />}
          </div>

          {/* Summary */}
          {interaction.summary && (
            <p className="mb-3 text-sm leading-relaxed text-slate-300">
              {interaction.summary}
            </p>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatRelativeTime(interaction.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatTime(interaction.created_at)}</span>
            </div>
            {interaction.duration_seconds && (
              <span className="rounded bg-slate-700 px-2 py-0.5">
                ⏱️ {formatDuration(interaction.duration_seconds)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export function InteractionLog({
  leadId,
  initialLimit = 10,
  showLoadMore = true,
  compact = false,
}: InteractionLogProps) {
  const { interactions, loading, error, fetchInteractions } = useInteractionLog();
  const [limit, setLimit] = useState(initialLimit);
  const [hasMore, setHasMore] = useState(true);

  // Initiales Laden
  useEffect(() => {
    fetchInteractions(leadId, limit);
  }, [leadId, limit, fetchInteractions]);

  // Prüfen ob mehr Einträge vorhanden sind
  useEffect(() => {
    setHasMore(interactions.length === limit);
  }, [interactions.length, limit]);

  const handleLoadMore = () => {
    setLimit((prev) => prev + 10);
  };

  // ─────────────────────────────────────────────────────────────────
  // Render: Loading State
  // ─────────────────────────────────────────────────────────────────

  if (loading && interactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Lade Interaktionen...</span>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Render: Error State
  // ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
        {error}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Render: Empty State
  // ─────────────────────────────────────────────────────────────────

  if (interactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-700">
          <span className="text-xl">📋</span>
        </div>
        <p className="text-slate-400">Noch keine Interaktionen</p>
        <p className="mt-1 text-xs text-slate-500">
          Logge deinen ersten Kontakt mit diesem Lead.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Render: Timeline
  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Timeline */}
      <div className="space-y-0">
        {interactions.map((interaction) => (
          <InteractionCard
            key={interaction.id}
            interaction={interaction}
            compact={compact}
          />
        ))}
      </div>

      {/* Load More Button */}
      {showLoadMore && hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Mehr laden
          </button>
        </div>
      )}
    </div>
  );
}

export default InteractionLog;

