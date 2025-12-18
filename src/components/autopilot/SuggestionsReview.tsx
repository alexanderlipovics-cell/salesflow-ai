/**
 * SuggestionsReview - Review und Approve/Skip von KI-Vorschlägen
 * 
 * Features:
 * - Anzeige der suggested Events
 * - Original Message + vorgeschlagene Antwort
 * - Approve/Skip Buttons
 * - Action Info
 */

import { MessageEvent } from '@/services/autopilotService';
import { cn } from '@/lib/utils';
import { Check, X, Sparkles, MessageSquare } from 'lucide-react';

interface Props {
  events: MessageEvent[];
  loading: boolean;
  onApprove: (eventId: string) => Promise<void>;
  onSkip: (eventId: string) => Promise<void>;
}

const ACTION_LABELS: Record<string, string> = {
  objection_handler: 'Einwand behandeln',
  follow_up: 'Follow-up',
  offer_create: 'Angebot erstellen',
  generate_message: 'Nachricht generieren',
  closing_helper: 'Abschluss-Hilfe',
};

const ACTION_COLORS: Record<string, string> = {
  objection_handler: 'text-orange-400',
  follow_up: 'text-blue-400',
  offer_create: 'text-green-400',
  generate_message: 'text-purple-400',
  closing_helper: 'text-emerald-400',
};

export default function SuggestionsReview({ events, loading, onApprove, onSkip }: Props) {
  const suggestedEvents = events.filter((e) => e.autopilot_status === 'suggested' && e.suggested_reply);

  const handleApprove = async (eventId: string) => {
    if (window.confirm('Möchtest du diese Antwort genehmigen und als "gesendet" markieren?')) {
      await onApprove(eventId);
    }
  };

  const handleSkip = async (eventId: string) => {
    if (window.confirm('Diesen Vorschlag überspringen?')) {
      await onSkip(eventId);
    }
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-black/30 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Vorgeschlagene Antworten</h2>
          <p className="text-sm text-gray-400">
            {suggestedEvents.length} Vorschläge warten auf deine Entscheidung
          </p>
        </div>
        <div className="rounded-2xl bg-blue-500/10 p-3">
          <Sparkles className="h-6 w-6 text-blue-400" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Vorschläge werden geladen...</div>
      ) : suggestedEvents.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center">
          <div className="mb-3 text-4xl">✨</div>
          <div className="text-lg font-medium text-white">Keine offenen Vorschläge</div>
          <div className="mt-1 text-sm text-gray-400">
            Sobald neue Nachrichten eingehen, erscheinen hier KI-Vorschläge
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestedEvents.map((event) => {
            const reply = event.suggested_reply;
            if (!reply) return null;

            const action = reply.detected_action || 'generate_message';
            const actionLabel = ACTION_LABELS[action] || action;
            const actionColor = ACTION_COLORS[action] || 'text-gray-400';

            return (
              <div
                key={event.id}
                className="rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:border-white/20"
              >
                {/* Action Badge */}
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold',
                      actionColor
                    )}
                  >
                    <Sparkles className="h-3 w-3" />
                    {actionLabel}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{event.channel}</span>
                </div>

                {/* Original Message */}
                <div className="mb-4 rounded-xl border border-white/5 bg-black/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
                    <MessageSquare className="h-3 w-3" />
                    Eingehende Nachricht
                  </div>
                  <p className="text-sm text-white">{event.normalized_text || event.text}</p>
                </div>

                {/* Suggested Reply */}
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-400">
                    <Sparkles className="h-3 w-3" />
                    KI-Vorschlag
                  </div>
                  <p className="text-sm text-white whitespace-pre-wrap">{reply.text}</p>
                  
                  {/* Meta Info */}
                  {reply.model && (
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                      <span>Modell: {reply.model}</span>
                      {reply.mode_used && <span>Modus: {reply.mode_used}</span>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(event.id)}
                    className="flex-1 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Übernehmen & Senden
                  </button>
                  <button
                    onClick={() => handleSkip(event.id)}
                    className="flex-1 rounded-xl bg-gray-500/10 px-4 py-2.5 text-sm font-medium text-gray-400 transition-all hover:bg-gray-500/20 flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Überspringen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

