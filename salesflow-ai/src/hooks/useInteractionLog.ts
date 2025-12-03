/**
 * useInteractionLog Hook
 * 
 * Hook zum Laden und Verwalten von Lead Interactions.
 */

import { useCallback, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import type {
  LeadInteraction,
  NewInteraction,
  LeadStats,
} from '@/types/interactions';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface UseInteractionLogReturn {
  interactions: LeadInteraction[];
  stats: LeadStats | null;
  loading: boolean;
  error: string | null;
  fetchInteractions: (leadId: string, limit?: number) => Promise<void>;
  addInteraction: (data: NewInteraction) => Promise<LeadInteraction>;
  getLeadStats: (leadId: string) => Promise<LeadStats | null>;
  refetch: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useInteractionLog(initialLeadId?: string): UseInteractionLogReturn {
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(initialLeadId || null);

  /**
   * Lädt alle Interaktionen für einen Lead
   */
  const fetchInteractions = useCallback(async (leadId: string, limit = 50) => {
    setLoading(true);
    setError(null);
    setCurrentLeadId(leadId);

    try {
      const { data, error: fetchError } = await supabaseClient
        .from('lead_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setInteractions((data as LeadInteraction[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Interaktionen konnten nicht geladen werden.';
      console.error('useInteractionLog fetchInteractions error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fügt eine neue Interaktion hinzu
   */
  const addInteraction = useCallback(async (data: NewInteraction): Promise<LeadInteraction> => {
    setError(null);

    try {
      const { data: newInteraction, error: insertError } = await supabaseClient
        .from('lead_interactions')
        .insert({
          lead_id: data.lead_id,
          type: data.type,
          channel: data.channel,
          outcome: data.outcome || null,
          summary: data.summary || null,
          duration_seconds: data.duration_seconds || null,
          metadata: data.metadata || null,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Optimistic UI: Neue Interaktion an den Anfang der Liste hinzufügen
      if (newInteraction) {
        setInteractions((prev) => [newInteraction as LeadInteraction, ...prev]);
      }

      return newInteraction as LeadInteraction;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Interaktion konnte nicht gespeichert werden.';
      console.error('useInteractionLog addInteraction error:', message);
      setError(message);
      throw new Error(message);
    }
  }, []);

  /**
   * Lädt die Statistiken für einen Lead aus der lead_stats View
   */
  const getLeadStats = useCallback(async (leadId: string): Promise<LeadStats | null> => {
    try {
      const { data, error: fetchError } = await supabaseClient
        .from('lead_stats')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (fetchError) {
        // Wenn kein Eintrag existiert, ist das kein Fehler
        if (fetchError.code === 'PGRST116') {
          return null;
        }
        throw new Error(fetchError.message);
      }

      const statsData = data as LeadStats;
      setStats(statsData);
      return statsData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lead-Statistiken konnten nicht geladen werden.';
      console.error('useInteractionLog getLeadStats error:', message);
      return null;
    }
  }, []);

  /**
   * Lädt die aktuellen Interaktionen neu
   */
  const refetch = useCallback(async () => {
    if (currentLeadId) {
      await fetchInteractions(currentLeadId);
    }
  }, [currentLeadId, fetchInteractions]);

  return {
    interactions,
    stats,
    loading,
    error,
    fetchInteractions,
    addInteraction,
    getLeadStats,
    refetch,
  };
}

// ─────────────────────────────────────────────────────────────────
// Standalone Functions (für Verwendung außerhalb des Hooks)
// ─────────────────────────────────────────────────────────────────

/**
 * Loggt eine DM-Interaktion (z.B. nach Follow-up "Erledigt")
 */
export async function logDmSent(
  leadId: string,
  channel: 'whatsapp' | 'instagram' | 'linkedin' = 'whatsapp',
  summary?: string
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('lead_interactions')
      .insert({
        lead_id: leadId,
        type: 'dm_sent',
        channel,
        summary: summary || 'Nachricht gesendet',
        outcome: 'neutral',
      });

    if (error) {
      console.error('logDmSent error:', error.message);
    }
  } catch (err) {
    console.error('logDmSent error:', err);
  }
}

/**
 * Loggt einen Anruf
 */
export async function logCall(
  leadId: string,
  direction: 'outbound' | 'inbound',
  outcome: 'positive' | 'neutral' | 'negative' | 'no_answer' | 'callback',
  durationSeconds?: number,
  summary?: string
): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('lead_interactions')
      .insert({
        lead_id: leadId,
        type: direction === 'outbound' ? 'call_outbound' : 'call_inbound',
        channel: 'phone',
        outcome,
        duration_seconds: durationSeconds || null,
        summary: summary || null,
      });

    if (error) {
      console.error('logCall error:', error.message);
    }
  } catch (err) {
    console.error('logCall error:', err);
  }
}

/**
 * Loggt eine Notiz
 */
export async function logNote(leadId: string, summary: string): Promise<void> {
  try {
    const { error } = await supabaseClient
      .from('lead_interactions')
      .insert({
        lead_id: leadId,
        type: 'note',
        channel: 'other',
        summary,
      });

    if (error) {
      console.error('logNote error:', error.message);
    }
  } catch (err) {
    console.error('logNote error:', err);
  }
}

