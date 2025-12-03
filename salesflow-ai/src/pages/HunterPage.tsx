import { useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Loader2,
  MessageCircle,
  Phone,
  Target,
  X,
  Instagram,
  Rocket,
} from 'lucide-react';
import { useHunterTasks } from '../hooks/useHunterTasks';
import { SALES_SCRIPTS } from '../lib/salesScripts';
import { startStandardFollowUpSequenceForLead } from '@/services/followUpService';
// @ts-expect-error - UserContext is a JS file without type declarations
import { useUser } from '../context/UserContext';

// Hilfsfunktion für WhatsApp Link
const buildWhatsAppUrl = (
  phone: string | null,
  vertical: string | null,
  leadName: string | null,
  userName: string | null
) => {
  if (!phone) return '#';
  
  // 1. Text wählen basierend auf Vertical
  const safeVertical = (vertical?.toLowerCase() || 'generic') as keyof typeof SALES_SCRIPTS;
  const scriptObj = SALES_SCRIPTS[safeVertical] || SALES_SCRIPTS['generic'];
  
  let message = scriptObj.whatsapp;
  
  // 2. Platzhalter ersetzen: [Name] und [DeinName]
  if (leadName) {
    const firstName = leadName.split(' ')[0];
    message = message.replace(/\[Name\]/g, firstName);
  }
  if (userName) {
    const userFirstName = userName.split(' ')[0];
    message = message.replace(/\[DeinName\]/g, userFirstName);
  }

  // 3. Nummer säubern (nur Ziffern)
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

const HunterPage = () => {
  const { tasks, loading, error, markAs } = useHunterTasks();
  const user = useUser();
  // State für Lade-Indikatoren einzelner Buttons
  const [processingId, setProcessingId] = useState<string | null>(null);
  // State für Aktions-Fehler (z.B. markAs fehlgeschlagen)
  const [actionError, setActionError] = useState<string | null>(null);
  // State für Follow-up Sequenz Start
  const [startingSequenceId, setStartingSequenceId] = useState<string | null>(null);

  const handleAction = async (id: string, status: 'done' | 'skipped') => {
    setProcessingId(id);
    setActionError(null);
    try {
      await markAs(id, status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Aktion fehlgeschlagen';
      setActionError(message);
      alert(`Fehler: ${message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleStartFollowUpSequence = async (leadId: string, leadName: string | null) => {
    setStartingSequenceId(leadId);
    setActionError(null);
    try {
      await startStandardFollowUpSequenceForLead(leadId);
      alert(`Follow-up Sequenz für "${leadName || 'Lead'}" erfolgreich gestartet!`);
    } catch (err) {
      console.error('Follow-up Sequenz Fehler:', err);
      const message = err instanceof Error ? err.message : 'Sequenz konnte nicht gestartet werden';
      setActionError(message);
      alert(`Follow-up Sequenz konnte nicht gestartet werden: ${message}`);
    } finally {
      setStartingSequenceId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="ml-3">Lade Hunter-Aufgaben...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 pb-24 text-slate-50">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <Target className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Lead Hunter 🎯</h1>
          <p className="text-sm text-slate-400">Offene Aufgaben aus dem CRM</p>
        </div>
      </div>

      {/* Error Banner - zeigt Hook-Fehler oder Aktions-Fehler */}
      {(error || actionError) && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <p>{error || actionError}</p>
        </div>
      )}

      {/* Empty State - nur anzeigen wenn keine Fehler vorliegen */}
      {!loading && tasks.length === 0 && !error && !actionError && (
        <div className="mt-12 text-center text-slate-400">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <Check className="h-8 w-8 text-slate-600" />
          </div>
          <p>Alles erledigt! Keine offenen Hunter-Aufgaben.</p>
        </div>
      )}

      {/* Task List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => {
          const lead = task.lead; // Der verknüpfte Lead
          if (!lead) return null;

          return (
            <div
              key={task.id}
              className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-lg transition-all hover:border-slate-600"
            >
              {/* Top Row: Info */}
              <div className="mb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-white text-lg">{lead.name || 'Unbekannter Lead'}</h3>
                        <p className="text-sm text-slate-400">{lead.company || 'Keine Firma'}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-900 px-2 py-1 rounded text-slate-500">
                        {lead.vertical || 'Generic'}
                    </span>
                </div>
                
                {task.note && (
                  <div className="mt-3 rounded bg-slate-900/50 p-2 text-xs text-slate-300 italic">
                    "{task.note}"
                  </div>
                )}
                
                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <CalendarClock className="w-3 h-3" />
                    Fällig: {new Date(task.due_at || Date.now()).toLocaleDateString()}
                </div>
              </div>

              {/* Follow-up Sequenz starten Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartFollowUpSequence(lead.id, lead.name);
                }}
                disabled={startingSequenceId === lead.id}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-600/30 bg-amber-600/10 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                title="Follow-up Sequenz starten"
              >
                {startingSequenceId === lead.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                Follow-up Sequenz starten
              </button>

              {/* Middle Row: Contact Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {lead.phone ? (
                    <>
                        <a
                        href={`tel:${lead.phone}`}
                        className="flex flex-col items-center justify-center rounded-lg bg-slate-700 py-2 hover:bg-slate-600 transition"
                        >
                        <Phone className="h-4 w-4 mb-1 text-blue-400" />
                        <span className="text-[10px] font-bold">Anrufen</span>
                        </a>
                        <a
                        href={buildWhatsAppUrl(lead.phone, lead.vertical, lead.name, user?.name ?? null)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center justify-center rounded-lg bg-slate-700 py-2 hover:bg-slate-600 transition"
                        >
                        <MessageCircle className="h-4 w-4 mb-1 text-emerald-400" />
                        <span className="text-[10px] font-bold">WhatsApp</span>
                        </a>
                    </>
                ) : (
                    <div className="col-span-2 flex items-center justify-center text-xs text-slate-500 bg-slate-900/50 rounded-lg">
                        Keine Nummer
                    </div>
                )}
                
                {lead.instagram ? (
                    <a
                    href={lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@','')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center rounded-lg bg-slate-700 py-2 hover:bg-slate-600 transition"
                    >
                    <Instagram className="h-4 w-4 mb-1 text-pink-500" />
                    <span className="text-[10px] font-bold">Insta</span>
                    </a>
                ) : (
                    <div className="flex items-center justify-center text-xs text-slate-500 bg-slate-900/50 rounded-lg">
                        Kein Insta
                    </div>
                )}
              </div>

              {/* Bottom Row: Actions */}
              <div className="flex gap-3 border-t border-slate-700 pt-4">
                <button
                  onClick={() => handleAction(task.id, 'skipped')}
                  disabled={processingId === task.id}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-600 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition"
                >
                  <X className="h-4 w-4" />
                  Skip
                </button>
                <button
                  onClick={() => handleAction(task.id, 'done')}
                  disabled={processingId === task.id}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition"
                >
                  {processingId === task.id ? <Loader2 className="animate-spin h-4 w-4"/> : <Check className="h-4 w-4" />}
                  Erledigt
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HunterPage;
