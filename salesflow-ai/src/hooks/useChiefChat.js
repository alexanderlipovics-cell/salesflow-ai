/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - CHIEF CHAT HOOK                                           ║
 * ║  React Hook für CHIEF AI Chat Integration                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  sendMessageToChief,
  handleChiefActions,
  getSuggestedPrompts,
} from '../services/chiefService';
import { useChiefDailyFlowContext } from './useChiefDailyFlowContext';
import { useVertical } from './useVertical';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {'user'|'assistant'} role
 * @property {string} content
 * @property {string} timestamp
 * @property {Array<{action: string, params: string[]}>} [actions]
 * @property {boolean} [isLoading]
 * @property {boolean} [hasError]
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * React Hook für CHIEF Chat
 * 
 * @param {Object} options
 * @param {string} [options.companyId='default'] - Company ID für Daily Flow
 * @param {Object} [options.userProfile] - User Profil
 * @param {Object} [options.actionHandlers] - Custom Action Handler
 * @returns {Object} Chat State und Funktionen
 * 
 * @example
 * const {
 *   messages,
 *   isLoading,
 *   sendMessage,
 *   clearChat,
 *   suggestedPrompts,
 * } = useChiefChat({ companyId: 'my-company' });
 */
export function useChiefChat(options = {}) {
  const { companyId = 'default', userProfile, actionHandlers } = options;

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────
  
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const messageIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT
  // ─────────────────────────────────────────────────────────────────────────
  
  const dailyFlowContext = useChiefDailyFlowContext(companyId);
  const { currentVertical } = useVertical();

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD CONTEXT
  // ─────────────────────────────────────────────────────────────────────────
  
  const buildContext = useCallback(() => {
    const context = {};

    // User Profile
    if (userProfile) {
      context.userProfile = userProfile;
    }

    // Vertical
    if (currentVertical) {
      context.vertical = {
        name: currentVertical.id,
        terminology: currentVertical.terminology,
      };
    }

    // Daily Flow
    if (dailyFlowContext) {
      context.dailyFlow = {
        date: new Date().toLocaleDateString('de-DE'),
        statusLevel: dailyFlowContext.statusLevel,
        avgRatio: dailyFlowContext.avgRatio,
        // ... weitere Felder können hier ergänzt werden
      };
    }

    return context;
  }, [userProfile, currentVertical, dailyFlowContext]);

  // ─────────────────────────────────────────────────────────────────────────
  // GENERATE MESSAGE ID
  // ─────────────────────────────────────────────────────────────────────────
  
  const generateMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return `msg-${Date.now()}-${messageIdRef.current}`;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────────────────────────────────
  
  const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage.trim() || isLoading) return;

    setError(null);

    // User Message hinzufügen
    const userMsg = {
      id: generateMessageId(),
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    // Placeholder für Assistant Message
    const assistantMsgId = generateMessageId();
    const assistantPlaceholder = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, assistantPlaceholder]);
    setIsLoading(true);

    try {
      // Kontext bauen
      const context = buildContext();

      // History für CHIEF (ohne Placeholder)
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // CHIEF aufrufen
      const response = await sendMessageToChief({
        message: userMessage.trim(),
        history,
        context,
      });

      // Assistant Message updaten
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: response.content,
                actions: response.actions,
                isLoading: false,
                hasError: !response.success,
              }
            : m
        )
      );

      // Actions verarbeiten
      if (response.actions && response.actions.length > 0) {
        handleChiefActions(response.actions, actionHandlers);
      }

    } catch (err) {
      console.error('CHIEF Chat Error:', err);
      setError(err.message);

      // Error Message anzeigen
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: 'Ups, da ist was schiefgelaufen. Versuch es nochmal! 🤔',
                isLoading: false,
                hasError: true,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, buildContext, generateMessageId, actionHandlers]);

  // ─────────────────────────────────────────────────────────────────────────
  // ABORT REQUEST
  // ─────────────────────────────────────────────────────────────────────────
  
  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // CLEAR CHAT
  // ─────────────────────────────────────────────────────────────────────────
  
  const clearChat = useCallback(() => {
    abortRequest();
    setMessages([]);
    setError(null);
  }, [abortRequest]);

  // ─────────────────────────────────────────────────────────────────────────
  // RETRY LAST MESSAGE
  // ─────────────────────────────────────────────────────────────────────────
  
  const retryLastMessage = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Entferne letzte Assistant Message und retry
      setMessages(prev => prev.slice(0, -1));
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  // ─────────────────────────────────────────────────────────────────────────
  // SUGGESTED PROMPTS
  // ─────────────────────────────────────────────────────────────────────────
  
  const suggestedPrompts = getSuggestedPrompts({
    dailyFlow: dailyFlowContext,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // WELCOME MESSAGE
  // ─────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    // Welcome Message beim ersten Render
    if (messages.length === 0) {
      const welcomeMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Hey! 👋 Ich bin CHIEF, dein persönlicher Sales-Coach.

Wie kann ich dir heute helfen?

${suggestedPrompts.map(s => `${s.icon} ${s.text}`).join('\n')}`,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, []); // Nur beim ersten Render

  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    return () => {
      abortRequest();
    };
  }, [abortRequest]);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────
  
  return {
    // State
    messages,
    isLoading,
    error,
    
    // Actions
    sendMessage,
    clearChat,
    retryLastMessage,
    abortRequest,
    
    // Helpers
    suggestedPrompts,
    dailyFlowContext,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default useChiefChat;

