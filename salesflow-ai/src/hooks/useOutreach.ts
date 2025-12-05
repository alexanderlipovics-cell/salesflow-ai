/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useOutreach Hook                                                          ║
 * ║  React Hook für Outreach Messages & Tracking                               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  outreachApi, 
  OutreachMessage,
  OutreachStats,
  PendingCheckIn,
  OutreachStatus,
  Platform,
  MessageType,
} from '../api/outreach';

export interface UseOutreachReturn {
  // State
  messages: OutreachMessage[];
  stats: OutreachStats | null;
  pendingCheckIns: PendingCheckIn[];
  loading: boolean;
  error: string | null;
  
  // Computed
  totalSent: number;
  replyRate: number;
  ghostCount: number;
  
  // Actions
  loadMessages: (options?: { status?: OutreachStatus; platform?: Platform }) => Promise<void>;
  loadStats: (days?: number) => Promise<void>;
  loadPendingCheckIns: () => Promise<void>;
  createMessage: (data: {
    contact_name: string;
    platform: Platform;
    message_type: MessageType;
    message_preview: string;
    lead_id?: string;
  }) => Promise<OutreachMessage>;
  markAsSeen: (messageId: string) => Promise<void>;
  markAsReplied: (messageId: string) => Promise<void>;
  markAsGhost: (messageId: string) => Promise<void>;
  performCheckIn: (messageId: string, status: 'seen' | 'replied' | 'ghost', notes?: string) => Promise<void>;
  skipCheckIn: (messageId: string, reason?: string) => Promise<void>;
}

export function useOutreach(): UseOutreachReturn {
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [pendingCheckIns, setPendingCheckIns] = useState<PendingCheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Messages
  const loadMessages = useCallback(async (options?: { status?: OutreachStatus; platform?: Platform }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await outreachApi.listMessages(options);
      setMessages(data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Stats
  const loadStats = useCallback(async (days: number = 30) => {
    setLoading(true);
    setError(null);
    try {
      const data = await outreachApi.getStats({ days });
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Pending Check-ins
  const loadPendingCheckIns = useCallback(async () => {
    try {
      const data = await outreachApi.getPendingCheckIns();
      setPendingCheckIns(data);
    } catch (err) {
      console.error('Failed to load pending check-ins:', err);
    }
  }, []);

  // Create Message
  const createMessage = useCallback(async (data: {
    contact_name: string;
    platform: Platform;
    message_type: MessageType;
    message_preview: string;
    lead_id?: string;
  }) => {
    const created = await outreachApi.createMessage(data);
    setMessages(prev => [created, ...prev]);
    return created;
  }, []);

  // Mark as Seen
  const markAsSeen = useCallback(async (messageId: string) => {
    try {
      const updated = await outreachApi.markAsSeen(messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, []);

  // Mark as Replied
  const markAsReplied = useCallback(async (messageId: string) => {
    try {
      const updated = await outreachApi.markAsReplied(messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, []);

  // Mark as Ghost
  const markAsGhost = useCallback(async (messageId: string) => {
    try {
      const updated = await outreachApi.markAsGhost(messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, []);

  // Perform Check-in
  const performCheckIn = useCallback(async (messageId: string, status: 'seen' | 'replied' | 'ghost', notes?: string) => {
    try {
      await outreachApi.performCheckIn(messageId, { status, notes });
      setPendingCheckIns(prev => prev.filter(c => c.id !== messageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, []);

  // Skip Check-in
  const skipCheckIn = useCallback(async (messageId: string, reason?: string) => {
    try {
      await outreachApi.skipCheckIn(messageId, reason);
      setPendingCheckIns(prev => prev.filter(c => c.id !== messageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadStats();
    loadPendingCheckIns();
  }, [loadStats, loadPendingCheckIns]);

  // Computed
  const totalSent = stats?.total_sent ?? 0;
  const replyRate = stats?.reply_rate ?? 0;
  const ghostCount = stats?.total_ghosts ?? 0;

  return {
    messages,
    stats,
    pendingCheckIns,
    loading,
    error,
    totalSent,
    replyRate,
    ghostCount,
    loadMessages,
    loadStats,
    loadPendingCheckIns,
    createMessage,
    markAsSeen,
    markAsReplied,
    markAsGhost,
    performCheckIn,
    skipCheckIn,
  };
}

export default useOutreach;

