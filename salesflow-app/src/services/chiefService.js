/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - CHIEF SERVICE                                                   ║
 * ║  Service für CHIEF AI Agent Integration                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * CHIEF = Coach + Helper + Intelligence + Expert + Friend
 * 
 * Dieser Service verbindet:
 * - CHIEF System Prompt
 * - Daily Flow Context
 * - Vertical-spezifische Anpassungen
 * - Lead-Vorschläge
 * - Action-Tag Handling
 */

import { supabase } from './supabase';
import {
  CHIEF_SYSTEM_PROMPT,
  buildChiefSystemMessages,
  formatChiefContext,
  extractActionTags,
  stripActionTags,
  shouldIncludeExamples,
} from '../prompts/chief-prompt';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CHIEF_CONFIG = {
  model: 'gpt-4o-mini', // Schnell und günstig für Chat
  temperature: 0.8, // Etwas kreativer für natürlichere Antworten
  maxTokens: 1500, // Genug für ausführliche Antworten
  maxHistoryMessages: 10, // Anzahl Messages im Context
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} ChiefMessage
 * @property {'user'|'assistant'} role
 * @property {string} content
 * @property {string} [timestamp]
 * @property {Array<{action: string, params: string[]}>} [actions]
 */

/**
 * @typedef {Object} ChiefContext
 * @property {Object} [dailyFlow] - Daily Flow Status
 * @property {Object} [vertical] - Vertical Profile
 * @property {Array} [suggestedLeads] - Vorgeschlagene Leads
 * @property {Object} [userProfile] - User Profil
 * @property {Object} [currentGoal] - Aktuelles Ziel
 */

/**
 * @typedef {Object} ChiefResponse
 * @property {string} content - Die Antwort (ohne Action Tags)
 * @property {string} rawContent - Die Rohantwort (mit Action Tags)
 * @property {Array<{action: string, params: string[]}>} actions - Extrahierte Actions
 * @property {string} timestamp
 * @property {boolean} success
 * @property {string} [error]
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CHAT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sendet eine Nachricht an CHIEF und gibt die Antwort zurück
 * 
 * @param {Object} options
 * @param {string} options.message - Die User-Nachricht
 * @param {ChiefMessage[]} [options.history] - Chat-Verlauf
 * @param {ChiefContext} [options.context] - Kontext-Daten
 * @returns {Promise<ChiefResponse>}
 * 
 * @example
 * const response = await sendMessageToChief({
 *   message: "Wie stehe ich heute?",
 *   context: { dailyFlow: dailyFlowStatus },
 * });
 */
export async function sendMessageToChief(options) {
  const { message, history = [], context = {} } = options;

  try {
    // 1. System Messages bauen
    const contextText = formatChiefContext(context);
    const includeExamples = shouldIncludeExamples(message);
    
    const systemMessages = buildChiefSystemMessages({
      contextText: contextText || undefined,
      includeExamples,
    });

    // 2. Chat History formatieren (begrenzt auf maxHistoryMessages)
    const recentHistory = history
      .slice(-CHIEF_CONFIG.maxHistoryMessages)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    // 3. Messages Array bauen
    const messages = [
      ...systemMessages,
      ...recentHistory,
      { role: 'user', content: message },
    ];

    // 4. AI Call via Supabase Edge Function
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      throw new Error('Nicht eingeloggt');
    }

    const response = await supabase.functions.invoke('ai-chat', {
      body: {
        messages, // Kompletter Message Array für Chat
        model: CHIEF_CONFIG.model,
        temperature: CHIEF_CONFIG.temperature,
        max_tokens: CHIEF_CONFIG.maxTokens,
        mode: 'chief-chat', // Spezial-Mode für Edge Function
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'AI Request failed');
    }

    const rawContent = response.data?.content || '';
    
    // 5. Action Tags extrahieren
    const actions = extractActionTags(rawContent);
    const content = stripActionTags(rawContent);

    return {
      content,
      rawContent,
      actions,
      timestamp: new Date().toISOString(),
      success: true,
    };

  } catch (error) {
    console.error('CHIEF Chat Error:', error);
    
    return {
      content: getErrorFallbackMessage(error.message),
      rawContent: '',
      actions: [],
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STREAMING CHAT (für bessere UX)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sendet eine Nachricht an CHIEF mit Streaming Response
 * 
 * @param {Object} options
 * @param {string} options.message - Die User-Nachricht
 * @param {ChiefMessage[]} [options.history] - Chat-Verlauf
 * @param {ChiefContext} [options.context] - Kontext-Daten
 * @param {function(string): void} options.onChunk - Callback für jeden Chunk
 * @param {function(ChiefResponse): void} options.onComplete - Callback wenn fertig
 * @param {function(Error): void} [options.onError] - Callback bei Fehler
 */
export async function streamMessageToChief(options) {
  const { message, history = [], context = {}, onChunk, onComplete, onError } = options;

  try {
    // System Messages bauen
    const contextText = formatChiefContext(context);
    const includeExamples = shouldIncludeExamples(message);
    
    const systemMessages = buildChiefSystemMessages({
      contextText: contextText || undefined,
      includeExamples,
    });

    // Messages Array
    const recentHistory = history
      .slice(-CHIEF_CONFIG.maxHistoryMessages)
      .map(msg => ({ role: msg.role, content: msg.content }));

    const messages = [
      ...systemMessages,
      ...recentHistory,
      { role: 'user', content: message },
    ];

    // Auth Token holen
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      throw new Error('Nicht eingeloggt');
    }

    // Streaming Request
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 
                        process.env.EXPO_PUBLIC_SUPABASE_URL;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat-stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: CHIEF_CONFIG.model,
        temperature: CHIEF_CONFIG.temperature,
        max_tokens: CHIEF_CONFIG.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Stream lesen
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullContent += chunk;
      onChunk(chunk);
    }

    // Final Response
    const actions = extractActionTags(fullContent);
    const content = stripActionTags(fullContent);

    onComplete({
      content,
      rawContent: fullContent,
      actions,
      timestamp: new Date().toISOString(),
      success: true,
    });

  } catch (error) {
    console.error('CHIEF Streaming Error:', error);
    
    if (onError) {
      onError(error);
    }

    onComplete({
      content: getErrorFallbackMessage(error.message),
      rawContent: '',
      actions: [],
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick-Actions für häufige CHIEF Anfragen
 */
export const ChiefQuickActions = {
  /**
   * Tagesstatus abfragen
   * @param {ChiefContext} context
   * @returns {Promise<ChiefResponse>}
   */
  async getDailyStatus(context) {
    return sendMessageToChief({
      message: 'Wie stehe ich heute? Gib mir einen kurzen Überblick.',
      context,
    });
  },

  /**
   * Nächste Aktion vorschlagen
   * @param {ChiefContext} context
   * @returns {Promise<ChiefResponse>}
   */
  async getNextAction(context) {
    return sendMessageToChief({
      message: 'Was sollte ich jetzt als nächstes tun?',
      context,
    });
  },

  /**
   * Motivations-Boost
   * @param {ChiefContext} context
   * @returns {Promise<ChiefResponse>}
   */
  async getMotivation(context) {
    return sendMessageToChief({
      message: 'Ich brauche etwas Motivation. Was kannst du mir sagen?',
      context,
    });
  },

  /**
   * Einwandbehandlung Hilfe
   * @param {string} objection - Der Einwand
   * @param {ChiefContext} context
   * @returns {Promise<ChiefResponse>}
   */
  async getObjectionHelp(objection, context) {
    return sendMessageToChief({
      message: `Mein Lead hat gerade gesagt: "${objection}". Wie reagiere ich am besten?`,
      context,
    });
  },

  /**
   * Follow-up Vorschlag
   * @param {string} leadName
   * @param {string} lastContact - Zusammenfassung letzter Kontakt
   * @param {ChiefContext} context
   * @returns {Promise<ChiefResponse>}
   */
  async getFollowUpSuggestion(leadName, lastContact, context) {
    return sendMessageToChief({
      message: `Ich möchte ${leadName} kontaktieren. Letzter Kontakt: ${lastContact}. Was soll ich schreiben?`,
      context,
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verarbeitet Action-Tags aus CHIEF Response
 * @param {Array<{action: string, params: string[]}>} actions
 * @param {Object} handlers - Custom Handler für Actions
 */
export function handleChiefActions(actions, handlers = {}) {
  const defaultHandlers = {
    FOLLOWUP_LEADS: (params) => {
      console.log('Open follow-up panel for leads:', params);
      // Navigation oder State Update
    },
    NEW_CONTACT_LIST: () => {
      console.log('Open new contacts list');
    },
    COMPOSE_MESSAGE: (params) => {
      console.log('Open message composer for lead:', params[0]);
    },
    LOG_ACTIVITY: (params) => {
      console.log('Log activity:', params);
    },
    OBJECTION_HELP: (params) => {
      console.log('Open objection brain for:', params[0]);
    },
  };

  const mergedHandlers = { ...defaultHandlers, ...handlers };

  actions.forEach(({ action, params }) => {
    const handler = mergedHandlers[action];
    if (handler) {
      handler(params);
    } else {
      console.warn(`Unknown CHIEF action: ${action}`);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fallback-Nachricht bei Fehler
 * @param {string} errorMessage
 * @returns {string}
 */
function getErrorFallbackMessage(errorMessage) {
  if (errorMessage.includes('Nicht eingeloggt')) {
    return 'Hey, du musst dich erst einloggen, damit ich dir helfen kann! 🔐';
  }
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return 'Ups, ich bin gerade etwas überlastet. Versuch es in ein paar Sekunden nochmal! ⏳';
  }

  return `Hmm, da ist was schiefgelaufen. 🤔 Versuch es nochmal, oder check deine Internetverbindung.

Falls das Problem bleibt, melde dich beim Support.`;
}

/**
 * Prüft ob CHIEF verfügbar ist
 * @returns {Promise<boolean>}
 */
export async function isChiefAvailable() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    return !!sessionData?.session?.access_token;
  } catch {
    return false;
  }
}

/**
 * Suggested Prompts basierend auf Kontext
 * @param {ChiefContext} context
 * @returns {Array<{text: string, icon: string}>}
 */
export function getSuggestedPrompts(context) {
  const suggestions = [];

  // Daily Flow basierte Vorschläge
  if (context?.dailyFlow) {
    const { statusLevel, remaining } = context.dailyFlow;

    if (statusLevel === 'behind' || statusLevel === 'slightly_behind') {
      suggestions.push({
        text: 'Hilf mir, wieder auf Kurs zu kommen',
        icon: '🎯',
      });
    }

    if (remaining?.followups > 0) {
      suggestions.push({
        text: `Zeig mir die ${remaining.followups} wichtigsten Follow-ups`,
        icon: '📋',
      });
    }

    if (remaining?.contacts > 0) {
      suggestions.push({
        text: 'Wer könnte heute ein guter neuer Kontakt sein?',
        icon: '🆕',
      });
    }
  }

  // Standard-Vorschläge
  suggestions.push(
    { text: 'Wie stehe ich heute?', icon: '📊' },
    { text: 'Gib mir Tipps für Einwände', icon: '💡' },
    { text: 'Ich brauche Motivation!', icon: '💪' },
  );

  return suggestions.slice(0, 4); // Max 4 Vorschläge
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  sendMessageToChief,
  streamMessageToChief,
  ChiefQuickActions,
  handleChiefActions,
  isChiefAvailable,
  getSuggestedPrompts,
};

