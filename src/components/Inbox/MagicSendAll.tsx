/**
 * MagicSendAll Component
 * 
 * Button und Modal für Bulk-Send aller hochkonfidenten Messages
 */

import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InboxItem, MagicSendAllResult } from '@/types/inbox';

interface MagicSendAllProps {
  items: InboxItem[];
  onSendAll: (itemIds: string[]) => Promise<MagicSendAllResult>;
}

export const MagicSendAll: React.FC<MagicSendAllProps> = ({ items, onSendAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<MagicSendAllResult | null>(null);

  // Filtere Items mit confidence > 95%
  const highConfidenceItems = items.filter(
    (item) => item.action.confidence && item.action.confidence > 95
  );

  const count = highConfidenceItems.length;

  if (count === 0) {
    return null; // Keine hochkonfidenten Items
  }

  const handleSendAll = async () => {
    setIsSending(true);
    setResult(null);

    try {
      const itemIds = highConfidenceItems.map((item) => item.id);
      const sendResult = await onSendAll(itemIds);
      setResult(sendResult);
    } catch (err) {
      console.error('Fehler beim Magic Send All:', err);
      alert('Fehler beim Senden. Bitte versuche es erneut.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        ✨ Alle senden ({count})
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isSending && setIsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Magic Send All</h3>
            <p className="text-sm text-slate-400 mb-6">
              {count} Nachrichten mit hoher Konfidenz ({'>'}95%) werden gesendet. Fortfahren?
            </p>

            {result ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Abgeschlossen!</span>
                </div>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>✅ Gesendet: {result.sent}</p>
                  {result.failed > 0 && <p className="text-red-400">❌ Fehlgeschlagen: {result.failed}</p>}
                  {result.skipped > 0 && <p className="text-amber-400">⏭️ Übersprungen: {result.skipped}</p>}
                </div>
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    setResult(null);
                  }}
                  className="w-full"
                >
                  Schließen
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSending}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSendAll}
                  disabled={isSending}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sende...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Senden
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

