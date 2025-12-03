import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  DollarSign,
  Clock,
  Target,
  Shield,
  Users,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { ObjectionWithResponses, CategoryConfig, ResponseTypeConfig } from '@/types/objection';

// ─────────────────────────────────────────────────────────────────
// Kategorie-Konfiguration
// ─────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  price: {
    label: 'Preis',
    icon: '💰',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  timing: {
    label: 'Timing',
    icon: '⏰',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  need: {
    label: 'Bedarf',
    icon: '🎯',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  trust: {
    label: 'Vertrauen',
    icon: '🤝',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  competition: {
    label: 'Wettbewerb',
    icon: '⚔️',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  authority: {
    label: 'Entscheider',
    icon: '👔',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  other: {
    label: 'Sonstiges',
    icon: '📌',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
};

// ─────────────────────────────────────────────────────────────────
// Response Type Konfiguration
// ─────────────────────────────────────────────────────────────────

const RESPONSE_TYPE_CONFIG: Record<string, ResponseTypeConfig> = {
  reframe: {
    label: 'Reframe',
    icon: '🔄',
    color: 'text-blue-400',
  },
  question: {
    label: 'Frage',
    icon: '❓',
    color: 'text-purple-400',
  },
  story: {
    label: 'Story',
    icon: '📖',
    color: 'text-emerald-400',
  },
  fallback: {
    label: 'Fallback',
    icon: '🚪',
    color: 'text-amber-400',
  },
};

// ─────────────────────────────────────────────────────────────────
// Component Props
// ─────────────────────────────────────────────────────────────────

interface ObjectionCardProps {
  objection: ObjectionWithResponses;
  onCopyResponse?: (responseId: string, text: string) => void;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export function ObjectionCard({ objection, onCopyResponse }: ObjectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const category = CATEGORY_CONFIG[objection.category] || CATEGORY_CONFIG.other;
  const responseCount = objection.responses?.length || 0;

  const handleCopy = async (responseId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(responseId);
      setTimeout(() => setCopiedId(null), 2000);
      
      if (onCopyResponse) {
        onCopyResponse(responseId, text);
      }
    } catch (err) {
      console.error('Kopieren fehlgeschlagen:', err);
      alert('Kopieren fehlgeschlagen. Bitte manuell kopieren.');
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 transition-all hover:border-slate-600">
      {/* Header (immer sichtbar) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 text-left transition-colors hover:bg-slate-700/50"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Kategorie-Badge */}
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${category.bgColor} ${category.borderColor} ${category.color}`}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
              </span>
              
              {responseCount > 0 && (
                <span className="rounded-full bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-400">
                  {responseCount} {responseCount === 1 ? 'Antwort' : 'Antworten'}
                </span>
              )}
            </div>

            {/* Einwand-Text */}
            <h3 className="text-base font-semibold leading-relaxed text-white">
              "{objection.text}"
            </h3>
          </div>

          {/* Expand Icon */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content: Antworten */}
      {isExpanded && responseCount > 0 && (
        <div className="border-t border-slate-700 bg-slate-900/50 p-5">
          <div className="space-y-4">
            {objection.responses.map((response, index) => {
              const responseType = RESPONSE_TYPE_CONFIG[response.response_type] || RESPONSE_TYPE_CONFIG.fallback;
              const isCopied = copiedId === response.id;

              return (
                <div
                  key={response.id}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 p-4"
                >
                  {/* Response Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${responseType.color}`}>
                        {responseType.icon}
                      </span>
                      <span className={`text-sm font-bold ${responseType.color}`}>
                        {responseType.label}
                      </span>
                      
                      {/* Vertical Badge */}
                      {response.vertical && (
                        <span className="rounded bg-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                          {response.vertical}
                        </span>
                      )}
                    </div>

                    {/* Success Rate */}
                    {response.success_rate && (
                      <span className="text-xs font-semibold text-emerald-400">
                        {response.success_rate}% Erfolg
                      </span>
                    )}
                  </div>

                  {/* Response Text */}
                  <p className="mb-3 text-sm leading-relaxed text-slate-200">
                    {response.response_text}
                  </p>

                  {/* Follow-up Question */}
                  {response.follow_up_question && (
                    <div className="mb-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                      <div className="mb-1 flex items-center gap-1 text-xs font-bold text-blue-400">
                        <HelpCircle className="h-3 w-3" />
                        Follow-up Frage
                      </div>
                      <p className="text-sm italic text-blue-300">
                        "{response.follow_up_question}"
                      </p>
                    </div>
                  )}

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(response.id, response.response_text)}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition ${
                      isCopied
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Kopiert!
                      </>
                    ) : (
                      <>
                        <Clipboard className="h-4 w-4" />
                        Kopieren
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State wenn keine Antworten */}
      {isExpanded && responseCount === 0 && (
        <div className="border-t border-slate-700 bg-slate-900/50 p-5">
          <p className="text-center text-sm text-slate-500">
            Noch keine Antworten für diesen Einwand vorhanden.
          </p>
        </div>
      )}
    </div>
  );
}

