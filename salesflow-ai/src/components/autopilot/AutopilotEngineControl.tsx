/**
 * AutopilotEngineControl - Trigger und Summary der Autopilot Engine
 * 
 * Features:
 * - "Jetzt ausführen" Button
 * - Summary-Anzeige (processed, suggested, skipped, errors)
 * - Loading State
 */

import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { AutopilotRunSummary } from '@/services/autopilotService';

interface Props {
  onRun: () => Promise<AutopilotRunSummary | null>;
  running: boolean;
}

export default function AutopilotEngineControl({ onRun, running }: Props) {
  const [summary, setSummary] = useState<AutopilotRunSummary | null>(null);

  const handleRun = async () => {
    const result = await onRun();
    if (result) {
      setSummary(result);
    }
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-black/30 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Autopilot Engine</h2>
          <p className="text-sm text-gray-400">Verarbeite pending Events manuell</p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="rounded-xl bg-salesflow-accent px-6 py-3 font-medium text-white transition-all hover:bg-salesflow-accent/90 disabled:opacity-50 flex items-center gap-2"
        >
          {running ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Läuft...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Jetzt ausführen
            </>
          )}
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wider text-gray-500">Verarbeitet</div>
            <div className="mt-2 text-3xl font-bold text-white">{summary.processed}</div>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="text-xs uppercase tracking-wider text-blue-400">Vorgeschlagen</div>
            <div className="mt-2 text-3xl font-bold text-blue-400">{summary.suggested}</div>
          </div>
          <div className="rounded-2xl border border-gray-500/20 bg-gray-500/10 p-4">
            <div className="text-xs uppercase tracking-wider text-gray-400">Übersprungen</div>
            <div className="mt-2 text-3xl font-bold text-gray-400">{summary.skipped}</div>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
            <div className="text-xs uppercase tracking-wider text-rose-400">Fehler</div>
            <div className="mt-2 text-3xl font-bold text-rose-400">{summary.errors}</div>
          </div>
        </div>
      )}

      {/* Error Details */}
      {summary?.error_details && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
          <div className="text-sm text-rose-400">{summary.error_details}</div>
        </div>
      )}
    </div>
  );
}

