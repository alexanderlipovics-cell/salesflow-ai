/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useLearning Hook                                                          ║
 * ║  React Hook für Learning Events & Template Stats                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback } from 'react';
import { 
  learningApi, 
  TemplateStats,
  ChannelStats,
  TopTemplate,
  LearningEventType,
} from '../api/learning';

export interface UseLearningReturn {
  // State
  templateStats: TemplateStats | null;
  channelStats: ChannelStats[];
  topTemplates: TopTemplate[];
  loading: boolean;
  error: string | null;
  
  // Stats Actions
  loadTemplateStats: (templateId: string, options?: { fromDate?: string; toDate?: string }) => Promise<void>;
  loadChannelStats: (options?: { fromDate?: string; toDate?: string }) => Promise<void>;
  loadTopTemplates: (options?: { verticalId?: string; channel?: string; lookbackDays?: number }) => Promise<void>;
  
  // Event Logging
  logMessageSent: (data: { leadId: string; templateId?: string; channel?: string; wasEdited?: boolean }) => Promise<void>;
  logReplyReceived: (data: { leadId: string; isPositive?: boolean; templateId?: string }) => Promise<void>;
  logDealOutcome: (data: { leadId: string; won: boolean; templateId?: string; dealValue?: number }) => Promise<void>;
  logCallBooked: (leadId: string, templateId?: string) => Promise<void>;
  logMeetingHeld: (leadId: string, templateId?: string) => Promise<void>;
}

export function useLearning(): UseLearningReturn {
  const [templateStats, setTemplateStats] = useState<TemplateStats | null>(null);
  const [channelStats, setChannelStats] = useState<ChannelStats[]>([]);
  const [topTemplates, setTopTemplates] = useState<TopTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Template Stats
  const loadTemplateStats = useCallback(async (templateId: string, options?: { fromDate?: string; toDate?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await learningApi.getTemplateStats(templateId, options);
      setTemplateStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Channel Stats
  const loadChannelStats = useCallback(async (options?: { fromDate?: string; toDate?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await learningApi.getChannelStats(options);
      setChannelStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Top Templates
  const loadTopTemplates = useCallback(async (options?: { verticalId?: string; channel?: string; lookbackDays?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await learningApi.getTopTemplates(options);
      setTopTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Log Message Sent
  const logMessageSent = useCallback(async (data: { leadId: string; templateId?: string; channel?: string; wasEdited?: boolean }) => {
    try {
      await learningApi.logMessageSent({
        lead_id: data.leadId,
        template_id: data.templateId,
        channel: data.channel,
        was_edited: data.wasEdited,
      });
    } catch (err) {
      console.error('Failed to log message sent:', err);
    }
  }, []);

  // Log Reply Received
  const logReplyReceived = useCallback(async (data: { leadId: string; isPositive?: boolean; templateId?: string }) => {
    try {
      await learningApi.logReplyReceived({
        lead_id: data.leadId,
        is_positive: data.isPositive,
        template_id: data.templateId,
      });
    } catch (err) {
      console.error('Failed to log reply received:', err);
    }
  }, []);

  // Log Deal Outcome
  const logDealOutcome = useCallback(async (data: { leadId: string; won: boolean; templateId?: string; dealValue?: number }) => {
    try {
      await learningApi.logDealOutcome({
        lead_id: data.leadId,
        won: data.won,
        template_id: data.templateId,
        deal_value: data.dealValue,
      });
    } catch (err) {
      console.error('Failed to log deal outcome:', err);
    }
  }, []);

  // Log Call Booked
  const logCallBooked = useCallback(async (leadId: string, templateId?: string) => {
    try {
      await learningApi.logCallBooked(leadId, { templateId });
    } catch (err) {
      console.error('Failed to log call booked:', err);
    }
  }, []);

  // Log Meeting Held
  const logMeetingHeld = useCallback(async (leadId: string, templateId?: string) => {
    try {
      await learningApi.logMeetingHeld(leadId, { templateId });
    } catch (err) {
      console.error('Failed to log meeting held:', err);
    }
  }, []);

  return {
    templateStats,
    channelStats,
    topTemplates,
    loading,
    error,
    loadTemplateStats,
    loadChannelStats,
    loadTopTemplates,
    logMessageSent,
    logReplyReceived,
    logDealOutcome,
    logCallBooked,
    logMeetingHeld,
  };
}

export default useLearning;

