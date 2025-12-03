/**
 * LeadContextChat Component
 * 
 * AI Chat Interface mit Lead-Kontext Integration.
 * CHIEF - der Sales Coach von Sales Flow AI.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Send,
  X,
  Loader2,
  User,
  Sparkles,
  Target,
  Building2,
  Phone,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { useAIChat } from '@/hooks/useAIChat';
import {
  QUICK_ACTIONS,
  TEMPERATURE_COLORS,
  type QuickAction,
} from '@/types/aiChat';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface LeadContextChatProps {
  /** Lead ID für Kontext-Loading */
  leadId?: string;
  /** Lead Name für Display */
  leadName?: string;
  /** Ob als Modal angezeigt */
  isModal?: boolean;
  /** Schließen-Handler für Modal */
  onClose?: () => void;
  /** Initiale Nachricht */
  initialMessage?: string;
}

// ─────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
      </div>
      <span className="ml-2 text-xs text-slate-500">CHIEF denkt nach...</span>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  timestamp,
}: {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-emerald-600' : 'bg-slate-700'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-emerald-400" />
        )}
      </div>

      {/* Message */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-700 text-slate-100'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        {timestamp && (
          <p className={`mt-1 text-[10px] ${isUser ? 'text-emerald-200' : 'text-slate-400'}`}>
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickActionButton({
  action,
  onClick,
  disabled,
}: {
  action: QuickAction;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-500/50 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span>{action.icon}</span>
      <span>{action.label}</span>
    </button>
  );
}

function LeadContextHeader({
  context,
  leadName,
}: {
  context: ReturnType<typeof useAIChat>['leadContext'];
  leadName?: string;
}) {
  if (!context) return null;

  const { lead, score, followup_status } = context;
  const tempColors = TEMPERATURE_COLORS[score.temperature] || TEMPERATURE_COLORS.warm;

  return (
    <div className="border-b border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700">
            <Target className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {lead.name || leadName || 'Unbekannter Lead'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {lead.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {lead.company}
                </span>
              )}
              {lead.vertical && <span>• {lead.vertical}</span>}
            </div>
          </div>
        </div>

        {/* Score Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${tempColors.bg} ${tempColors.text} ${tempColors.border}`}
          >
            {tempColors.label}
          </span>
          <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs font-bold text-slate-300">
            {score.total_score}/100
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-400">
        <span className="rounded bg-slate-700/50 px-2 py-0.5">
          Phase: {followup_status.current_step || 'Nicht gestartet'}
        </span>
        <span className="rounded bg-slate-700/50 px-2 py-0.5">
          Versuche: {followup_status.total_attempts}
        </span>
        {followup_status.reply_received && (
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-400">
            ✓ Antwort erhalten
          </span>
        )}
        {lead.phone && (
          <span className="flex items-center gap-1 rounded bg-slate-700/50 px-2 py-0.5">
            <Phone className="h-2.5 w-2.5" />
            {lead.phone}
          </span>
        )}
        {lead.email && (
          <span className="flex items-center gap-1 rounded bg-slate-700/50 px-2 py-0.5">
            <Mail className="h-2.5 w-2.5" />
            {lead.email}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export function LeadContextChat({
  leadId,
  leadName,
  isModal = false,
  onClose,
  initialMessage,
}: LeadContextChatProps) {
  const {
    session,
    messages,
    leadContext,
    loading,
    sending,
    error,
    createSession,
    sendMessage,
    clearChat,
  } = useAIChat();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Session erstellen beim Mount
  useEffect(() => {
    if (!session) {
      createSession(leadId, leadId ? 'lead_coaching' : 'general');
    }
  }, [leadId, session, createSession]);

  // Initial Message senden
  useEffect(() => {
    if (session && initialMessage && messages.length === 0) {
      sendMessage(initialMessage);
    }
  }, [session, initialMessage, messages.length, sendMessage]);

  // Auto-scroll zu neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Focus Input
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setInput('');
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setInput(action.prompt);
    inputRef.current?.focus();
  };

  const handleNewChat = () => {
    clearChat();
    createSession(leadId, leadId ? 'lead_coaching' : 'general');
  };

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────

  const containerClasses = isModal
    ? 'fixed inset-0 z-50 flex flex-col bg-slate-900 md:inset-4 md:rounded-2xl md:border md:border-slate-700 md:shadow-2xl'
    : 'flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900';

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white">CHIEF</h2>
            <p className="text-xs text-slate-400">Dein Sales Coach</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Neuer Chat
          </button>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Lead Context Header */}
      {leadContext && (
        <LeadContextHeader context={leadContext} leadName={leadName} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
              <Bot className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              Hey! Ich bin CHIEF 👋
            </h3>
            <p className="mb-6 max-w-sm text-sm text-slate-400">
              {leadContext
                ? `Ich kenne ${leadContext.lead.name || 'diesen Lead'} und kann dir helfen, den Deal zu machen.`
                : 'Ich bin dein persönlicher Sales Coach. Frag mich alles rund um Vertrieb!'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.slice(0, 3).map((action) => (
                <QuickActionButton
                  key={action.id}
                  action={action}
                  onClick={() => handleQuickAction(action)}
                  disabled={sending}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role as 'user' | 'assistant'}
                content={msg.content}
                timestamp={new Date(msg.created_at).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            ))}
            {sending && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      {messages.length > 0 && (
        <div className="border-t border-slate-800 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionButton
                key={action.id}
                action={action}
                onClick={() => handleQuickAction(action)}
                disabled={sending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frag CHIEF etwas..."
            rows={1}
            disabled={loading || sending}
            className="flex-1 resize-none rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || loading}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Shift + Enter für neue Zeile • Enter zum Senden
        </p>
      </div>
    </div>
  );
}

export default LeadContextChat;

