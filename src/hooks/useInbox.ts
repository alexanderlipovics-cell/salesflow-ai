/**
 * useInbox Hook
 * 
 * Custom Hook zum Laden und Verwalten von Unified Inbox Items.
 * Kombiniert Daten aus Leads, Follow-ups und AI Approvals.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import type { InboxItem, GroupedInboxItems } from '@/types/inbox';
import { getFollowupSuggestions } from '@/services/followUpService';
import { authService } from '@/services/authService';

// API Base URL - OHNE /api, da Endpunkte bereits /api/inbox-unified haben
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '') // Remove trailing slashes
  : (import.meta.env.PROD ? 'https://salesflow-ai.onrender.com' : 'http://localhost:8000');

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Konvertiert Follow-up Task zu InboxItem
 */
const followUpTaskToInboxItem = (task: any): InboxItem | null => {
  if (!task.lead_id && !task.lead?.id && !task.leads?.id) return null;

  // Lead-Daten aus verschiedenen Quellen holen (leads = joined, lead = alt, meta = fallback)
  const lead = task.leads || task.lead || {};
  const dueDate = task.due_at ? new Date(task.due_at) : new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  
  let priority: 'hot' | 'today' | 'upcoming' = 'upcoming';
  if (diffDays < 0) {
    priority = 'hot'; // Überfällig = Hot
  } else if (diffDays === 0) {
    priority = 'today';
  }

  // Follow-up Nummer aus template_key extrahieren (z.B. "fu_1_bump" -> 1)
  const followUpMatch = task.template_key?.match(/fu_(\d+)/);
  const followUpNumber = followUpMatch ? parseInt(followUpMatch[1], 10) : undefined;

  // Lead-Name aus verschiedenen Quellen extrahieren
  const leadName = lead.name 
    || lead.lead_name 
    || task.lead_name
    || task.meta?.lead_name
    || task.contact_name
    || 'Unbekannt';

  return {
    id: `followup_${task.id}`,
    type: 'follow_up',
    priority,
    lead: {
      id: task.lead_id || lead.id || '',
      name: leadName,
      avatar: lead.avatar || undefined,
      source: lead.source || lead.platform || task.channel || 'WhatsApp',
      company: lead.company || lead.lead_company || undefined,
      email: lead.email || lead.lead_email || undefined,
      phone: lead.phone || lead.lead_phone || lead.whatsapp || (lead as any).whatsapp || undefined,
      // Zusätzliche Felder für Contact Links
      instagram_url: (lead as any).instagram_url || (task as any).instagram_url || undefined,
      instagram_username: (lead as any).instagram_username || (task as any).instagram_username || (lead as any).instagram || undefined,
      instagram: (lead as any).instagram || undefined,
      facebook_url: (lead as any).facebook_url || (task as any).facebook_url || undefined,
      facebook_username: (lead as any).facebook_username || (task as any).facebook_username || undefined,
      linkedin_url: (lead as any).linkedin_url || (task as any).linkedin_url || (lead as any).linkedin || undefined,
      linkedin: (lead as any).linkedin || undefined,
      source_url: (lead as any).source_url || (task as any).source_url || undefined,
    },
    action: {
      type: 'send_message',
      message: task.note || task.suggested_message || task.message_template || '',
      confidence: 85, // Standard-Confidence für Follow-ups
    },
    metadata: {
      followUpNumber,
      dueDate: task.due_at ? new Date(task.due_at) : new Date(),
      createdAt: task.created_at ? new Date(task.created_at) : new Date(),
      templateKey: task.template_key,
      channel: task.preferred_channel || task.channel || task.default_channel || 'whatsapp',
    },
  };
};

/**
 * Konvertiert AI Approval Message zu InboxItem
 */
const approvalMessageToInboxItem = (message: any): InboxItem | null => {
  if (!message.lead_id && !message.leads?.id) return null;

  const lead = message.leads || {};
  
  return {
    id: `approval_${message.id}`,
    type: 'ai_approval',
    priority: (message.priority || 0) >= 80 ? 'hot' : 'today',
    lead: {
      id: message.lead_id || lead.id || '',
      name: lead.name || lead.lead_name || 'Neuer Lead',
      avatar: lead.avatar || undefined,
      source: message.channel || 'WhatsApp',
      company: lead.company || lead.lead_company || undefined,
      email: lead.email || lead.lead_email || undefined,
      phone: lead.phone || lead.lead_phone || (lead as any).whatsapp || undefined,
      // Zusätzliche Felder für Contact Links
      instagram_url: (lead as any).instagram_url || (message as any).instagram_url || undefined,
      instagram_username: (lead as any).instagram_username || (message as any).instagram_username || (lead as any).instagram || undefined,
      instagram: (lead as any).instagram || undefined,
      facebook_url: (lead as any).facebook_url || (message as any).facebook_url || undefined,
      facebook_username: (lead as any).facebook_username || (message as any).facebook_username || undefined,
      linkedin_url: (lead as any).linkedin_url || (message as any).linkedin_url || (lead as any).linkedin || undefined,
      linkedin: (lead as any).linkedin || undefined,
      source_url: (lead as any).source_url || (message as any).source_url || undefined,
    },
    action: {
      type: 'send_message',
      message: message.message || '',
      confidence: message.confidence || message.priority || 0,
    },
    metadata: {
      dueDate: new Date(), // Approvals sind immer "jetzt"
      createdAt: message.created_at ? new Date(message.created_at) : new Date(),
      channel: message.channel || 'whatsapp',
    },
  };
};

/**
 * Generiert erste Nachricht für neuen Lead (via Backend)
 */
const generateFirstMessage = async (lead: any): Promise<string | null> => {
  try {
    const token = localStorage.getItem('access_token');
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
      : (import.meta.env.PROD ? 'https://salesflow-ai.onrender.com' : 'http://localhost:8000');

    const response = await fetch(`${API_BASE_URL}/api/chief/generate-first-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        lead_id: lead.id,
        lead_name: lead.name || 'Lead',
        lead_source: lead.source || lead.platform || 'Import',
        lead_company: lead.company,
        lead_notes: lead.notes || lead.description,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.message || null;
    }
  } catch (err) {
    console.error('Fehler beim Generieren der ersten Nachricht:', err);
  }
  return null;
};

/**
 * Prüft Auto-Send Status für Lead
 * API call disabled - always return defaults to prevent crash
 */
const checkAutoSendStatus = async (lead: any): Promise<{ canSend: boolean; reason: string }> => {
  // API call disabled - always return defaults to prevent crash
  return { canSend: true, reason: 'first_contact' };
};

/**
 * Konvertiert neuen Lead zu InboxItem
 */
const newLeadToInboxItem = async (lead: any): Promise<InboxItem> => {
  // Generiere erste Nachricht
  const generatedMessage = await generateFirstMessage(lead);
  
  // Prüfe Auto-Send Status
  const autoSendStatus = await checkAutoSendStatus(lead);
  
  return {
    id: `lead_${lead.id}`,
    type: 'new_lead',
    priority: (lead.temperature || lead.score || 0) >= 80 ? 'hot' : 'today',
    lead: {
      id: lead.id,
      name: lead.name || 'Neuer Kontakt',
      avatar: lead.avatar || undefined,
      source: lead.source || lead.platform || 'Import',
      company: lead.company || undefined,
      email: lead.email || undefined,
      phone: lead.phone || (lead as any).whatsapp || undefined,
      // Zusätzliche Felder für Contact Links
      instagram_url: (lead as any).instagram_url || undefined,
      instagram_username: (lead as any).instagram_username || (lead as any).instagram || undefined,
      instagram: (lead as any).instagram || undefined,
      facebook_url: (lead as any).facebook_url || undefined,
      facebook_username: (lead as any).facebook_username || undefined,
      linkedin_url: (lead as any).linkedin_url || (lead as any).linkedin || undefined,
      linkedin: (lead as any).linkedin || undefined,
      source_url: (lead as any).source_url || undefined,
    },
    action: {
      type: generatedMessage && autoSendStatus.canSend ? 'send_message' : 'review_lead',
      message: generatedMessage || undefined,
      confidence: generatedMessage ? 85 : (lead.temperature || lead.score || 50),
    },
    metadata: {
      dueDate: new Date(),
      createdAt: lead.created_at ? new Date(lead.created_at) : new Date(),
    },
    autoSendStatus: autoSendStatus,
  };
};

/**
 * Lädt alle Inbox Items aus verschiedenen Quellen
 */
const fetchInboxItems = async (): Promise<InboxItem[]> => {
  const items: InboxItem[] = [];

  try {
    // 1. Follow-ups laden
    const followUpTasks = await getFollowupSuggestions('week');
    followUpTasks?.forEach((task) => {
      const item = followUpTaskToInboxItem(task);
      if (item) items.push(item);
    });
  } catch (err) {
    console.error('Fehler beim Laden der Follow-ups:', err);
  }

  try {
    // 2. AI Approvals laden
    const token = localStorage.getItem('access_token');
    const approvalResponse = await fetch(`${API_BASE_URL}/api/inbox/pending?limit=50`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (approvalResponse.ok) {
      const approvalData = await approvalResponse.json();
      (approvalData.messages || []).forEach((msg: any) => {
        const item = approvalMessageToInboxItem(msg);
        if (item) items.push(item);
      });
    }
  } catch (err) {
    console.error('Fehler beim Laden der AI Approvals:', err);
  }

  try {
    // 3. Neue Leads laden (Status = NEW, erstellt in letzten 7 Tagen)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: newLeads, error } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('status', 'NEW')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && newLeads) {
      // Generiere Nachrichten für alle neuen Leads parallel
      const leadItems = await Promise.all(
        newLeads.map((lead) => newLeadToInboxItem(lead))
      );
      items.push(...leadItems);
    }
  } catch (err) {
    console.error('Fehler beim Laden der neuen Leads:', err);
  }

  // Safe sort with null checks
  return items
    .filter(item => item && item.id)
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { hot: 0, today: 1, upcoming: 2 };
      const priorityDiff = (priorityOrder[a?.priority] ?? 2) - (priorityOrder[b?.priority] ?? 2);
      if (priorityDiff !== 0) return priorityDiff;
      
      const getTime = (d: unknown): number => {
        if (!d) return 0;
        if (d instanceof Date) return d.getTime();
        const parsed = new Date(d as string);
        return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      };
      
      return getTime(a?.metadata?.dueDate) - getTime(b?.metadata?.dueDate);
    });
};

/**
 * Gruppiert Items nach Priorität
 * Sicherheitscheck: Verhindert Crash wenn items undefined/null ist
 */
const groupByPriority = (items: InboxItem[]): GroupedInboxItems => {
  // Sicherheitscheck: items muss ein Array sein
  if (!items || !Array.isArray(items)) {
    return { hot: [], today: [], upcoming: [] };
  }
  
  return {
    hot: items.filter((item) => item?.priority === 'hot'),
    today: items.filter((item) => item?.priority === 'today'),
    upcoming: items.filter((item) => item?.priority === 'upcoming'),
  };
};

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export interface UseInboxReturn {
  items: InboxItem[];
  grouped: GroupedInboxItems;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  sendItem: (itemId: string) => Promise<void>;
  skipItem: (itemId: string) => Promise<void>;
  archiveItem: (itemId: string) => Promise<void>;
  snoozeItem: (itemId: string, hours: number) => Promise<void>;
}

export const useInbox = (): UseInboxReturn => {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedItems = await fetchInboxItems();
      setItems(fetchedItems);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Inbox-Items konnten nicht geladen werden.';
      console.error('useInbox fetch error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const sendItem = useCallback(async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error('Item nicht gefunden');
    }

    try {
      // Token holen - mehrere Quellen prüfen
      let token = authService.getAccessToken();
      if (!token) {
        // Fallback: Direkt aus localStorage
        token = localStorage.getItem('access_token');
      }
      if (!token) {
        // Fallback: Aus Supabase Session
        const { data: { session } } = await supabaseClient.auth.getSession();
        token = session?.access_token || null;
      }

      if (!token) {
        throw new Error('Nicht authentifiziert. Bitte melde dich erneut an.');
      }

      // Unified Inbox API verwenden
      const url = `${API_BASE_URL}/api/inbox-unified/${itemId}/send`;
      const body = item.action.message 
        ? JSON.stringify({ edited_message: item.action.message })
        : JSON.stringify({});

      console.log('useInbox.sendItem: Sending POST to:', url);
      console.log('useInbox.sendItem: Token exists:', !!token);
      console.log('useInbox.sendItem: Item ID:', itemId);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: body,
      });

      console.log('useInbox.sendItem: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        console.error('useInbox.sendItem: Error response:', errorData);
        throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: Item konnte nicht gesendet werden`);
      }

      // Item aus Liste entfernen
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error('Fehler beim Senden:', err);
      throw err;
    }
  }, [items]);

  const skipItem = useCallback(async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      throw new Error('Item nicht gefunden');
    }

    try {
      // Token holen - mehrere Quellen prüfen
      let token = authService.getAccessToken();
      if (!token) {
        token = localStorage.getItem('access_token');
      }
      if (!token) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        token = session?.access_token || null;
      }

      if (!token) {
        throw new Error('Nicht authentifiziert. Bitte melde dich erneut an.');
      }

      // Unified Inbox API verwenden
      const url = `${API_BASE_URL}/api/inbox-unified/${itemId}/skip`;
      
      console.log('useInbox.skipItem: Sending POST to:', url);
      console.log('useInbox.skipItem: Token exists:', !!token);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          snooze_days: null, // Kann später erweitert werden
        }),
      });

      console.log('useInbox.skipItem: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        console.error('useInbox.skipItem: Error response:', errorData);
        throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: Item konnte nicht übersprungen werden`);
      }

      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error('Fehler beim Überspringen:', err);
      throw err;
    }
  }, [items]);

  const archiveItem = useCallback(async (itemId: string) => {
    // Einfach aus Liste entfernen
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const snoozeItem = useCallback(async (itemId: string, hours: number) => {
    // Item temporär aus Liste entfernen (wird beim nächsten Refetch wieder geladen, wenn fällig)
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  return {
    items,
    grouped: groupByPriority(items),
    loading,
    error,
    refetch,
    sendItem,
    skipItem,
    archiveItem,
    snoozeItem,
  };
};

