/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - AI SERVICE                                                ║
 * ║  OpenAI/Anthropic Integration für DISG-Analyse und Follow-up Generation   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';
import { API_CONFIG, apiPost } from './apiConfig';
import {
  DISC_ANALYZER_SYSTEM_PROMPT,
  buildDiscAnalyzerPrompt,
  quickDiscEstimate,
} from '../prompts/disc-analyzer';
import {
  FOLLOWUP_GENERATOR_SYSTEM_PROMPT,
  buildFollowUpPrompt,
  getQuickFollowUpTemplate,
} from '../prompts/followup-generator';

// Re-export CHIEF Service für einfachen Import
export {
  sendMessageToChief,
  streamMessageToChief,
  ChiefQuickActions,
  handleChiefActions,
  isChiefAvailable,
  getSuggestedPrompts,
} from './chiefService';

// ═══════════════════════════════════════════════════════════════════════════
// API MODE - Lokales Backend oder Supabase Edge Function
// ═══════════════════════════════════════════════════════════════════════════
const USE_LOCAL_BACKEND = true; // true = Lokales Backend, false = Supabase Edge Function

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AI Provider Konfiguration
 * Kann zwischen OpenAI und Anthropic wechseln
 */
const AI_CONFIG = {
  provider: 'openai', // 'openai' | 'anthropic'
  model: 'gpt-4o-mini', // 'gpt-4o-mini' | 'claude-3-haiku-20240307'
  temperature: 0.7,
  maxTokens: 1000,
};

/**
 * API URLs für verschiedene Provider
 */
const API_URLS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  // Supabase Edge Function (empfohlen für Production)
  supabase: '/functions/v1/ai-chat',
};

// ═══════════════════════════════════════════════════════════════════════════
// CORE AI FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sendet einen Prompt an die AI und gibt die Antwort zurück
 * @param {Object} options
 * @param {string} options.systemPrompt
 * @param {string} options.userPrompt
 * @param {boolean} [options.jsonMode=true]
 * @returns {Promise<Object|string>}
 */
async function callAI(options) {
  const { systemPrompt, userPrompt, jsonMode = true } = options;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (USE_LOCAL_BACKEND) {
      // ═══════════════════════════════════════════════════════════════════
      // LOKALES BACKEND (Port 8001)
      // ═══════════════════════════════════════════════════════════════════
      const response = await apiPost(
        '/ai/analyze',
        {
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          json_mode: jsonMode,
          model: AI_CONFIG.model,
        },
        accessToken
      );
      
      if (response?.content) {
        return jsonMode ? JSON.parse(response.content) : response.content;
      }
      if (response?.reply) {
        return jsonMode ? JSON.parse(response.reply) : response.reply;
      }
      return response;
    } else {
      // ═══════════════════════════════════════════════════════════════════
      // SUPABASE EDGE FUNCTION
      // ═══════════════════════════════════════════════════════════════════
      if (accessToken) {
        const response = await supabase.functions.invoke('ai-chat', {
          body: {
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            json_mode: jsonMode,
            model: AI_CONFIG.model,
          },
        });

        if (response.data) {
          return jsonMode ? JSON.parse(response.data.content) : response.data.content;
        }
      }

      throw new Error('Supabase Edge Function nicht verfügbar');
    }
  } catch (error) {
    console.warn('AI call failed:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISC ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analysiert Chat-Nachrichten und gibt DISG-Profil zurück
 * 
 * @param {Object} input
 * @param {Array<{from: 'user'|'lead', text: string, timestamp: string}>} input.messages
 * @param {string} input.leadName
 * @param {string} [input.context]
 * @returns {Promise<{disc_d: number, disc_i: number, disc_s: number, disc_g: number, dominant_style: string, confidence: number, reasoning: string}>}
 */
export async function analyzeDiscProfile(input) {
  const { messages, leadName, context } = input;

  // Mindestens 2 Lead-Nachrichten für AI-Analyse
  const leadMessages = messages.filter(m => m.from === 'lead');
  if (leadMessages.length < 2) {
    console.log('Zu wenige Nachrichten für AI-Analyse, nutze Quick Estimate');
    return {
      ...quickDiscEstimate(messages),
      reasoning: 'Regelbasierte Analyse (zu wenige Nachrichten für AI)',
    };
  }

  try {
    const prompt = buildDiscAnalyzerPrompt({ messages, leadName, context });
    const result = await callAI({
      systemPrompt: DISC_ANALYZER_SYSTEM_PROMPT,
      userPrompt: prompt,
      jsonMode: true,
    });

    // Validiere Ergebnis
    if (!result.disc_d && !result.disc_i && !result.disc_s && !result.disc_g) {
      throw new Error('Ungültiges AI Response Format');
    }

    return result;
  } catch (error) {
    console.warn('AI DISC analysis failed, using fallback:', error.message);
    return {
      ...quickDiscEstimate(messages),
      reasoning: 'Regelbasierte Analyse (AI nicht verfügbar)',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FOLLOW-UP GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert eine personalisierte Follow-up Nachricht
 * 
 * @param {Object} input
 * @param {'de'|'en'} input.language
 * @param {Object} input.companyContext
 * @param {Object} input.lead
 * @param {Object} [input.discProfile]
 * @param {string} input.lastConversationSummary
 * @param {string} [input.lastLeadMessage]
 * @param {string} [input.userNotes]
 * @param {[number, number]} [input.desiredNextWindowDays]
 * @returns {Promise<{message_text: string, suggested_next_contact_at: string, tone_hint: string, explanation_short: string}>}
 */
export async function generateFollowUp(input) {
  try {
    const prompt = buildFollowUpPrompt({
      language: input.language || 'de',
      companyName: input.companyContext?.company_name || 'Unser Unternehmen',
      productName: input.companyContext?.product_name || 'Unser Produkt',
      productBenefit: input.companyContext?.product_short_benefit || 'Nutzen für den Kunden',
      complianceNotes: input.companyContext?.compliance_notes,
      leadName: input.lead.name,
      leadStatus: input.lead.status,
      decisionState: input.lead.decision_state || 'no_decision',
      lastContactAt: input.lead.last_contact_at,
      lastChannel: input.lead.last_channel || 'whatsapp',
      discProfile: input.discProfile,
      lastConversationSummary: input.lastConversationSummary,
      lastLeadMessage: input.lastLeadMessage,
      userNotes: input.userNotes,
      desiredNextDays: input.desiredNextWindowDays,
    });

    const result = await callAI({
      systemPrompt: FOLLOWUP_GENERATOR_SYSTEM_PROMPT,
      userPrompt: prompt,
      jsonMode: true,
    });

    // Validiere Ergebnis
    if (!result.message_text) {
      throw new Error('Ungültiges AI Response Format');
    }

    return result;
  } catch (error) {
    console.warn('AI follow-up generation failed, using template:', error.message);
    
    // Fallback zu Template
    const template = getQuickFollowUpTemplate({
      leadName: input.lead.name,
      discStyle: input.discProfile?.dominant_style || 'S',
      decisionState: input.lead.decision_state || 'no_decision',
      daysSinceContact: input.lead.last_contact_at
        ? Math.floor((Date.now() - new Date(input.lead.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
        : 3,
    });

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + template.suggested_days);

    return {
      message_text: template.message_text,
      suggested_next_contact_at: nextDate.toISOString(),
      tone_hint: template.tone_hint,
      explanation_short: 'Template-basierte Nachricht (AI nicht verfügbar)',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analysiert mehrere Leads auf einmal (für Background Jobs)
 * @param {Array<{leadId: string, leadName: string, messages: Array}>} leads
 * @returns {Promise<Map<string, Object>>}
 */
export async function batchAnalyzeDiscProfiles(leads) {
  const results = new Map();

  for (const lead of leads) {
    try {
      const analysis = await analyzeDiscProfile({
        messages: lead.messages,
        leadName: lead.leadName,
      });
      results.set(lead.leadId, analysis);
    } catch (error) {
      console.error(`Failed to analyze lead ${lead.leadId}:`, error);
      results.set(lead.leadId, {
        error: error.message,
        ...quickDiscEstimate(lead.messages),
      });
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATION SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt eine Zusammenfassung eines Gesprächs
 * @param {Array<{from: string, text: string}>} messages
 * @param {string} leadName
 * @returns {Promise<string>}
 */
export async function summarizeConversation(messages, leadName) {
  const SUMMARY_PROMPT = `
Fasse dieses Verkaufsgespräch in 2-3 Sätzen zusammen.
Fokussiere auf: Status des Leads, Interesse, offene Punkte, nächste Schritte.

CHAT:
${messages.map(m => `[${m.from === 'lead' ? leadName : 'Vertriebler'}]: ${m.text}`).join('\n')}

ZUSAMMENFASSUNG (nur Text, kein JSON):
`;

  try {
    const result = await callAI({
      systemPrompt: 'Du bist ein hilfreicher Assistent, der Verkaufsgespräche zusammenfasst.',
      userPrompt: SUMMARY_PROMPT,
      jsonMode: false,
    });

    return typeof result === 'string' ? result : result.summary || 'Keine Zusammenfassung verfügbar';
  } catch (error) {
    console.warn('Conversation summary failed:', error.message);
    return `Gespräch mit ${leadName} - ${messages.length} Nachrichten`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

// Import CHIEF functions for default export
import chiefService from './chiefService';

export default {
  // DISC & Follow-up
  analyzeDiscProfile,
  generateFollowUp,
  batchAnalyzeDiscProfiles,
  summarizeConversation,
  // CHIEF Chat
  ...chiefService,
};

