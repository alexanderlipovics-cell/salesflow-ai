/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  USE FOLLOW-UPS HOOK                                                       ║
 * ║  Verbindet Follow-ups mit Daily Flow System                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Dieser Hook:
 * - Lädt Follow-ups aus der API/Demo-Daten
 * - Synchronisiert mit Daily Flow bei Änderungen
 * - Stellt einheitliche Completion-Funktion bereit
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_CONFIG } from '../services/apiConfig';

// API URL
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

// =============================================================================
// DEMO DATA
// =============================================================================

const generateDemoFollowUps = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return [
    {
      id: '1',
      lead_name: 'Max Mustermann',
      lead_id: '1',
      action: 'call',
      description: 'Angebot besprechen',
      due_date: new Date().toISOString().split('T')[0],
      priority: 'high',
      completed: false,
      source: 'manual',
    },
    {
      id: '2',
      lead_name: 'Anna Schmidt',
      lead_id: '2',
      action: 'message',
      description: 'Demo-Unterlagen senden',
      due_date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      completed: false,
      source: 'manual',
    },
    {
      id: '3',
      lead_name: 'Thomas Weber',
      lead_id: '3',
      action: 'meeting',
      description: 'Abschlussgespräch',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'high',
      completed: false,
      source: 'manual',
    },
    {
      id: '4',
      lead_name: 'Lisa Müller',
      lead_id: '4',
      action: 'message',
      description: 'Interesse nachfragen',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'low',
      completed: false,
      source: 'manual',
    },
  ];
};

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useFollowUps(options = {}) {
  const { userId, includeCompleted = true } = options;
  
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ==========================================================================
  // FETCH FOLLOW-UPS
  // ==========================================================================
  
  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${getApiUrl()}/api/follow-ups?user_id=${userId || ''}`);
      if (response.ok) {
        const data = await response.json();
        setFollowUps(data.follow_ups || data || []);
      } else {
        // Fallback to demo data
        setFollowUps(generateDemoFollowUps());
      }
    } catch (err) {
      console.log('Follow-ups API nicht erreichbar, nutze Demo-Daten');
      setFollowUps(generateDemoFollowUps());
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);
  
  // ==========================================================================
  // TOGGLE COMPLETE
  // ==========================================================================
  
  const toggleComplete = useCallback(async (followUpId) => {
    const followUp = followUps.find(f => f.id === followUpId);
    if (!followUp) return;
    
    const newStatus = !followUp.completed;
    
    // Optimistic update
    setFollowUps(prev => prev.map(f => 
      f.id === followUpId ? { ...f, completed: newStatus } : f
    ));
    
    try {
      // Update via API
      await fetch(`${getApiUrl()}/api/follow-ups/${followUpId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newStatus }),
      });
      
      // Sync with Daily Flow if completing
      if (newStatus) {
        await syncWithDailyFlow(followUp);
      }
    } catch (err) {
      console.log('Follow-up update error:', err);
    }
  }, [followUps]);
  
  // ==========================================================================
  // SYNC WITH DAILY FLOW
  // ==========================================================================
  
  const syncWithDailyFlow = useCallback(async (followUp) => {
    try {
      // Benachrichtige Daily Flow über erledigtes Follow-up
      await fetch(`${API_CONFIG.baseUrl}/daily-flow/complete-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_up_id: followUp.id,
          lead_id: followUp.lead_id,
          lead_name: followUp.lead_name,
          action_type: followUp.action,
          completed_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      // Silent fail - Daily Flow sync is optional
      console.log('Daily Flow sync skipped:', err);
    }
  }, []);
  
  // ==========================================================================
  // CREATE FOLLOW-UP
  // ==========================================================================
  
  const createFollowUp = useCallback(async (newFollowUp) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFollowUp,
          user_id: userId,
          completed: false,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setFollowUps(prev => [data, ...prev]);
        return data;
      } else {
        // Local fallback
        const localFollowUp = {
          id: Date.now().toString(),
          ...newFollowUp,
          completed: false,
        };
        setFollowUps(prev => [localFollowUp, ...prev]);
        return localFollowUp;
      }
    } catch (err) {
      const localFollowUp = {
        id: Date.now().toString(),
        ...newFollowUp,
        completed: false,
      };
      setFollowUps(prev => [localFollowUp, ...prev]);
      return localFollowUp;
    }
  }, [userId]);
  
  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  
  const endOfWeek = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + (7 - today.getDay()));
    return d;
  }, [today]);
  
  const categorizeFollowUp = useCallback((followUp) => {
    const dueDate = new Date(followUp.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    if (followUp.completed) return 'completed';
    if (dueDate < today) return 'overdue';
    if (dueDate.getTime() === today.getTime()) return 'today';
    if (dueDate <= endOfWeek) return 'week';
    return 'later';
  }, [today, endOfWeek]);
  
  const grouped = useMemo(() => ({
    overdue: followUps.filter(f => categorizeFollowUp(f) === 'overdue'),
    today: followUps.filter(f => categorizeFollowUp(f) === 'today'),
    week: followUps.filter(f => categorizeFollowUp(f) === 'week'),
    later: followUps.filter(f => categorizeFollowUp(f) === 'later'),
    completed: followUps.filter(f => categorizeFollowUp(f) === 'completed'),
  }), [followUps, categorizeFollowUp]);
  
  // Follow-ups für Daily Flow (heute + überfällig)
  const dailyFlowFollowUps = useMemo(() => 
    [...grouped.overdue, ...grouped.today].map(f => ({
      ...f,
      // Format für Daily Flow
      action_type: `followup_${f.action}`,
      title: `${f.lead_name}: ${f.description}`,
      channel: f.action === 'call' ? 'phone' : 
               f.action === 'email' ? 'email' : 
               f.action === 'message' ? 'whatsapp' : 'other',
      due_at: f.due_date,
      status: f.completed ? 'done' : 'pending',
      source_type: 'follow_up',
      source_id: f.id,
    })),
    [grouped]
  );
  
  const stats = useMemo(() => ({
    total: followUps.length,
    pending: grouped.overdue.length + grouped.today.length + grouped.week.length + grouped.later.length,
    completed: grouped.completed.length,
    overdueCount: grouped.overdue.length,
    todayCount: grouped.today.length,
    weekCount: grouped.week.length,
  }), [followUps, grouped]);
  
  // ==========================================================================
  // RETURN
  // ==========================================================================
  
  return {
    // Data
    followUps,
    grouped,
    dailyFlowFollowUps,
    stats,
    
    // Actions
    fetchFollowUps,
    toggleComplete,
    createFollowUp,
    
    // State
    loading,
    error,
    refetch: fetchFollowUps,
  };
}

// =============================================================================
// EXPORT
// =============================================================================

export default useFollowUps;

