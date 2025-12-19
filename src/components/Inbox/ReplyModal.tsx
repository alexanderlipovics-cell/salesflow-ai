import React, { useState, useEffect } from 'react';
import { X, Send, MessageCircle, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import type { ProcessReplyResponse } from '@/types/inbox';

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  currentState: string;
  onReplyProcessed: (response: ProcessReplyResponse) => void;
}

const API_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
  : (import.meta.env.PROD ? 'https://salesflow-ai.onrender.com' : 'http://localhost:8000');

export const ReplyModal: React.FC<ReplyModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  currentState,
  onReplyProcessed
}) => {
  const [replyText, setReplyText] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'instagram' | 'email' | 'sms'>('whatsapp');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<ProcessReplyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when modal closes
      setReplyText('');
      setResponse(null);
      setError(null);
      setIsProcessing(false);
      setIsSending(false);
      setSent(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    // Reset state before closing
    setReplyText('');
    setResponse(null);
    setError(null);
    setIsProcessing(false);
    setIsSending(false);
    setSent(false);
    onClose();
  };

  if (!isOpen) return null;

  const handleProcessReply = async () => {
    if (!replyText.trim()) {
      setError('Bitte füge die Antwort ein');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        // Fallback: Aus Supabase Session
        const { supabaseClient } = await import('@/lib/supabaseClient');
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Nicht authentifiziert');
        }
      }

      const res = await fetch(`${API_URL}/api/chief/process-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          lead_id: leadId,
          reply_text: replyText,
          channel: channel
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(errorData.detail || errorData.error || 'Fehler beim Verarbeiten');
      }

      const data: ProcessReplyResponse = await res.json();
      console.log('Reply processed:', data); // Debug log
      
      // WICHTIG: Setze response State - das triggert Step 2 UI
      setResponse(data);
      
      // NICHT onReplyProcessed hier aufrufen - das macht Step 2
      // onReplyProcessed wird erst beim "Kopieren & Senden" aufgerufen

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyAndSend = async () => {
    if (!response) return;

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(response.generated_response);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
    }

    setIsSending(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        const { supabaseClient } = await import('@/lib/supabaseClient');
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Nicht authentifiziert');
        }
      }

      const res = await fetch(`${API_URL}/api/chief/mark-sent-with-followup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          lead_id: leadId,
          message_sent: response.generated_response,
          schedule_followup: true,
          followup_days: 3
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(errorData.detail || errorData.error || 'Fehler beim Speichern');
      }

      setSent(true);
      
      // Callback für Parent
      onReplyProcessed(response);
      
      // Close after 2 seconds
      setTimeout(() => {
        onClose();
        // Reset state for next time
        setReplyText('');
        setResponse(null);
        setSent(false);
        setError(null);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsSending(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    const colors: Record<string, string> = {
      positive: 'text-green-400',
      interested: 'text-green-400',
      neutral: 'text-gray-400',
      hesitant: 'text-yellow-400',
      negative: 'text-red-400',
      objection: 'text-orange-400'
    };
    return colors[sentiment] || 'text-gray-400';
  };

  const getSentimentEmoji = (sentiment: string) => {
    const emojis: Record<string, string> = {
      positive: '😊',
      interested: '🤔',
      neutral: '😐',
      hesitant: '🤷',
      negative: '😕',
      objection: '🛑'
    };
    return emojis[sentiment] || '💬';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                {leadName} hat geantwortet
              </h2>
              <p className="text-sm text-gray-400">
                Status: {currentState} {response && response.new_state !== currentState && (
                  <span className="text-cyan-400">→ {response.new_state}</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Step 1: Antwort eingeben */}
          {!response && (
            <>
              {/* Channel Selection */}
              <div className="flex gap-2">
                {(['whatsapp', 'instagram', 'email', 'sms'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                      channel === ch 
                        ? 'bg-cyan-500 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {/* Reply Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Antwort von {leadName} einfügen:
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Was hat ${leadName} geschrieben?`}
                  className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Process Button */}
              <button
                onClick={handleProcessReply}
                disabled={isProcessing || !replyText.trim()}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    CHIEF analysiert...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    CHIEF: Analysieren & Antwort generieren
                  </>
                )}
              </button>
            </>
          )}

          {/* Step 2: Analyse & generierte Antwort */}
          {response && (
            <>
              {/* Analysis Card */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                  CHIEF Analyse
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Stimmung</p>
                    <p className={`font-medium ${getSentimentColor(response.analysis?.sentiment || 'neutral')}`}>
                      {getSentimentEmoji(response.analysis?.sentiment || 'neutral')} {response.analysis?.sentiment || 'neutral'}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Intent</p>
                    <p className="font-medium text-white">{response.analysis?.intent || 'unknown'}</p>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Strategie</p>
                  <p className="text-sm text-gray-300">{response.analysis?.response_strategy || ''}</p>
                </div>

                {response.new_state && response.new_state !== currentState && (
                  <div className="flex items-center gap-2 text-sm text-cyan-400">
                    <span>📈</span>
                    Status: {currentState} → {response.new_state}
                  </div>
                )}

                {response.cancelled_followups && response.cancelled_followups > 0 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <CheckCircle className="w-4 h-4" />
                    {response.cancelled_followups} geplante Follow-ups gecancelt
                  </div>
                )}
              </div>

              {/* Generated Response */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Deine Antwort
                  </h3>
                  <span className="text-xs text-cyan-400">Von CHIEF generiert</span>
                </div>
                
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
                  <p className="text-white whitespace-pre-wrap">{response.generated_response}</p>
                </div>
              </div>

              {/* Original Reply (collapsed) */}
              <details className="bg-gray-800/30 rounded-lg">
                <summary className="p-3 cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                  Original-Antwort von {leadName} anzeigen
                </summary>
                <div className="p-3 pt-0 text-sm text-gray-500 border-t border-gray-700/50">
                  "{replyText}"
                </div>
              </details>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              {!sent ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setResponse(null);
                    }}
                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={handleCopyAndSend}
                    disabled={isSending}
                    className="flex-[2] py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        Kopieren & als gesendet markieren
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-3 bg-green-500/20 text-green-400 rounded-xl">
                  <span>✓</span>
                  Gespeichert! Follow-up in 3 Tagen geplant.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplyModal;

