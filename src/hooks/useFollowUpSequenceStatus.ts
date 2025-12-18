/**
 * Hook: useFollowUpSequenceStatus
 * 
 * Prüft für eine Liste von Lead-IDs, ob aktive Follow-up Sequenzen existieren.
 * Verhindert, dass ein Lead mehrere parallele Follow-up-Sequenzen hat.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type LeadFollowUpStatus = {
  leadId: string;
  hasActiveSequence: boolean;
  openTasksCount: number;
  nextDueAt: string | null;
};

export type UseFollowUpSequenceStatusResult = {
  loading: boolean;
  error: string | null;
  statusesByLeadId: Record<string, LeadFollowUpStatus>;
  refetch: () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useFollowUpSequenceStatus(
  leadIds: string[]
): UseFollowUpSequenceStatusResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusesByLeadId, setStatusesByLeadId] = useState<Record<string, LeadFollowUpStatus>>({});

  const fetchStatuses = useCallback(async () => {
    // Wenn keine Lead-IDs, nichts tun
    if (!leadIds || leadIds.length === 0) {
      setLoading(false);
      setError(null);
      setStatusesByLeadId({});
      return;
    }

    // Duplikate entfernen
    const uniqueLeadIds = [...new Set(leadIds)];

    setLoading(true);
    setError(null);

    try {
      // Query: Alle offenen Follow-up Tasks für diese Leads
      const { data, error: queryError } = await supabaseClient
        .from('lead_tasks')
        .select('id, lead_id, task_type, status, due_at')
        .eq('task_type', 'follow_up')
        .eq('status', 'open')
        .in('lead_id', uniqueLeadIds);

      if (queryError) {
        console.error('Follow-up Status Query Fehler:', queryError);
        setError('Follow-up Status konnte nicht geladen werden: ' + queryError.message);
        setStatusesByLeadId({});
        setLoading(false);
        return;
      }

      // Daten nach lead_id gruppieren und Status bauen
      const statusMap: Record<string, LeadFollowUpStatus> = {};

      // Initialisiere alle Lead-IDs mit "keine aktive Sequenz"
      uniqueLeadIds.forEach((leadId) => {
        statusMap[leadId] = {
          leadId,
          hasActiveSequence: false,
          openTasksCount: 0,
          nextDueAt: null,
        };
      });

      // Wenn Tasks gefunden wurden, Status aktualisieren
      if (data && data.length > 0) {
        // Gruppieren nach lead_id
        const tasksByLeadId: Record<string, typeof data> = {};
        
        data.forEach((task) => {
          const leadId = task.lead_id;
          if (!tasksByLeadId[leadId]) {
            tasksByLeadId[leadId] = [];
          }
          tasksByLeadId[leadId].push(task);
        });

        // Für jeden Lead mit Tasks den Status berechnen
        Object.entries(tasksByLeadId).forEach(([leadId, tasks]) => {
          // Frühestes due_at finden
          let earliestDueAt: string | null = null;
          
          tasks.forEach((task) => {
            if (task.due_at) {
              if (!earliestDueAt || new Date(task.due_at) < new Date(earliestDueAt)) {
                earliestDueAt = task.due_at;
              }
            }
          });

          statusMap[leadId] = {
            leadId,
            hasActiveSequence: true,
            openTasksCount: tasks.length,
            nextDueAt: earliestDueAt,
          };
        });
      }

      setStatusesByLeadId(statusMap);
    } catch (err) {
      console.error('Follow-up Status Fehler:', err);
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError('Follow-up Status konnte nicht geladen werden: ' + message);
      setStatusesByLeadId({});
    } finally {
      setLoading(false);
    }
  }, [leadIds.join(',')]); // Dependency auf joined string für Stabilität

  // Initial fetch
  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  return {
    loading,
    error,
    statusesByLeadId,
    refetch: fetchStatuses,
  };
}

