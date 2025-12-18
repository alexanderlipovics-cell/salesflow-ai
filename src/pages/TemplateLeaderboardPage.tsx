import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  Loader2,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  X,
} from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import type { TemplateLeaderboardEntry } from '@/types/templatePerformance';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type SortField = 'total_sent' | 'reply_rate' | 'meeting_rate' | 'success_rate' | 'response_rate';
type SortDirection = 'asc' | 'desc';

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Kürzt Text auf maxLength Zeichen und fügt "..." hinzu
 */
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Formatiert ein Datum als deutsches Format (dd.mm.yyyy)
 */
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Gibt eine Farbe basierend auf der Rate zurück (für visuelle Highlights)
 */
const getRateColor = (rate: number): string => {
  if (rate >= 30) return 'text-emerald-400';
  if (rate >= 15) return 'text-amber-400';
  return 'text-slate-400';
};

/**
 * Gibt ein Badge-Design für die Phase zurück
 */
const getPhaseDisplay = (phase: string | null): { label: string; color: string } => {
  switch (phase) {
    case 'cold_outreach':
      return { label: 'Cold Outreach', color: 'bg-blue-500/20 text-blue-400' };
    case 'follow_up':
      return { label: 'Follow-up', color: 'bg-amber-500/20 text-amber-400' };
    case 'reactivation':
      return { label: 'Reaktivierung', color: 'bg-purple-500/20 text-purple-400' };
    case 'closing':
      return { label: 'Closing', color: 'bg-emerald-500/20 text-emerald-400' };
    default:
      return { label: 'Unbekannt', color: 'bg-slate-500/20 text-slate-400' };
  }
};

/**
 * Gibt ein Icon für den Channel zurück
 */
const getChannelIcon = (channel: string | null) => {
  switch (channel) {
    case 'whatsapp':
      return '💬';
    case 'email':
      return '📧';
    case 'dm':
      return '📱';
    case 'phone':
      return '📞';
    default:
      return '📬';
  }
};

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function TemplateLeaderboardPage() {
  const [templates, setTemplates] = useState<TemplateLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('total_sent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // ─────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabaseClient
        .from('template_leaderboard')
        .select('*');

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setTemplates((data as TemplateLeaderboardEntry[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden der Daten';
      setError(message);
      console.error('Template Leaderboard Fehler:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // Sorting Logic
  // ─────────────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field: default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTemplates = [...templates].sort((a, b) => {
    const aValue = a[sortField] ?? 0;
    const bValue = b[sortField] ?? 0;
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // Summary Stats
  // ─────────────────────────────────────────────────────────────────

  const totalSent = templates.reduce((sum, t) => sum + t.total_sent, 0);
  const avgReplyRate = templates.length > 0
    ? templates.reduce((sum, t) => sum + (t.reply_rate || 0), 0) / templates.length
    : 0;
  const avgMeetingRate = templates.length > 0
    ? templates.reduce((sum, t) => sum + (t.meeting_rate || 0), 0) / templates.length
    : 0;
  const avgSuccessRate = templates.length > 0
    ? templates.reduce((sum, t) => sum + (t.success_rate || 0), 0) / templates.length
    : 0;

  // ─────────────────────────────────────────────────────────────────
  // Render: Loading State
  // ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="ml-3">Lade Template Performance...</span>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 pb-24 text-slate-50">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">📊 Template Performance</h1>
            <p className="text-sm text-slate-400">
              Welche Nachrichten performen am besten?
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchTemplates()}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Gesamt versendet"
          value={totalSent.toString()}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="⌀ Antwortrate"
          value={`${avgReplyRate.toFixed(1)}%`}
          color="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          icon={<Check className="h-5 w-5" />}
          label="⌀ Meeting-Rate"
          value={`${avgMeetingRate.toFixed(1)}%`}
          color="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="⌀ Success-Rate"
          value={`${avgSuccessRate.toFixed(1)}%`}
          color="bg-purple-500/10 text-purple-400"
        />
      </div>

      {/* Empty State */}
      {templates.length === 0 && !error && (
        <div className="mt-12 text-center text-slate-400">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <MessageSquare className="h-8 w-8 text-slate-600" />
          </div>
          <p className="text-lg">Noch keine Template-Daten vorhanden.</p>
          <p className="mt-2 text-sm text-slate-500">
            Sende Nachrichten mit Templates, um hier Performance-Stats zu sehen.
          </p>
        </div>
      )}

      {/* Template Table */}
      {templates.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    Template Preview
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    Phase
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    Channel
                  </th>
                  <SortableHeader
                    label="Versendet"
                    field="total_sent"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Antwortrate"
                    field="reply_rate"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Meeting-Rate"
                    field="meeting_rate"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Success-Rate"
                    field="success_rate"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Response-Rate"
                    field="response_rate"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                    Ergebnisse
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sortedTemplates.map((template) => (
                  <TemplateRow key={template.template_key} template={template} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <div className="text-xs font-medium text-slate-400">{label}</div>
          <div className="text-xl font-bold text-white">{value}</div>
        </div>
      </div>
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function SortableHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentField === field;

  return (
    <th
      onClick={() => onSort(field)}
      className="cursor-pointer px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-slate-300"
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          currentDirection === 'desc' ? (
            <ArrowDown className="h-3 w-3 text-emerald-400" />
          ) : (
            <ArrowUp className="h-3 w-3 text-emerald-400" />
          )
        )}
      </div>
    </th>
  );
}

interface TemplateRowProps {
  template: TemplateLeaderboardEntry;
}

function TemplateRow({ template }: TemplateRowProps) {
  const phaseDisplay = getPhaseDisplay(template.phase);
  const channelIcon = getChannelIcon(template.primary_channel);

  return (
    <tr className="transition hover:bg-slate-700/30">
      {/* Template Preview */}
      <td className="px-4 py-3">
        <div className="max-w-xs">
          <p className="text-sm text-slate-200" title={template.template_preview}>
            {truncateText(template.template_preview, 50)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDate(template.first_used)} - {formatDate(template.last_used)}
          </p>
        </div>
      </td>

      {/* Phase */}
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${phaseDisplay.color}`}>
          {phaseDisplay.label}
        </span>
      </td>

      {/* Channel */}
      <td className="px-4 py-3">
        <span className="text-lg" title={template.primary_channel || 'Unbekannt'}>
          {channelIcon}
        </span>
      </td>

      {/* Total Sent */}
      <td className="px-4 py-3">
        <span className="text-sm font-bold text-white">{template.total_sent}</span>
      </td>

      {/* Reply Rate */}
      <td className="px-4 py-3">
        <span className={`text-sm font-bold ${getRateColor(template.reply_rate || 0)}`}>
          {template.reply_rate?.toFixed(1) || 0}%
        </span>
      </td>

      {/* Meeting Rate */}
      <td className="px-4 py-3">
        <span className={`text-sm font-bold ${getRateColor(template.meeting_rate || 0)}`}>
          {template.meeting_rate?.toFixed(1) || 0}%
        </span>
      </td>

      {/* Success Rate */}
      <td className="px-4 py-3">
        <span className={`text-sm font-bold ${getRateColor(template.success_rate || 0)}`}>
          {template.success_rate?.toFixed(1) || 0}%
        </span>
      </td>

      {/* Response Rate */}
      <td className="px-4 py-3">
        <span className={`text-sm font-bold ${getRateColor(template.response_rate || 0)}`}>
          {template.response_rate?.toFixed(1) || 0}%
        </span>
      </td>

      {/* Results Breakdown */}
      <td className="px-4 py-3">
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1" title="Antworten">
            <MessageSquare className="h-3 w-3 text-emerald-400" />
            <span className="text-slate-300">{template.replies}</span>
          </div>
          <div className="flex items-center gap-1" title="Meetings">
            <Check className="h-3 w-3 text-amber-400" />
            <span className="text-slate-300">{template.meetings}</span>
          </div>
          <div className="flex items-center gap-1" title="Keine Antwort">
            <X className="h-3 w-3 text-slate-500" />
            <span className="text-slate-500">{template.no_responses}</span>
          </div>
        </div>
      </td>
    </tr>
  );
}

