/**
 * useAIChat Hook
 * 
 * Hook für AI Chat mit Lead-Kontext Integration.
 * 
 * WICHTIG: Der Haupt-System-Prompt (SALES_COACH_PROMPT) liegt im Backend:
 * backend/app/core/ai_prompts.py
 * 
 * Dieses Frontend-Modul baut nur den Lead-Kontext, der an den Backend-Prompt
 * angehängt wird. Es gibt KEINE eigene Prompt-Definition mehr im Frontend.
 */

import { useCallback, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import type {
  ChatSession,
  ChatMessage,
  ChatSessionType,
  LeadContext,
} from '@/types/aiChat';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface UseAIChatReturn {
  session: ChatSession | null;
  messages: ChatMessage[];
  leadContext: LeadContext | null;
  loading: boolean;
  sending: boolean;
  error: string | null;
  createSession: (leadId?: string, sessionType?: ChatSessionType) => Promise<ChatSession>;
  sendMessage: (content: string, imageBase64?: string | null) => Promise<ChatMessage | null>;
  fetchLeadContext: (leadId: string) => Promise<LeadContext | null>;
  loadSession: (sessionId: string) => Promise<void>;
  clearChat: () => void;
}

// ─────────────────────────────────────────────────────────────────
// Lead Context Builder (NICHT mehr der volle System-Prompt!)
// ─────────────────────────────────────────────────────────────────
// 
// HINWEIS: Der eigentliche System-Prompt (SALES_COACH_PROMPT) liegt im Backend:
// backend/app/core/ai_prompts.py
// 
// Diese Funktion baut nur den Lead-Kontext, der als Ergänzung an den
// Backend-Prompt angehängt wird. Das "basePrompt" hier ist nur ein
// leichtgewichtiges Frontend-Overlay für die Netlify-Bridge.

export function buildSystemPrompt(context: LeadContext | null): string {
  // Leichtgewichtiges Frontend-Overlay
  // Der vollständige SALES_COACH_PROMPT ist im Backend definiert
  const basePrompt = `Du bist der Sales-Coach von Sales Flow AI.
Antworte IMMER auf Deutsch. Sei kurz, prägnant und actionable.
Berücksichtige den Lead-Kontext bei deinen Antworten.`;

  if (!context) {
    return `${basePrompt}

Kein Lead-Kontext geladen. Beantworte allgemeine Sales-Fragen.`;
  }

  const { lead, score, followup_status, recent_interactions, recent_messages } = context;

  // Format recent interactions
  const interactionsText = recent_interactions.length > 0
    ? recent_interactions.map((i, idx) => 
        `${idx + 1}. ${i.type} via ${i.channel}${i.outcome ? ` (${i.outcome})` : ''} - ${formatRelativeTime(i.created_at)}${i.summary ? `: "${i.summary}"` : ''}`
      ).join('\n')
    : 'Keine bisherigen Interaktionen';

  // Format recent messages
  const messagesText = recent_messages.length > 0
    ? recent_messages.map((m, idx) =>
        `${idx + 1}. ${m.step_code} via ${m.channel} - ${m.sent_at ? formatRelativeTime(m.sent_at) : 'geplant'}${m.message_sent ? `\n   "${m.message_sent.substring(0, 100)}${m.message_sent.length > 100 ? '...' : ''}"` : ''}`
      ).join('\n')
    : 'Keine gesendeten Nachrichten';

  return `${basePrompt}

═══════════════════════════════════════
LEAD-KONTEXT
═══════════════════════════════════════

📋 GRUNDDATEN:
- Name: ${lead.name || 'Unbekannt'}
- Firma: ${lead.company || 'Keine Firma'}
- Branche: ${lead.vertical || 'Nicht kategorisiert'}
- Status: ${lead.status || 'Offen'}
${lead.phone ? `- Telefon: ${lead.phone}` : ''}
${lead.email ? `- E-Mail: ${lead.email}` : ''}
${lead.instagram ? `- Instagram: ${lead.instagram}` : ''}
${lead.notes ? `- Notizen: ${lead.notes}` : ''}

📊 SCORING:
- Gesamtscore: ${score.total_score}/100
- Temperatur: ${score.temperature.toUpperCase()} ${score.temperature === 'hot' ? '🔥' : score.temperature === 'warm' ? '☀️' : '❄️'}
- Engagement: ${score.engagement_score}/100
- Recency: ${score.recency_score}/100
- Fit: ${score.fit_score}/100

📈 FOLLOW-UP STATUS:
- Aktuelle Phase: ${followup_status.current_step || 'Noch nicht gestartet'}
- Phase: ${followup_status.current_phase || '-'}
- Bisherige Versuche: ${followup_status.total_attempts}
- Antwort erhalten: ${followup_status.reply_received ? '✅ Ja' : '❌ Nein'}
- Nächstes Follow-up: ${followup_status.next_followup_at ? formatRelativeTime(followup_status.next_followup_at) : 'Nicht geplant'}
- Letzter Kontakt: ${followup_status.last_contact_at ? formatRelativeTime(followup_status.last_contact_at) : 'Kein Kontakt'}

📞 LETZTE INTERAKTIONEN:
${interactionsText}

💬 LETZTE NACHRICHTEN:
${messagesText}

═══════════════════════════════════════

Hilf dem Vertriebler, diesen Lead optimal zu bearbeiten.
Beziehe dich auf die konkreten Daten oben, wenn relevant.`;
}

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 0) {
    // Future date
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return 'Heute';
    if (futureDays === 1) return 'Morgen';
    return `In ${futureDays} Tagen`;
  }

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useAIChat(initialLeadId?: string): UseAIChatReturn {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [leadContext, setLeadContext] = useState<LeadContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Lädt den Lead-Kontext via Supabase RPC
   */
  const fetchLeadContext = useCallback(async (leadId: string): Promise<LeadContext | null> => {
    try {
      const { data, error: rpcError } = await supabaseClient
        .rpc('get_lead_context_for_ai', { p_lead_id: leadId });

      if (rpcError) {
        console.error('Lead Context RPC Error:', rpcError);
        // Fallback: Direktes Laden der Lead-Daten
        const { data: leadData } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (leadData) {
          const fallbackContext: LeadContext = {
            lead: leadData,
            score: { total_score: 50, temperature: 'warm', engagement_score: 50, recency_score: 50, fit_score: 50 },
            followup_status: { current_step: null, current_phase: null, total_attempts: 0, next_followup_at: null, reply_received: false, last_contact_at: null },
            recent_interactions: [],
            recent_messages: [],
          };
          setLeadContext(fallbackContext);
          return fallbackContext;
        }
        return null;
      }

      const context = data as LeadContext;
      setLeadContext(context);
      return context;
    } catch (err) {
      console.error('fetchLeadContext error:', err);
      return null;
    }
  }, []);

  /**
   * Erstellt eine neue Chat-Session
   */
  const createSession = useCallback(async (
    leadId?: string,
    sessionType: ChatSessionType = 'general'
  ): Promise<ChatSession> => {
    setLoading(true);
    setError(null);

    try {
      // Lead-Kontext laden wenn leadId vorhanden
      if (leadId) {
        await fetchLeadContext(leadId);
      }

      const { data, error: insertError } = await supabaseClient
        .from('ai_chat_sessions')
        .insert({
          lead_id: leadId || null,
          session_type: sessionType,
          title: leadId ? 'Lead Coaching' : 'Allgemeine Fragen',
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      const newSession = data as ChatSession;
      setSession(newSession);
      setMessages([]);

      return newSession;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Session konnte nicht erstellt werden';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [fetchLeadContext]);

  /**
   * Lädt eine existierende Session
   */
  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Session laden
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('ai_chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw new Error(sessionError.message);

      const loadedSession = sessionData as ChatSession;
      setSession(loadedSession);

      // Lead-Kontext laden wenn vorhanden
      if (loadedSession.lead_id) {
        await fetchLeadContext(loadedSession.lead_id);
      }

      // Messages laden
      const { data: messagesData, error: messagesError } = await supabaseClient
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesError) throw new Error(messagesError.message);

      setMessages((messagesData as ChatMessage[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Session konnte nicht geladen werden';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchLeadContext]);

  /**
   * Sendet eine Nachricht und holt AI-Antwort
   */
  const sendMessage = useCallback(async (content: string, imageBase64?: string | null): Promise<ChatMessage | null> => {
    if (!session) {
      setError('Keine aktive Session');
      return null;
    }

    setSending(true);
    setError(null);

    try {
      // 1. User Message speichern
      const { data: userMsg, error: userError } = await supabaseClient
        .from('ai_chat_messages')
        .insert({
          session_id: session.id,
          role: 'user',
          content,
        })
        .select()
        .single();

      if (userError) throw new Error(userError.message);

      const userMessage = userMsg as ChatMessage;
      setMessages(prev => [...prev, userMessage]);

      // 2. AI Response holen
      const systemPrompt = buildSystemPrompt(leadContext);
      
      // Prepare conversation history
      const conversationHistory = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content },
      ];

      // Call AI API
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${apiBase}/api/ai/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: conversationHistory,
          engine: 'gpt',
          message: content,
          image: imageBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'AI konnte nicht antworten' }));
        throw new Error(errorData.error || 'AI konnte nicht antworten');
      }

      const aiData = await response.json();
      
      if (!aiData.reply) {
        throw new Error(aiData.error || 'AI konnte nicht antworten');
      }

      // 3. AI Response speichern
      const { data: aiMsg, error: aiError } = await supabaseClient
        .from('ai_chat_messages')
        .insert({
          session_id: session.id,
          role: 'assistant',
          content: aiData.reply,
        })
        .select()
        .single();

      if (aiError) throw new Error(aiError.message);

      const assistantMessage = aiMsg as ChatMessage;
      setMessages(prev => [...prev, assistantMessage]);

      return assistantMessage;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nachricht konnte nicht gesendet werden';
      setError(message);
      console.error('sendMessage error:', err);
      return null;
    } finally {
      setSending(false);
    }
  }, [session, messages, leadContext]);

  /**
   * Chat zurücksetzen
   */
  const clearChat = useCallback(() => {
    setSession(null);
    setMessages([]);
    setLeadContext(null);
    setError(null);
  }, []);

  return {
    session,
    messages,
    leadContext,
    loading,
    sending,
    error,
    createSession,
    sendMessage,
    fetchLeadContext,
    loadSession,
    clearChat,
  };
}

export default useAIChat;

