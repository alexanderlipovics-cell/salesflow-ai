/**
 * LeadContextChat Component
 * 
 * AI Chat Interface mit Lead-Kontext Integration.
 * CHIEF - der Sales Coach von Sales Flow AI.
 */

import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Bot, Send, X, Loader2, User, Sparkles, RefreshCw, Volume2 } from 'lucide-react';
import { useAIChat } from '@/hooks/useAIChat';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const hasExportIntent = (message: string) => {
  const text = (message || '').toLowerCase();
  const keywords = ['hier ist dein', 'erstellt', 'export', 'pdf', 'excel', 'tabelle', 'angebot', 'angebot erstellt'];
  return keywords.some((k) => text.includes(k));
};
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
  onSpeak,
  isSpeaking,
}: {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  onSpeak?: () => void;
  isSpeaking?: boolean;
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
        <div className="flex items-start gap-2">
          <p className="whitespace-pre-wrap text-sm leading-relaxed flex-1">{content}</p>
          {!isUser && onSpeak && (
            <button
              onClick={onSpeak}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-600/80 text-slate-100 hover:bg-slate-500 transition-colors"
              title="Vorlesen"
              disabled={isSpeaking}
            >
              <Volume2 className={`h-4 w-4 ${isSpeaking ? 'opacity-60' : ''}`} />
            </button>
          )}
        </div>
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
  const [localInput, setLocalInput] = useState(''); // Local state for input to prevent re-renders
  const [isTyping, setIsTyping] = useState(false);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const [downloadLoadingId, setDownloadLoadingId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
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

  // Paste-Handler für Bilder (Strg+V)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault();
          const reader = new FileReader();
          reader.onloadend = () => {
            setUploadedImage(reader.result as string);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    el.addEventListener('paste', handlePaste as EventListener);
    return () => el.removeEventListener('paste', handlePaste as EventListener);
  }, []);

  const handleSend = async () => {
    const trimmed = localInput.trim();
    if (!trimmed && !uploadedImage) return;
    if (sending) return;

    setIsTyping(true);
    setInput('');
    setLocalInput('');
    try {
      await sendMessage(trimmed, uploadedImage || undefined);
    } finally {
      setUploadedImage(null);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setInput(action.prompt);
    setLocalInput(action.prompt);
    inputRef.current?.focus();
  };

  const handleNewChat = () => {
    clearChat();
    createSession(leadId, leadId ? 'lead_coaching' : 'general');
  };

  const speakResponse = async (text: string, messageId?: string) => {
    if (!text) return;
    setTtsLoadingId(messageId ?? null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${API_URL}/api/voice/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (data?.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        void audio.play();
      }
    } catch (err) {
      console.error('TTS error', err);
    } finally {
      setTtsLoadingId(null);
    }
  };

  const downloadFile = async (
    endpoint: string,
    body: Record<string, any>,
    filename: string,
  ) => {
    setDownloadLoadingId(endpoint + filename);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error', err);
    } finally {
      setDownloadLoadingId(null);
    }
  };

  const downloadPDF = (content: string) =>
    downloadFile('/api/exports/pdf', { content, title: 'CHIEF-Dokument' }, 'chief-dokument.pdf');

  const downloadExcel = (content: string) =>
    downloadFile('/api/exports/excel', { data: [{ content }], filename: 'chief-export' }, 'chief-export.xlsx');

  const downloadCSV = (content: string) =>
    downloadFile('/api/exports/csv', { data: [{ content }], filename: 'chief-export' }, 'chief-export.csv');

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────

  const containerClasses = isModal
    ? 'fixed inset-0 z-50 flex flex-col bg-slate-900 md:inset-4 md:rounded-2xl md:border md:border-slate-700 md:shadow-2xl'
    : 'flex h-full w-full max-w-5xl mx-auto flex-col rounded-2xl border border-slate-700 bg-slate-900';

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
            {messages.map((msg) => {
              const exportIntent = msg.role === 'assistant' && hasExportIntent(msg.content);
              return (
                <div key={msg.id} className="space-y-2">
                  <MessageBubble
                    role={msg.role as 'user' | 'assistant'}
                    content={msg.content}
                    timestamp={new Date(msg.created_at).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    onSpeak={
                      msg.role === 'assistant'
                        ? () => speakResponse(msg.content, msg.id)
                        : undefined
                    }
                    isSpeaking={ttsLoadingId === msg.id}
                  />
                  {exportIntent && (
                    <div className="ml-12 flex flex-wrap gap-2">
                      <button
                        onClick={() => downloadPDF(msg.content)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                        disabled={downloadLoadingId !== null}
                      >
                        📄 Als PDF
                      </button>
                      <button
                        onClick={() => downloadExcel(msg.content)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                        disabled={downloadLoadingId !== null}
                      >
                        📊 Als Excel
                      </button>
                      <button
                        onClick={() => downloadCSV(msg.content)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                        disabled={downloadLoadingId !== null}
                      >
                        🧾 Als CSV
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {(isTyping || sending) && <TypingIndicator />}
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
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frag CHIEF etwas..."
            rows={1}
            disabled={loading || sending}
            className="flex-1 resize-none rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />
          <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => {
                  setUploadedImage(reader.result as string);
                };
                reader.readAsDataURL(file);
              }}
            />
            📷
          </label>
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !uploadedImage) || sending || loading}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        {uploadedImage && (
          <div className="mt-2 flex items-center gap-2">
            <div className="relative">
              <img src={uploadedImage} alt="Upload Preview" className="max-h-20 rounded-lg border border-slate-700" />
              <button
                className="absolute -right-2 -top-2 rounded-full bg-slate-800 px-2 py-1 text-xs text-white shadow"
                onClick={() => setUploadedImage(null)}
              >
                ✕
              </button>
            </div>
            <span className="text-xs text-slate-400">Bild wird mit der nächsten Nachricht gesendet.</span>
          </div>
        )}
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Shift + Enter für neue Zeile • Enter zum Senden
        </p>
      </div>
    </div>
  );
}

export default LeadContextChat;

