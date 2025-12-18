import { useState, useMemo } from 'react';
import { X, Search, Brain, Clipboard, Check, Loader2 } from 'lucide-react';
import { useObjectionBrain } from '@/hooks/useObjectionBrain';
import type { ObjectionWithResponses } from '@/types/objection';

// ─────────────────────────────────────────────────────────────────
// Kategorie-Display (vereinfacht für Quick Helper)
// ─────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  price: '💰',
  timing: '⏰',
  need: '🎯',
  trust: '🤝',
  competition: '⚔️',
  authority: '👔',
  other: '📌',
};

const RESPONSE_TYPE_ICONS: Record<string, string> = {
  reframe: '🔄',
  question: '❓',
  story: '📖',
  fallback: '🚪',
};

// ─────────────────────────────────────────────────────────────────
// Component Props
// ─────────────────────────────────────────────────────────────────

interface QuickObjectionHelperProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResponse?: (responseText: string) => void;
  vertical?: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export function QuickObjectionHelper({
  isOpen,
  onClose,
  onSelectResponse,
  vertical,
}: QuickObjectionHelperProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { objections, isLoading, searchObjections, getBestResponse, trackUsage } = useObjectionBrain();

  // Gefilterte Objections basierend auf Suche
  const filteredObjections = useMemo(() => {
    const results = searchObjections(searchQuery);
    
    // Nur Top 5 für Quick Helper
    return results.slice(0, 5);
  }, [objections, searchQuery]);

  const handleCopy = async (responseId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(responseId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Kopieren fehlgeschlagen:', err);
    }
  };

  const handleSelect = (responseText: string, objectionId: string, responseId: string) => {
    if (onSelectResponse) {
      onSelectResponse(responseText);
    }
    
    // Track usage
    trackUsage(objectionId, responseId);
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-20">
        <div
          className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">🧠 Objection Brain</h2>
                  <p className="text-sm text-slate-400">Finde die perfekte Antwort</p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Was sagt der Kunde? (z.B. 'zu teuer', 'keine Zeit')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-6">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            )}

            {!isLoading && filteredObjections.length === 0 && (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                  <Search className="h-8 w-8 text-slate-600" />
                </div>
                <p className="text-slate-400">
                  {searchQuery
                    ? 'Keine passenden Einwände gefunden.'
                    : 'Gib einen Einwand ein, um Antworten zu finden.'}
                </p>
              </div>
            )}

            {/* Objection Results */}
            {!isLoading && filteredObjections.length > 0 && (
              <div className="space-y-4">
                {filteredObjections.map((objection) => {
                  const bestResponse = getBestResponse(objection, vertical);
                  if (!bestResponse) return null;

                  const isCopied = copiedId === bestResponse.id;
                  const categoryIcon = CATEGORY_ICONS[objection.category] || '📌';
                  const responseTypeIcon = RESPONSE_TYPE_ICONS[bestResponse.response_type] || '🔄';

                  return (
                    <div
                      key={objection.id}
                      className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition-all hover:border-slate-600"
                    >
                      {/* Objection Header */}
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-sm">{categoryIcon}</span>
                            <span className="text-xs font-bold uppercase text-slate-500">
                              {objection.category}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-white">
                            "{objection.text}"
                          </p>
                        </div>
                      </div>

                      {/* Best Response */}
                      <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm">{responseTypeIcon}</span>
                          <span className="text-xs font-bold text-purple-400">
                            Empfohlene Antwort
                          </span>
                          {bestResponse.success_rate && (
                            <span className="ml-auto text-xs font-semibold text-emerald-400">
                              {bestResponse.success_rate}% Erfolg
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed text-slate-200">
                          {bestResponse.response_text}
                        </p>
                        
                        {bestResponse.follow_up_question && (
                          <div className="mt-2 border-t border-slate-700 pt-2">
                            <p className="text-xs italic text-slate-400">
                              💬 Follow-up: "{bestResponse.follow_up_question}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(bestResponse.id, bestResponse.response_text)}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition ${
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

                        {onSelectResponse && (
                          <button
                            onClick={() =>
                              handleSelect(
                                bestResponse.response_text,
                                objection.id,
                                bestResponse.id
                              )
                            }
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 py-2 text-sm font-bold text-white transition hover:bg-purple-500"
                          >
                            Übernehmen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 p-4">
            <p className="text-center text-xs text-slate-500">
              💡 Tipp: Passe die Antwort an deinen persönlichen Stil an
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

