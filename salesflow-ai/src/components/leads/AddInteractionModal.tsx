/**
 * AddInteractionModal Component
 * 
 * Modal zum Hinzufügen einer neuen Interaktion für einen Lead.
 */

import { useState } from 'react';
import { X, Loader2, Clock } from 'lucide-react';
import { useInteractionLog } from '@/hooks/useInteractionLog';
import {
  INTERACTION_TYPE_LABELS,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
  type InteractionType,
  type InteractionChannel,
  type InteractionOutcome,
  type NewInteraction,
} from '@/types/interactions';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface AddInteractionModalProps {
  leadId: string;
  leadName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Vorausgewählter Interaction Type */
  preselectedType?: InteractionType;
  /** Vorausgewählter Channel */
  preselectedChannel?: InteractionChannel;
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

const INTERACTION_TYPES: InteractionType[] = [
  'call_outbound',
  'call_inbound',
  'dm_sent',
  'dm_received',
  'email_sent',
  'email_received',
  'meeting_scheduled',
  'meeting_completed',
  'note',
];

const CHANNELS: InteractionChannel[] = [
  'phone',
  'whatsapp',
  'instagram',
  'email',
  'linkedin',
  'in_person',
  'other',
];

const OUTCOMES: InteractionOutcome[] = [
  'positive',
  'neutral',
  'negative',
  'no_answer',
  'callback',
  'not_interested',
  'meeting_booked',
];

// Welche Types brauchen Duration?
const TYPES_WITH_DURATION: InteractionType[] = [
  'call_outbound',
  'call_inbound',
  'meeting_completed',
];

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export function AddInteractionModal({
  leadId,
  leadName,
  isOpen,
  onClose,
  onSuccess,
  preselectedType,
  preselectedChannel,
}: AddInteractionModalProps) {
  const { addInteraction } = useInteractionLog();

  // Form State
  const [type, setType] = useState<InteractionType>(preselectedType || 'dm_sent');
  const [channel, setChannel] = useState<InteractionChannel>(preselectedChannel || 'whatsapp');
  const [outcome, setOutcome] = useState<InteractionOutcome | ''>('');
  const [summary, setSummary] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');

  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens with preselected values
  const resetForm = () => {
    setType(preselectedType || 'dm_sent');
    setChannel(preselectedChannel || 'whatsapp');
    setOutcome('');
    setSummary('');
    setDurationMinutes('');
    setDurationSeconds('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Duration berechnen
      let totalSeconds: number | undefined;
      if (TYPES_WITH_DURATION.includes(type)) {
        const mins = parseInt(durationMinutes) || 0;
        const secs = parseInt(durationSeconds) || 0;
        if (mins > 0 || secs > 0) {
          totalSeconds = mins * 60 + secs;
        }
      }

      const data: NewInteraction = {
        lead_id: leadId,
        type,
        channel,
        outcome: outcome || undefined,
        summary: summary.trim() || undefined,
        duration_seconds: totalSeconds,
      };

      await addInteraction(data);

      // Success
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Speichern fehlgeschlagen';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  const showDuration = TYPES_WITH_DURATION.includes(type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Interaktion loggen</h2>
            {leadName && (
              <p className="mt-1 text-sm text-slate-400">für {leadName}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Art der Interaktion
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as InteractionType)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            >
              {INTERACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {INTERACTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Kanal
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as InteractionChannel)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Ergebnis{' '}
              <span className="text-slate-500">(optional)</span>
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as InteractionOutcome | '')}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">— Kein Ergebnis —</option>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {OUTCOME_LABELS[o]}
                </option>
              ))}
            </select>
          </div>

          {/* Duration (nur für Calls/Meetings) */}
          {showDuration && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                <Clock className="h-4 w-4" />
                Dauer{' '}
                <span className="text-slate-500">(optional)</span>
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 pr-12 text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      min
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 pr-12 text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      sek
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Zusammenfassung / Notiz{' '}
              <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Was wurde besprochen? Nächste Schritte?"
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Speichern'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddInteractionModal;

