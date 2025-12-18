import { useState, useEffect } from 'react';
import { AlertTriangle, BarChart3, Brain, Loader2, Sparkles, Copy, Save, X, Check } from 'lucide-react';
import { useObjectionAnalytics } from '@/hooks/useObjectionAnalytics';
import type { ObjectionAnalyticsBucket } from '@/hooks/useObjectionAnalytics';
import { useObjectionPlaySuggestion } from '@/hooks/useObjectionPlaySuggestion';

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function ObjectionAnalyticsPage() {
  const [days, setDays] = useState(7);
  const { loading, error, summary } = useObjectionAnalytics(days);

  // Playbook-Suggestor State
  const [selectedObjectionKey, setSelectedObjectionKey] = useState<string | null>(null);
  const [selectedObjectionLabel, setSelectedObjectionLabel] = useState<string | null>(null);
  const [selectedObjectionCount, setSelectedObjectionCount] = useState<number>(0);

  const {
    loading: playLoading,
    saving: playSaving,
    error: playError,
    suggestion,
    runSuggestion,
    saveAsTemplate,
    reset: resetPlay,
  } = useObjectionPlaySuggestion();

  // Format Date Helper
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Handler: KI-Play vorschlagen
  const handleSuggestPlay = (bucket: ObjectionAnalyticsBucket) => {
    setSelectedObjectionKey(bucket.key);
    setSelectedObjectionLabel(bucket.label ?? bucket.key);
    setSelectedObjectionCount(bucket.count);
    
    // KI-Vorschlag generieren
    runSuggestion({
      vertical: null, // oder optional ein Default
      objectionText: bucket.key,
      context: `Top-Einwand der letzten ${days} Tage mit ${bucket.count} Vorkommen.`,
    });
  };

  // Handler: Panel schließen
  const handleClosePanel = () => {
    resetPlay();
    setSelectedObjectionKey(null);
    setSelectedObjectionLabel(null);
    setSelectedObjectionCount(0);
  };

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 pb-24 text-slate-50">
      {/* Container */}
      <div className="mx-auto max-w-5xl space-y-8">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* Header */}
        {/* ───────────────────────────────────────────────────────────── */}

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Einwände – Analytics</h1>
                <p className="text-sm text-slate-400">
                  Top-Einwände der letzten {days} Tage für dein Team
                </p>
              </div>
            </div>

            {/* Zeitraum-Anzeige */}
            {summary && (
              <p className="mt-3 text-xs text-slate-500">
                Zeitraum: {formatDate(summary.from)} – {formatDate(summary.to)}
              </p>
            )}
          </div>

          {/* Zeitraum-Umschalter */}
          <div className="flex gap-2">
            <button
              onClick={() => setDays(7)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                days === 7
                  ? 'bg-emerald-500 text-white'
                  : 'border border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              7 Tage
            </button>
            <button
              onClick={() => setDays(30)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                days === 30
                  ? 'bg-emerald-500 text-white'
                  : 'border border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              30 Tage
            </button>
            <button
              onClick={() => setDays(90)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                days === 90
                  ? 'bg-emerald-500 text-white'
                  : 'border border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              90 Tage
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Loading State */}
        {/* ───────────────────────────────────────────────────────────── */}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
            <p className="mt-4 text-sm text-slate-400">
              Lade Einwände-Statistiken …
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
                <p className="font-medium">Fehler beim Laden der Daten</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Empty State */}
        {/* ───────────────────────────────────────────────────────────── */}

        {summary && summary.totalSessions === 0 && !loading && (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center">
            <Brain className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-300">
              Noch keine Einwände im System
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Sobald du Objection Brain nutzt, siehst du hier deine Statistiken.
            </p>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Content Sections */}
        {/* ───────────────────────────────────────────────────────────── */}

        {summary && summary.totalSessions > 0 && !loading && (
          <>
            {/* Gesamt-Statistik */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Gesamt-Einwände</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-400">
                    {summary.totalSessions}
                  </p>
                </div>
                <Brain className="h-10 w-10 text-emerald-500/30" />
              </div>
            </div>

            {/* Top-Einwände dieser Woche */}
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-50">
                  Top-Einwände dieser Periode
                </h2>
                <p className="text-sm text-slate-400">
                  Die 5 häufigsten Einwände nach Anzahl
                </p>
              </div>

              <div className="space-y-3">
                {summary.topObjections.length === 0 ? (
                  <p className="text-sm text-slate-500">Keine Daten vorhanden.</p>
                ) : (
                  summary.topObjections.map((bucket, index) => (
                    <ObjectionCard 
                      key={index} 
                      bucket={bucket} 
                      rank={index + 1}
                      onSuggestPlay={handleSuggestPlay}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Grid: Einwände nach Branche + Kanal */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Einwände nach Branche */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-50">
                    Einwände nach Branche
                  </h2>
                  <p className="text-sm text-slate-400">Verteilung nach Vertical</p>
                </div>

                <div className="space-y-3">
                  {summary.byVertical.length === 0 ? (
                    <p className="text-sm text-slate-500">Keine Daten vorhanden.</p>
                  ) : (
                    summary.byVertical.map((bucket, index) => (
                      <BucketCard key={index} bucket={bucket} />
                    ))
                  )}
                </div>
              </section>

              {/* Einwände nach Kanal */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-50">
                    Einwände nach Kanal
                  </h2>
                  <p className="text-sm text-slate-400">Verteilung nach Channel</p>
                </div>

                <div className="space-y-3">
                  {summary.byChannel.length === 0 ? (
                    <p className="text-sm text-slate-500">Keine Daten vorhanden.</p>
                  ) : (
                    summary.byChannel.map((bucket, index) => (
                      <BucketCard key={index} bucket={bucket} />
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* Playbook-Suggestor Panel */}
            {/* ───────────────────────────────────────────────────────────── */}

            {selectedObjectionKey && (
              <PlaybookSuggestorPanel
                objectionKey={selectedObjectionKey}
                objectionLabel={selectedObjectionLabel ?? ''}
                objectionCount={selectedObjectionCount}
                days={days}
                loading={playLoading}
                saving={playSaving}
                error={playError}
                suggestion={suggestion}
                onSave={saveAsTemplate}
                onClose={handleClosePanel}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────

interface ObjectionCardProps {
  bucket: ObjectionAnalyticsBucket;
  rank: number;
  onSuggestPlay: (bucket: ObjectionAnalyticsBucket) => void;
}

function ObjectionCard({ bucket, rank, onSuggestPlay }: ObjectionCardProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 transition hover:border-slate-600">
      <div className="flex items-start gap-4">
        {/* Rank Badge */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-lg font-bold text-emerald-400">
          {rank}
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="line-clamp-2 text-sm font-medium text-slate-200">
            {bucket.label}
          </p>

          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            <span>
              {bucket.count} {bucket.count === 1 ? 'Mal' : 'Mal'}
            </span>
            <span>•</span>
            <span>{bucket.percentage.toFixed(1)}%</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${bucket.percentage}%` }}
            />
          </div>

          {/* KI-Play vorschlagen Button */}
          <button
            onClick={() => onSuggestPlay(bucket)}
            className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/60 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10"
          >
            <Sparkles className="h-3.5 w-3.5" />
            KI-Play vorschlagen
          </button>
        </div>
      </div>
    </div>
  );
}

interface BucketCardProps {
  bucket: ObjectionAnalyticsBucket;
}

function BucketCard({ bucket }: BucketCardProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-200">{bucket.label}</p>
        <div className="text-right">
          <p className="text-lg font-bold text-emerald-400">{bucket.count}</p>
          <p className="text-xs text-slate-500">{bucket.percentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-2 rounded-full bg-emerald-500"
          style={{ width: `${bucket.percentage}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Playbook-Suggestor Panel
// ─────────────────────────────────────────────────────────────────

interface PlaybookSuggestorPanelProps {
  objectionKey: string;
  objectionLabel: string;
  objectionCount: number;
  days: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  suggestion: {
    title: string;
    templateMessage: string;
    reasoning?: string | null;
  } | null;
  onSave: (opts?: { titleOverride?: string }) => Promise<any>;
  onClose: () => void;
}

function PlaybookSuggestorPanel({
  objectionKey,
  objectionLabel,
  objectionCount,
  days,
  loading,
  saving,
  error,
  suggestion,
  onSave,
  onClose,
}: PlaybookSuggestorPanelProps) {
  const [localTitle, setLocalTitle] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync localTitle mit suggestion.title
  useEffect(() => {
    if (suggestion) {
      setLocalTitle(suggestion.title);
    }
  }, [suggestion]);

  // Handler: Nachricht kopieren
  const handleCopy = async () => {
    if (!suggestion) return;

    try {
      await navigator.clipboard.writeText(suggestion.templateMessage);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
      alert('Konnte Text nicht kopieren. Bitte manuell markieren und kopieren.');
    }
  };

  // Handler: Als Draft speichern
  const handleSave = async () => {
    if (!suggestion) return;

    const result = await onSave({ titleOverride: localTitle });
    if (result) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-800 p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-50">Playbook-Suggestor</h2>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Basierend auf deinem Top-Einwand schlägt die KI dir eine Standard-Antwort vor,
            die du als Template speichern kannst.
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Einwand-Info */}
      <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Einwand
            </p>
            <p className="mt-1 text-sm text-slate-200">{objectionLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Vorkommen</p>
            <p className="text-lg font-bold text-emerald-400">{objectionCount}×</p>
            <p className="text-xs text-slate-500">in {days} Tagen</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <p className="mt-4 text-sm text-slate-400">
            KI baut gerade einen Vorschlag …
          </p>
        </div>
      )}

      {/* Error State */}
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

      {/* Suggestion Content */}
      {suggestion && !loading && (
        <div className="space-y-4">
          {/* Titel Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Titel des Templates
            </label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="z.B. Standardantwort: Zeitproblem"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Template-Nachricht */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Template-Nachricht
            </label>
            <textarea
              value={suggestion.templateMessage}
              readOnly
              rows={8}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* KI-Reasoning (optional) */}
          {suggestion.reasoning && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Notizen der KI / Strategie-Hinweis
              </label>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs leading-relaxed text-slate-400">
                  {suggestion.reasoning}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleCopy}
              disabled={copySuccess}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-600 disabled:opacity-70"
            >
              {copySuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  Kopiert!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Nachricht kopieren
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              disabled={saving || saveSuccess}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Speichere …
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  Gespeichert!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Als Draft speichern
                </>
              )}
            </button>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-sm text-emerald-400">
                ✓ Template wurde als Draft gespeichert und kann später aktiviert werden.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

