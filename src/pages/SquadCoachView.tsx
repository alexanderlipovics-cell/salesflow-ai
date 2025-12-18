// pages/SquadCoachView.tsx

import React, { useEffect, useState } from 'react';
import { 
  RefreshCw, 
  Copy, 
  Check, 
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Target,
  Users,
  MessageSquare,
  Trophy
} from 'lucide-react';
import { useSquadCoach } from '../hooks/useSquadCoach';
import { SquadCoachSkeleton } from '../components/SquadCoachSkeleton';
import { EmptyState } from '../components/EmptyState';
import { CoachingAction } from '../types/squadCoach';

export const SquadCoachView: React.FC = () => {
  const { data, loadingState, error, refresh, clearError } = useSquadCoach();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  // Handle refresh button
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };
  
  // Handle copy to clipboard
  const handleCopy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(null), 3000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(null), 3000);
    }
  };
  
  // Get tone badge color
  const getToneBadgeColor = (tone: string | null | undefined): string => {
    switch (tone) {
      case 'empathisch':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'klar':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case 'motiviert':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'fordernd':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
      case 'ermutigend':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };
  
  // Loading state
  if (loadingState === 'loading' && !data) {
    return <SquadCoachSkeleton />;
  }
  
  // Error state
  if (loadingState === 'error' && !data) {
    return (
      <div className="p-4 sm:p-6">
        <div 
          role="alert"
          className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              Fehler beim Laden
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md text-sm font-medium transition-colors"
          aria-label="Erneut versuchen"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Lädt...' : 'Noch einmal versuchen'}
        </button>
      </div>
    );
  }
  
  // No data state
  if (!data) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState type="no-data" />
      </div>
    );
  }
  
  const { 
    summary, 
    highlights, 
    risks, 
    priorities, 
    coaching_actions, 
    celebrations, 
    suggested_messages 
  } = data;
  
  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Squad-Coach
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Kurzanalyse & konkrete Coaching-Aktionen für dein Team
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 rounded-md text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
          aria-label="Daten aktualisieren"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Aktualisieren</span>
        </button>
      </div>
      
      {/* Copy success toast */}
      {copiedItem && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 z-50"
        >
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">
            "{copiedItem}" kopiert
          </span>
        </div>
      )}
      
      {/* Summary */}
      <section 
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 shadow-sm"
        aria-labelledby="summary-heading"
      >
        <h2 
          id="summary-heading"
          className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"
        >
          <Target className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          Zusammenfassung
        </h2>
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
          {summary}
        </p>
        
        <div className="mt-6 grid gap-4 sm:gap-6 sm:grid-cols-2">
          {/* Highlights */}
          <div>
            <h3 className="mb-2 text-xs sm:text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Highlights
            </h3>
            {highlights.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
                Keine Highlights angegeben.
              </p>
            ) : (
              <ul className="space-y-2" role="list">
                {highlights.map((h, idx) => (
                  <li 
                    key={idx}
                    className="flex gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Risks */}
          <div>
            <h3 className="mb-2 text-xs sm:text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risiken
            </h3>
            {risks.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
                Keine Risiken angegeben.
              </p>
            ) : (
              <ul className="space-y-2" role="list">
                {risks.map((r, idx) => (
                  <li 
                    key={idx}
                    className="flex gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
      
      {/* Priorities */}
      <section 
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 shadow-sm"
        aria-labelledby="priorities-heading"
      >
        <h2 
          id="priorities-heading"
          className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"
        >
          <Target className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          Prioritäten diese Woche
        </h2>
        {priorities.length === 0 ? (
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
            Keine Prioritäten definiert.
          </p>
        ) : (
          <ol className="space-y-3" role="list">
            {priorities.map((p, idx) => (
              <li 
                key={idx}
                className="flex gap-3 text-sm sm:text-base text-gray-700 dark:text-gray-300"
              >
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  {idx + 1}
                </span>
                <span className="flex-1">{p}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      
      {/* Coaching Actions */}
      <section 
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 shadow-sm"
        aria-labelledby="actions-heading"
      >
        <h2 
          id="actions-heading"
          className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
        >
          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          Konkrete Coaching-Aktionen
        </h2>
        {coaching_actions.length === 0 ? (
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
            Keine spezifischen Coaching-Aktionen vorgeschlagen.
          </p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {coaching_actions.map((action, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {action.target_type === 'squad' 
                      ? '👥 Squad' 
                      : `👤 ${action.target_name}`}
                  </span>
                  {action.tone_hint && (
                    <span 
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${getToneBadgeColor(action.tone_hint)}`}
                    >
                      Ton: {action.tone_hint}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-medium">Grund:</span> {action.reason}
                </p>
                <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    💡 Empfehlung:
                  </p>
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 whitespace-pre-line">
                    {action.suggested_action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Celebrations */}
      <section 
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 shadow-sm"
        aria-labelledby="celebrations-heading"
      >
        <h2 
          id="celebrations-heading"
          className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"
        >
          <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          Wen solltest du feiern?
        </h2>
        {celebrations.length === 0 ? (
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
            Keine speziellen Empfehlungen.
          </p>
        ) : (
          <ul className="space-y-2" role="list">
            {celebrations.map((c, idx) => (
              <li 
                key={idx}
                className="flex gap-2 text-sm sm:text-base text-gray-700 dark:text-gray-300"
              >
                <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">🏆</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      
      {/* Message Templates */}
      <section 
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 shadow-sm"
        aria-labelledby="messages-heading"
      >
        <h2 
          id="messages-heading"
          className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
        >
          <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          Nachrichten-Vorlagen
        </h2>
        <div className="space-y-4">
          {/* Squad message */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                👥 An Squad
              </h3>
              <button
                type="button"
                onClick={() => handleCopy('Squad-Nachricht', suggested_messages.to_squad)}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                aria-label="Squad-Nachricht kopieren"
              >
                {copiedItem === 'Squad-Nachricht' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Kopiert
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </>
                )}
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
              {suggested_messages.to_squad}
            </p>
          </div>
          
          {/* Underperformer template */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                ⚠️ Unterperformer (1:1)
              </h3>
              <button
                type="button"
                onClick={() => handleCopy('Unterperformer-Template', suggested_messages.to_underperformer_template)}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                aria-label="Unterperformer-Template kopieren"
              >
                {copiedItem === 'Unterperformer-Template' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Kopiert
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </>
                )}
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
              {suggested_messages.to_underperformer_template}
            </p>
          </div>
          
          {/* Top performer template */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                🌟 Top-Performer (1:1)
              </h3>
              <button
                type="button"
                onClick={() => handleCopy('Top-Performer-Template', suggested_messages.to_top_performer_template)}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                aria-label="Top-Performer-Template kopieren"
              >
                {copiedItem === 'Top-Performer-Template' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Kopiert
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </>
                )}
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
              {suggested_messages.to_top_performer_template}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

