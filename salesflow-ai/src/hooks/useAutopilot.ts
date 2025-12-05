/**
 * useAutopilot Hook - React Hooks für Autopilot-Funktionen
 * 
 * Features:
 * - Settings laden/speichern
 * - Message Events verwalten
 * - Autopilot Engine triggern
 * - Auto-Refresh
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AutopilotSettings,
  AutopilotSettingsUpdate,
  MessageEvent,
  MessageEventCreate,
  AutopilotRunSummary,
  AutopilotStatus,
  MessageChannel,
  MessageDirection,
  getAutopilotSettings,
  saveAutopilotSettings,
  listMessageEvents,
  createMessageEvent,
  updateMessageEventStatus,
  runAutopilotOnce,
} from '../services/autopilotService';

// ============================================================================
// AUTOPILOT SETTINGS HOOK
// ============================================================================

export function useAutopilotSettings(contactId?: string) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AutopilotSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getAutopilotSettings(user.access_token, contactId);
      setSettings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden der Settings';
      setError(message);
      console.error('Error loading autopilot settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.access_token, contactId]);

  const updateSettings = useCallback(
    async (newSettings: AutopilotSettingsUpdate): Promise<boolean> => {
      if (!user?.access_token) return false;

      setLoading(true);
      setError(null);

      try {
        const data = await saveAutopilotSettings(user.access_token, newSettings);
        setSettings(data);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fehler beim Speichern der Settings';
        setError(message);
        console.error('Error saving autopilot settings:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.access_token]
  );

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    refetch: loadSettings,
    updateSettings,
  };
}

// ============================================================================
// MESSAGE EVENTS HOOK
// ============================================================================

export function useMessageEvents(filters?: {
  status?: AutopilotStatus;
  contact_id?: string;
  channel?: MessageChannel;
  direction?: MessageDirection;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { user } = useAuth();
  const [events, setEvents] = useState<MessageEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!user?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await listMessageEvents(user.access_token, filters);
      setEvents(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden der Events';
      setError(message);
      console.error('Error loading message events:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.access_token, JSON.stringify(filters)]);

  const createEvent = useCallback(
    async (event: MessageEventCreate): Promise<MessageEvent | null> => {
      if (!user?.access_token) return null;

      try {
        const data = await createMessageEvent(user.access_token, event);
        await loadEvents(); // Reload list
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fehler beim Erstellen des Events';
        setError(message);
        console.error('Error creating message event:', err);
        return null;
      }
    },
    [user?.access_token, loadEvents]
  );

  const updateEventStatus = useCallback(
    async (eventId: string, status: AutopilotStatus): Promise<boolean> => {
      if (!user?.access_token) return false;

      try {
        await updateMessageEventStatus(user.access_token, eventId, status);
        await loadEvents(); // Reload list
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Status';
        setError(message);
        console.error('Error updating event status:', err);
        return false;
      }
    },
    [user?.access_token, loadEvents]
  );

  useEffect(() => {
    loadEvents();

    // Auto-Refresh wenn aktiviert
    if (filters?.autoRefresh) {
      const interval = setInterval(loadEvents, filters.refreshInterval || 30000);
      return () => clearInterval(interval);
    }
  }, [loadEvents, filters?.autoRefresh, filters?.refreshInterval]);

  return {
    events,
    loading,
    error,
    refetch: loadEvents,
    createEvent,
    updateEventStatus,
  };
}

// ============================================================================
// AUTOPILOT ENGINE HOOK
// ============================================================================

export function useAutopilotEngine() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<AutopilotRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runOnce = useCallback(
    async (limit: number = 20): Promise<AutopilotRunSummary | null> => {
      if (!user?.access_token) return null;

      setRunning(true);
      setError(null);
      setSummary(null);

      try {
        const data = await runAutopilotOnce(user.access_token, limit);
        setSummary(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fehler beim Ausführen des Autopiloten';
        setError(message);
        console.error('Error running autopilot:', err);
        return null;
      } finally {
        setRunning(false);
      }
    },
    [user?.access_token]
  );

  return {
    running,
    summary,
    error,
    runOnce,
  };
}

// ============================================================================
// COMBINED HOOK (für Cockpit Page)
// ============================================================================

export function useAutopilotCockpit() {
  const settings = useAutopilotSettings();
  const events = useMessageEvents({ limit: 50, autoRefresh: true, refreshInterval: 30000 });
  const engine = useAutopilotEngine();

  return {
    settings,
    events,
    engine,
  };
}
