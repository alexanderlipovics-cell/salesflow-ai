import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { ProcessReplyResponse } from '@/types/inbox';

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  currentState: string;
  onReplyProcessed: (response: ProcessReplyResponse) => void;
  leadContact?: {
    instagram_url?: string;
    whatsapp?: string;
    email?: string;
    phone?: string;
  };
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
  onReplyProcessed,
  leadContact
}) => {
  const [replyText, setReplyText] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'instagram' | 'email' | 'sms'>('whatsapp');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<ProcessReplyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'input' | 'analysis' | 'action'>('input');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReplyText('');
      setChannel('whatsapp');
      setResponse(null);
      setError(null);
      setIsProcessing(false);
      setPhase('input');
    }
  }, [isOpen]);

  // Analyse starten
  const handleAnalyze = async () => {
    if (!replyText.trim()) {
      setError('Bitte füge die Antwort ein');
      return;
    }

    setIsProcessing(true);
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
        throw new Error(errorData.detail || errorData.error || 'Fehler beim Analysieren');
      }

      const data: ProcessReplyResponse = await res.json();
      console.log('CHIEF Analysis:', data);
      
      setResponse(data);
      setPhase('analysis');  // → Zur Analyse-Phase

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setIsProcessing(false);
    }
  };

  // Kopieren und zur Action-Phase
  const handleCopyAndProceed = async () => {
    if (!response) return;

    // Copy to clipboard FIRST
    try {
      await navigator.clipboard.writeText(response.generated_response);
    } catch (err) {
      console.error('Clipboard error:', err);
    }

    setIsProcessing(true);
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
          followup_hours: response.next_step?.hours_until_followup || 72,
          followup_reason: response.next_step?.reason || 'Standard Follow-up',
          urgency_score: response.next_step?.urgency_score || 50
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(errorData.detail || errorData.error || 'Fehler beim Speichern');
      }

      // WICHTIG: Erst Phase setzen, DANN callback
      console.log('Setting phase to action');
      setPhase('action');
      
      // Callback NICHT sofort aufrufen - das würde Modal schließen/resetten
      // onReplyProcessed wird erst aufgerufen wenn User auf Kanal klickt

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsProcessing(false);
    }
  };

  // Kanal öffnen und Modal schließen
  const handleOpenChannel = (channelType: 'whatsapp' | 'instagram' | 'email' | 'phone') => {
    let url = '';
    
    switch (channelType) {
      case 'instagram':
        if (leadContact?.instagram_url) {
          url = leadContact.instagram_url;
        }
        break;
      case 'whatsapp':
        if (leadContact?.whatsapp || leadContact?.phone) {
          const phone = (leadContact.whatsapp || leadContact.phone || '').replace(/[^0-9+]/g, '');
          url = `https://wa.me/${phone.replace('+', '')}`;
        }
        break;
      case 'email':
        if (leadContact?.email) {
          url = `mailto:${leadContact.email}`;
        }
        break;
      case 'phone':
        if (leadContact?.phone) {
          url = `tel:${leadContact.phone}`;
        }
        break;
    }
    
    // Link öffnen
    if (url) {
      window.open(url, '_blank');
    }
    
    // JETZT erst callback aufrufen (refresht Inbox)
    if (response) {
      onReplyProcessed(response);
    }
    
    // Modal schließen
    handleClose();
  };

  // Modal schließen und State resetten
  const handleClose = () => {
    setReplyText('');
    setChannel('whatsapp');
    setIsProcessing(false);
    setResponse(null);
    setError(null);
    setPhase('input');
    onClose();
  };

  // Follow-up Zeit formatieren
  const formatFollowupTime = (hours: number): string => {
    if (hours < 1) return 'in wenigen Minuten';
    if (hours < 24) return `in ${Math.round(hours)} Stunden`;
    const days = Math.round(hours / 24);
    return `in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
  };

  // Sentiment Emoji
  const getSentimentEmoji = (sentiment: string): string => {
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

  if (!isOpen) return null;

  // Urgency Score für Pulse-Animation
  const urgencyScore = response?.next_step?.urgency_score || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {phase === 'action' ? 'Jetzt senden!' : `${leadName} hat geantwortet`}
              </h2>
              {response?.next_step && phase === 'action' && (
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    response.next_step.urgency_score >= 70 ? 'text-orange-400' : 
                    response.next_step.urgency_score >= 40 ? 'text-yellow-400' : 'text-slate-400'
                  }`}>
                    🔥 Urgency: {response.next_step.urgency_score}/100
                  </span>
                </div>
              )}
              {phase !== 'action' && (
                <p className="text-sm text-slate-400">
                  Status: {currentState} {response && response.new_state !== currentState && (
                    <span className="text-cyan-400">→ {response.new_state}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 relative z-10">
          
          {/* ═══════════════════════════════════════════════════════ */}
          {/* PHASE: INPUT - Antwort eingeben                         */}
          {/* ═══════════════════════════════════════════════════════ */}
          {phase === 'input' && (
            <div className="space-y-4">
              {/* Channel Selection */}
              <div className="flex gap-2">
                {(['whatsapp', 'instagram', 'email', 'sms'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                      channel === ch 
                        ? 'bg-cyan-500 text-white' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {/* Reply Input */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Was hat {leadName} geschrieben?
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Antwort von ${leadName} hier einfügen...`}
                  className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={isProcessing || !replyText.trim()}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all text-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    CHIEF analysiert...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    CHIEF: Analysieren
                  </>
                )}
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* PHASE: ANALYSIS - Analyse + generierte Antwort         */}
          {/* ═══════════════════════════════════════════════════════ */}
          {phase === 'analysis' && response && (
            <div className="space-y-4">
              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left: Analysis */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <span className="text-sm">🧠</span>
                    </div>
                    <h3 className="text-white font-semibold">CHIEF ANALYSE</h3>
                  </div>
                  
                  {/* Urgency Score with Glow */}
                  {response.next_step && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">Dringlichkeit</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              urgencyScore >= 80 
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]' 
                                : urgencyScore >= 50 
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                : 'bg-gradient-to-r from-green-500 to-cyan-500'
                            }`}
                            style={{ width: `${urgencyScore}%` }}
                          />
                        </div>
                        <span className={`font-bold ${
                          urgencyScore >= 80 ? 'text-orange-400' : urgencyScore >= 50 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {urgencyScore}/100
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sentiment & Intent Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                      <p className="text-xs text-slate-500 mb-1">Stimmung</p>
                      <p className="text-white font-medium flex items-center gap-2">
                        {getSentimentEmoji(response.analysis?.sentiment || 'neutral')} {response.analysis?.sentiment || 'neutral'}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                      <p className="text-xs text-slate-500 mb-1">Intent</p>
                      <p className="text-white font-medium">{response.analysis?.intent || 'unknown'}</p>
                    </div>
                  </div>
                  
                  {/* Strategy */}
                  <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                    <p className="text-xs text-slate-500 mb-1">Strategie</p>
                    <p className="text-slate-300 text-sm">{response.analysis?.response_strategy || ''}</p>
                  </div>
                </div>

                {/* Right: Generated Response */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                    <span>💬</span> Deine Antwort
                  </h3>
                  {/* Generated Response Card */}
                  <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        <span>💬</span> DEINE ANTWORT
                      </h3>
                      <span className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded-full">
                        Von CHIEF generiert
                      </span>
                    </div>
                    <p className="text-white leading-relaxed whitespace-pre-wrap">{response.generated_response}</p>
                  </div>
                </div>
              </div>

              {/* Follow-up Preview */}
              {response.next_step && (
                <div className="bg-slate-800/30 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span className="text-slate-400 text-sm">
                      Follow-up: <span className="text-white font-medium">{formatFollowupTime(response.next_step.hours_until_followup)}</span>
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{response.next_step.reason}</span>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Copy & Send Button - BIG */}
              <button
                onClick={handleCopyAndProceed}
                disabled={isProcessing}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-3 transition-all text-lg shadow-lg shadow-green-500/25"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>📋</span>
                    Kopieren & Senden
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* PHASE: ACTION - Kanal auswählen                        */}
          {/* ═══════════════════════════════════════════════════════ */}
          {phase === 'action' && response && (
            <div className="p-6 space-y-6">
              {/* Success Checkmark with Glow */}
              <div className="flex flex-col items-center py-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-pulse">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mt-4">Nachricht kopiert!</h2>
                <p className="text-slate-400 mt-1">Wähle den Kanal zum Senden:</p>
              </div>

              {/* Channel Buttons */}
              <div className="flex justify-center gap-4">
                {(leadContact?.whatsapp || leadContact?.phone) && (
                  <button
                    onClick={() => handleOpenChannel('whatsapp')}
                    className="flex flex-col items-center gap-2 p-6 bg-green-500/10 border border-green-500/30 rounded-2xl hover:bg-green-500/20 hover:scale-105 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] group-hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]">
                      <span className="text-2xl">📱</span>
                    </div>
                    <span className="text-green-400 font-medium">WhatsApp</span>
                    {response.next_step?.recommended_channel === 'whatsapp' && (
                      <span className="text-[10px] bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full">
                        Empfohlen
                      </span>
                    )}
                  </button>
                )}
                
                {leadContact?.instagram_url && (
                  <button
                    onClick={() => handleOpenChannel('instagram')}
                    className="flex flex-col items-center gap-2 p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-pink-500/30 rounded-2xl hover:from-purple-500/20 hover:to-pink-500/20 hover:scale-105 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.4)] group-hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]">
                      <span className="text-2xl">📸</span>
                    </div>
                    <span className="text-pink-400 font-medium">Instagram</span>
                    {response.next_step?.recommended_channel === 'instagram' && (
                      <span className="text-[10px] bg-pink-500/30 text-pink-300 px-2 py-0.5 rounded-full">
                        Empfohlen
                      </span>
                    )}
                  </button>
                )}
                
                {leadContact?.email && (
                  <button
                    onClick={() => handleOpenChannel('email')}
                    className="flex flex-col items-center gap-2 p-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl hover:bg-blue-500/20 hover:scale-105 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                      <span className="text-2xl">✉️</span>
                    </div>
                    <span className="text-blue-400 font-medium">E-Mail</span>
                  </button>
                )}
              </div>

              {/* No channels fallback */}
              {!leadContact?.whatsapp && !leadContact?.instagram_url && !leadContact?.email && !leadContact?.phone && (
                <div className="text-center py-4">
                  <p className="text-slate-500">Keine Kontaktdaten hinterlegt</p>
                  <button
                    onClick={handleClose}
                    className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                  >
                    Schließen
                  </button>
                </div>
              )}

              {/* Follow-up Banner */}
              {response.next_step && (
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <span>📅</span>
                  </div>
                  <div>
                    <p className="text-cyan-400 font-medium">
                      Follow-up {response.next_step?.display_text || formatFollowupTime(response.next_step.hours_until_followup)} geplant
                    </p>
                    <p className="text-slate-400 text-sm">
                      {response.next_step?.reason || 'CHIEF plant automatisch nach'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              >
                Schließen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplyModal;
