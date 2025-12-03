import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Brain,
  Check,
  CheckCircle2,
  Clipboard,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useObjectionBrain } from '@/hooks/useObjectionBrain';
import { useSalesPersona } from '@/hooks/useSalesPersona';
import type { ObjectionVariant } from '@/services/objectionBrainService';
import { logObjectionUsage } from '@/services/objectionBrainService';

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function ObjectionBrainPage() {
  const navigate = useNavigate();
  const { loading, error, result, run, reset } = useObjectionBrain();
  const { persona } = useSalesPersona();

  // Form State
  const [vertical, setVertical] = useState<string>('generic');
  const [channel, setChannel] = useState<string>('whatsapp');
  const [objection, setObjection] = useState<string>('');
  const [context, setContext] = useState<string>('');

  // Copy State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Use State (für "Diese Antwort verwenden" Button)
  const [usedId, setUsedId] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!objection.trim()) {
      alert('Bitte gib einen Einwand ein.');
      return;
    }

    await run(
      {
        vertical: vertical === 'generic' ? null : vertical,
        channel: channel === 'whatsapp' ? null : channel,
        objection: objection.trim(),
        context: context.trim() || null,
      },
      persona
    );
  };

  const handleCopyMessage = async (variantId: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(variantId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Kopieren fehlgeschlagen:', err);
      alert('Konnte Nachricht nicht kopieren. Bitte manuell kopieren.');
    }
  };

  const handleOpenInChat = (message: string) => {
    // Navigiere zur Chat-Seite mit vorgefülltem Text
    navigate(`/chat?prefill=${encodeURIComponent(message)}`);
  };

  const handleUseAnswer = async (variantId: string, variant: ObjectionVariant) => {
    setLogError(null);
    
    try {
      // 1. Nachricht in Zwischenablage kopieren
      await navigator.clipboard.writeText(variant.message);
      
      // 2. Nutzung loggen
      await logObjectionUsage({
        vertical: vertical === 'generic' ? null : vertical,
        channel: channel === 'whatsapp' ? null : channel,
        objectionText: objection,
        chosenVariantLabel: variant.label,
        chosenMessage: variant.message,
        modelReasoning: result?.reasoning ?? null,
        source: 'objection_brain_page',
      });
      
      // 3. Erfolgs-Feedback
      setUsedId(variantId);
      setTimeout(() => setUsedId(null), 3000);
      
    } catch (err) {
      console.error('handleUseAnswer fehlgeschlagen:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      
      // Nachricht wurde wahrscheinlich kopiert, aber Logging fehlgeschlagen
      setCopiedId(variantId);
      setTimeout(() => setCopiedId(null), 2000);
      
      setLogError(`Antwort kopiert, aber Logging fehlgeschlagen: ${errorMessage}`);
      alert(`Die Antwort wurde kopiert, aber das Logging ist fehlgeschlagen: ${errorMessage}`);
    }
  };

  const handleReset = () => {
    reset();
    setObjection('');
    setContext('');
  };

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 pb-24 text-slate-50">
      {/* Header */}
      <div className="mx-auto mb-8 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Objection Brain 🧠</h1>
            <p className="text-sm text-slate-400">
              KI-Einwand-Coach für deine schwierigsten Situationen
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-auto mb-6 max-w-2xl">
          <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {!result && (
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          {/* Vertical Selection */}
          <div>
            <label htmlFor="vertical" className="mb-2 block text-sm font-medium text-slate-300">
              Branche
            </label>
            <select
              id="vertical"
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="generic">Allgemein</option>
              <option value="network">Network Marketing</option>
              <option value="real_estate">Immobilien</option>
              <option value="finance">Finance</option>
            </select>
          </div>

          {/* Channel Selection */}
          <div>
            <label htmlFor="channel" className="mb-2 block text-sm font-medium text-slate-300">
              Kanal
            </label>
            <select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram DM</option>
              <option value="phone">Telefon</option>
              <option value="email">E-Mail</option>
            </select>
          </div>

          {/* Objection Input */}
          <div>
            <label htmlFor="objection" className="mb-2 block text-sm font-medium text-slate-300">
              Original-Einwand des Kunden <span className="text-red-400">*</span>
            </label>
            <textarea
              id="objection"
              value={objection}
              onChange={(e) => setObjection(e.target.value)}
              placeholder='z.B. "Das ist mir zu teuer" oder "Ich muss das erst mit meinem Partner besprechen"'
              required
              rows={4}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Context Input */}
          <div>
            <label htmlFor="context" className="mb-2 block text-sm font-medium text-slate-300">
              Kontext <span className="text-xs text-slate-500">(optional)</span>
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="z.B. Angebot, Stage im Funnel, Preis, besondere Situation..."
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !objection.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-900/20 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                KI denkt über deinen Einwand nach...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5" />
                Antwort vorschlagen
              </>
            )}
          </button>
        </form>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-500" />
          <p className="mt-4 text-sm text-slate-400">
            Die KI analysiert den Einwand und erstellt 3 maßgeschneiderte Varianten für dich...
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Reasoning Banner */}
          {result.reasoning && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-400">
                <Brain className="h-4 w-4" />
                Strategie
              </div>
              <p className="text-sm leading-relaxed text-slate-300">{result.reasoning}</p>
            </div>
          )}

          {/* Primary Variant */}
          <VariantCard
            variant={result.primary}
            variantId="primary"
            isPrimary={true}
            onCopy={handleCopyMessage}
            onOpenInChat={handleOpenInChat}
            onUseAnswer={handleUseAnswer}
            isCopied={copiedId === 'primary'}
            isUsed={usedId === 'primary'}
          />

          {/* Alternative Variants */}
          {result.alternatives.map((variant, index) => (
            <VariantCard
              key={index}
              variant={variant}
              variantId={`alt-${index}`}
              isPrimary={false}
              onCopy={handleCopyMessage}
              onOpenInChat={handleOpenInChat}
              onUseAnswer={handleUseAnswer}
              isCopied={copiedId === `alt-${index}`}
              isUsed={usedId === `alt-${index}`}
            />
          ))}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Neuen Einwand analysieren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────

interface VariantCardProps {
  variant: ObjectionVariant;
  variantId: string;
  isPrimary: boolean;
  onCopy: (id: string, message: string) => void;
  onOpenInChat: (message: string) => void;
  onUseAnswer: (id: string, variant: ObjectionVariant) => void;
  isCopied: boolean;
  isUsed: boolean;
}

function VariantCard({
  variant,
  variantId,
  isPrimary,
  onCopy,
  onOpenInChat,
  onUseAnswer,
  isCopied,
  isUsed,
}: VariantCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        isPrimary
          ? 'border-purple-500/30 bg-purple-500/5'
          : 'border-slate-700 bg-slate-800/50'
      } p-5 shadow-lg transition-all hover:border-slate-600`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">
            {variant.label}
            {isPrimary && (
              <span className="ml-2 inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-400">
                Empfohlen
              </span>
            )}
          </h3>
          {variant.summary && (
            <p className="mt-1 text-xs text-slate-400">{variant.summary}</p>
          )}
        </div>
      </div>

      {/* Message */}
      <div className="mb-4">
        <div className="rounded-lg bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            <MessageCircle className="h-3 w-3" />
            Nachricht
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
            {variant.message}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Primary Action: Diese Antwort verwenden */}
        <button
          onClick={() => onUseAnswer(variantId, variant)}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition ${
            isUsed
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500'
          }`}
        >
          {isUsed ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Antwort kopiert & gespeichert ✅
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Diese Antwort verwenden
            </>
          )}
        </button>

        {/* Secondary Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onCopy(variantId, variant.message)}
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
                Nur kopieren
              </>
            )}
          </button>

          <button
            onClick={() => onOpenInChat(variant.message)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-purple-500/50 bg-purple-500/10 py-2 text-sm font-medium text-purple-400 transition hover:bg-purple-500/20"
          >
            <MessageCircle className="h-4 w-4" />
            Im KI-Assistent
          </button>
        </div>
      </div>
    </div>
  );
}
