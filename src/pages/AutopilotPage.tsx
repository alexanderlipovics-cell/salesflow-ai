/**
 * AutopilotPage - Vollständiges Autopilot Cockpit
 * 
 * Features:
 * - Globale Settings anzeigen & bearbeiten
 * - Message Events-Übersicht
 * - Vorgeschlagene Antworten reviewen
 * - Engine manuell triggern
 * - Auto-Refresh
 */

import { useState } from 'react';
import { Zap, Info } from 'lucide-react';
import { useAutopilotCockpit } from '@/hooks/useAutopilot';
import AutopilotSettingsCard from '@/components/autopilot/AutopilotSettingsCard';
import MessageEventsTable from '@/components/autopilot/MessageEventsTable';
import SuggestionsReview from '@/components/autopilot/SuggestionsReview';
import AutopilotEngineControl from '@/components/autopilot/AutopilotEngineControl';

export default function AutopilotPage() {
  const { settings, events, engine } = useAutopilotCockpit();
  const [showInfo, setShowInfo] = useState(false);

  // Handler für Approve/Skip
  const handleApprove = async (eventId: string) => {
    // Status auf "approved" setzen
    // In V1: Wir loggen nur als "approved", echtes Senden kommt später
    await events.updateEventStatus(eventId, 'approved');
    
    // Optional: Könnte hier auch ein outbound Event erstellen
    // const originalEvent = events.events.find(e => e.id === eventId);
    // if (originalEvent?.suggested_reply) {
    //   await events.createEvent({
    //     contact_id: originalEvent.contact_id || undefined,
    //     channel: originalEvent.channel,
    //     direction: 'outbound',
    //     text: originalEvent.suggested_reply.text,
    //   });
    // }
    
    // Refresh
    events.refetch();
  };

  const handleSkip = async (eventId: string) => {
    await events.updateEventStatus(eventId, 'skipped');
    events.refetch();
  };

  const handleRunEngine = async () => {
    const result = await engine.runOnce(20);
    if (result) {
      // Nach erfolgreichem Run: Events neu laden
      setTimeout(() => {
        events.refetch();
      }, 1000);
    }
    return result;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-salesflow-accent to-salesflow-accent-strong p-3">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Autopilot Cockpit</h1>
            <p className="text-gray-400">
              Dein persönlicher Sales-Assistent – Vorschläge, Einstellungen & mehr
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="rounded-xl border border-white/10 p-2 text-gray-400 hover:border-white/40 hover:text-white"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6">
          <h3 className="mb-3 text-lg font-semibold text-blue-400">ℹ️ Wie funktioniert der Autopilot?</h3>
          <div className="space-y-2 text-sm text-blue-200">
            <p>
              <strong>1. Nachrichten kommen rein:</strong> Message Events werden in der Datenbank geloggt (Status: pending)
            </p>
            <p>
              <strong>2. Autopilot Engine:</strong> Verarbeitet pending Events und generiert KI-Vorschläge (Status: suggested)
            </p>
            <p>
              <strong>3. Du entscheidest:</strong> Approve = Antwort senden, Skip = ignorieren
            </p>
            <p>
              <strong>Modi:</strong> Off (aus), Assist (Vorschläge), One-Click (schnelles Senden), Auto (V1: in Entwicklung)
            </p>
          </div>
        </div>
      )}

      {/* Settings Card */}
      <AutopilotSettingsCard
        settings={settings.settings}
        loading={settings.loading}
        onSave={settings.updateSettings}
      />

      {/* Engine Control */}
      <AutopilotEngineControl
        onRun={handleRunEngine}
        running={engine.running}
      />

      {/* Suggestions Review */}
      <SuggestionsReview
        events={events.events}
        loading={events.loading}
        onApprove={handleApprove}
        onSkip={handleSkip}
      />

      {/* Message Events Table */}
      <MessageEventsTable
        events={events.events}
        loading={events.loading}
      />

      {/* Footer Info */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center text-xs text-gray-500">
        <p>
          Auto-Refresh alle 30 Sekunden aktiv • V1 (Internal Channel) • Letzte Aktualisierung:{' '}
          {new Date().toLocaleTimeString('de-AT')}
        </p>
      </div>
    </div>
  );
}

