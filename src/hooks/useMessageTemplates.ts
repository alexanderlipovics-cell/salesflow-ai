/**
 * useMessageTemplates Hook
 * 
 * Lädt branchen-spezifische Message Templates aus der Supabase-Tabelle `message_templates`
 * und bietet Funktionen zur Personalisierung von Nachrichten.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import type { FollowUpStepCode, FollowUpChannel } from '@/types/followUp';
import {
  getFollowUpTemplateByKey,
  buildMessageForVertical,
  personalizeMessage,
  mapToLeadVertical,
  type LeadVertical,
} from '@/config/followupSequence';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

/** Vertical types supported by message_templates table */
export type MessageTemplateVertical = 'immobilien' | 'network' | 'finance' | 'generic';

/** Tone for message templates */
export type MessageTemplateTone = 'professional' | 'casual' | 'formal';

/** Database row from message_templates table */
export interface MessageTemplate {
  id: string;
  step_key: FollowUpStepCode;
  vertical: MessageTemplateVertical;
  channel: FollowUpChannel;
  tone: MessageTemplateTone;
  message_content: string;
  subject?: string | null;
  is_active: boolean;
  priority: number; // Higher = more specific match
  created_at?: string;
  updated_at?: string;
}

/** Lead data for personalization */
export interface LeadForPersonalization {
  name?: string | null;
  company?: string | null;
  vertical?: string | null;
  [key: string]: unknown;
}

/** Result of fetching a template */
export interface TemplateResult {
  template: MessageTemplate | null;
  personalizedMessage: string;
  isVerticalSpecific: boolean;
  usedVertical: LeadVertical | MessageTemplateVertical;
  source: 'database' | 'fallback';
}

// ──────────────────────────────────────────────────────────────────────────────
// Vertical Mapping
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Maps LeadVertical to MessageTemplateVertical
 */
function mapToMessageTemplateVertical(vertical?: string | null): MessageTemplateVertical {
  if (!vertical) return 'generic';
  
  const normalized = vertical.toLowerCase().trim();
  
  // Immobilien / Real Estate
  if (
    normalized === 'real_estate' ||
    normalized === 'realestate' ||
    normalized === 'immo' ||
    normalized === 'immobilien' ||
    normalized === 'makler'
  ) {
    return 'immobilien';
  }
  
  // Network Marketing
  if (
    normalized === 'network' ||
    normalized === 'network_marketing' ||
    normalized === 'networkmarketing' ||
    normalized === 'mlm'
  ) {
    return 'network';
  }
  
  // Finance
  if (
    normalized === 'finance' ||
    normalized === 'finanz' ||
    normalized === 'financial' ||
    normalized === 'finanzberatung' ||
    normalized === 'versicherung' ||
    normalized === 'insurance'
  ) {
    return 'finance';
  }
  
  return 'generic';
}

/**
 * Returns human-readable label for vertical
 */
export function getVerticalLabel(vertical: MessageTemplateVertical | LeadVertical): string {
  const labels: Record<string, string> = {
    immobilien: 'Immobilien',
    real_estate: 'Immobilien',
    network: 'Network',
    finance: 'Finance',
    generic: 'Standard',
  };
  return labels[vertical] || 'Standard';
}

// ──────────────────────────────────────────────────────────────────────────────
// Personalization
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Replaces placeholders in template with lead data
 * Supports: {{name}}, {{company}}, {{vertical}}
 */
export function generatePersonalizedMessage(
  templateContent: string,
  lead: LeadForPersonalization
): string {
  let message = templateContent;
  
  // {{name}} - Use first name only
  if (lead.name) {
    const firstName = lead.name.split(' ')[0];
    message = message.replace(/\{\{name\}\}/gi, firstName);
  } else {
    message = message.replace(/\{\{name\}\}/gi, '');
  }
  
  // {{company}}
  if (lead.company) {
    message = message.replace(/\{\{company\}\}/gi, lead.company);
  } else {
    message = message.replace(/\{\{company\}\}/gi, '');
  }
  
  // {{vertical}} - Human readable label
  const verticalLabel = getVerticalLabel(mapToMessageTemplateVertical(lead.vertical));
  message = message.replace(/\{\{vertical\}\}/gi, verticalLabel);
  
  // Clean up double spaces
  message = message.replace(/\s{2,}/g, ' ').trim();
  
  return message;
}

// ──────────────────────────────────────────────────────────────────────────────
// Fetch Template Function
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches the best matching template from the database
 * Falls back to follow_up_templates default if no match
 */
export async function fetchTemplateForLead(
  stepKey: FollowUpStepCode,
  vertical?: string | null,
  channel?: FollowUpChannel | null,
  tone: MessageTemplateTone = 'casual'
): Promise<TemplateResult> {
  const mappedVertical = mapToMessageTemplateVertical(vertical);
  
  try {
    // Build query with priority matching
    // 1. Exact match: step_key + vertical + channel
    // 2. step_key + vertical (any channel)
    // 3. step_key + generic vertical
    
    let query = supabaseClient
      .from('message_templates')
      .select('*')
      .eq('step_key', stepKey)
      .eq('is_active', true)
      .order('priority', { ascending: false });
    
    // Try to find specific match first
    if (channel) {
      const { data: exactMatch, error: exactError } = await supabaseClient
        .from('message_templates')
        .select('*')
        .eq('step_key', stepKey)
        .eq('vertical', mappedVertical)
        .eq('channel', channel)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single();
      
      if (!exactError && exactMatch) {
        return {
          template: exactMatch as MessageTemplate,
          personalizedMessage: exactMatch.message_content,
          isVerticalSpecific: mappedVertical !== 'generic',
          usedVertical: mappedVertical,
          source: 'database',
        };
      }
    }
    
    // Try vertical match without channel
    const { data: verticalMatch, error: verticalError } = await supabaseClient
      .from('message_templates')
      .select('*')
      .eq('step_key', stepKey)
      .eq('vertical', mappedVertical)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();
    
    if (!verticalError && verticalMatch) {
      return {
        template: verticalMatch as MessageTemplate,
        personalizedMessage: verticalMatch.message_content,
        isVerticalSpecific: mappedVertical !== 'generic',
        usedVertical: mappedVertical,
        source: 'database',
      };
    }
    
    // Try generic fallback from database
    const { data: genericMatch, error: genericError } = await supabaseClient
      .from('message_templates')
      .select('*')
      .eq('step_key', stepKey)
      .eq('vertical', 'generic')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();
    
    if (!genericError && genericMatch) {
      return {
        template: genericMatch as MessageTemplate,
        personalizedMessage: genericMatch.message_content,
        isVerticalSpecific: false,
        usedVertical: 'generic',
        source: 'database',
      };
    }
    
    // Ultimate fallback: Use local followupSequence config
    const fallbackTemplate = getFollowUpTemplateByKey(stepKey);
    if (fallbackTemplate) {
      const { usedVertical, message } = buildMessageForVertical(fallbackTemplate, vertical);
      return {
        template: null,
        personalizedMessage: message,
        isVerticalSpecific: usedVertical !== 'generic',
        usedVertical,
        source: 'fallback',
      };
    }
    
    // No template found anywhere
    return {
      template: null,
      personalizedMessage: '',
      isVerticalSpecific: false,
      usedVertical: 'generic',
      source: 'fallback',
    };
    
  } catch (error) {
    console.error('Error fetching message template:', error);
    
    // Fallback to local config on error
    const fallbackTemplate = getFollowUpTemplateByKey(stepKey);
    if (fallbackTemplate) {
      const { usedVertical, message } = buildMessageForVertical(fallbackTemplate, vertical);
      return {
        template: null,
        personalizedMessage: message,
        isVerticalSpecific: usedVertical !== 'generic',
        usedVertical,
        source: 'fallback',
      };
    }
    
    return {
      template: null,
      personalizedMessage: '',
      isVerticalSpecific: false,
      usedVertical: 'generic',
      source: 'fallback',
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// React Query Hook
// ──────────────────────────────────────────────────────────────────────────────

interface UseMessageTemplateOptions {
  stepKey: FollowUpStepCode;
  vertical?: string | null;
  channel?: FollowUpChannel | null;
  lead?: LeadForPersonalization | null;
  enabled?: boolean;
}

/**
 * React Query hook for fetching and personalizing message templates
 */
export function useMessageTemplate({
  stepKey,
  vertical,
  channel,
  lead,
  enabled = true,
}: UseMessageTemplateOptions) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['message-template', stepKey, vertical, channel],
    queryFn: () => fetchTemplateForLead(stepKey, vertical, channel),
    enabled: enabled && !!stepKey,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
  
  // Generate personalized message when data and lead are available
  const personalizedMessage = query.data && lead
    ? generatePersonalizedMessage(query.data.personalizedMessage, lead)
    : query.data?.personalizedMessage ?? '';
  
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['message-template', stepKey, vertical, channel] });
  }, [queryClient, stepKey, vertical, channel]);
  
  return {
    ...query,
    personalizedMessage,
    isVerticalSpecific: query.data?.isVerticalSpecific ?? false,
    usedVertical: query.data?.usedVertical ?? 'generic',
    source: query.data?.source ?? 'fallback',
    refetchTemplate: refetch,
  };
}

/**
 * Hook to fetch all templates for a step (for preview/editing)
 */
export function useMessageTemplatesForStep(stepKey: FollowUpStepCode) {
  return useQuery({
    queryKey: ['message-templates', 'step', stepKey],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('message_templates')
        .select('*')
        .eq('step_key', stepKey)
        .eq('is_active', true)
        .order('vertical', { ascending: true })
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as MessageTemplate[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export default useMessageTemplate;

