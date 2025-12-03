import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  Clipboard,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Rocket,
  SkipForward,
  Target,
} from 'lucide-react';
import { useFollowUpTasks } from '@/hooks/useFollowUpTasks';
import {
  useFollowUpTemplateOverrides,
  buildOverrideKey,
  type FollowUpTemplateOverrideLookup,
} from '@/hooks/useFollowUpTemplateOverrides';
import {
  getFollowUpTemplateByKey,
  getPhaseDisplay,
  buildMessageForVertical,
  type FollowUpTemplate,
} from '@/config/followupSequence';
import { startStandardFollowUpSequenceForLead } from '@/services/followUpService';
import { supabaseClient } from '@/lib/supabaseClient';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface LeadOption {
  id: string;
  name: string | null;
  company: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Formatiert ein Datum als deutsches Format (dd.mm.yyyy)
 */
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Kein Datum';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Gibt das Due-Label zurück (Überfällig / Heute / Datum)
 */
const getDueLabel = (dateString: string | null): { label: string; isOverdue: boolean; isToday: boolean } => {
  if (!dateString) return { label: 'Kein Datum', isOverdue: false, isToday: false };
  
  const dueDate = new Date(dateString);
  const today = new Date();
  
  // Auf Tagesebene vergleichen
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  
  if (diffDays < 0) {
    return { label: 'Überfällig', isOverdue: true, isToday: false };
  } else if (diffDays === 0) {
    return { label: 'Heute', isOverdue: false, isToday: true };
  } else {
    return { label: formatDate(dateString), isOverdue: false, isToday: false };
  }
};

/**
 * Gruppiert Tasks nach Dringlichkeit
 */
type TaskGroup = 'overdue' | 'today' | 'upcoming';

const groupTasks = (tasks: ReturnType<typeof useFollowUpTasks>['tasks']) => {
  const groups: Record<TaskGroup, typeof tasks> = {
    overdue: [],
    today: [],
    upcoming: [],
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  tasks.forEach((task) => {
    if (!task.due_at) {
      groups.upcoming.push(task);
      return;
    }
    
    const dueDate = new Date(task.due_at);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays < 0) {
      groups.overdue.push(task);
    } else if (diffDays === 0) {
      groups.today.push(task);
    } else {
      groups.upcoming.push(task);
    }
  });
  
  return groups;
};

/**
 * Baut die Follow-up Nachricht aus dem Template, Lead-Vertical und Lead-Namen.
 * Nutzt die zentrale buildMessageForVertical Funktion und ersetzt {{name}}.
 */
const buildFollowUpMessage = (
  template: FollowUpTemplate | undefined,
  leadName?: string | null,
  leadVertical?: string | null,
  fallbackNote?: string | null
): string => {
  // Fallback wenn kein Template vorhanden
  if (!template) {
    return fallbackNote || 'Hallo, ich wollte mich kurz bei dir melden.';
  }

  // Message für das Vertical holen (verwendet perVerticalMessages oder defaultMessage)
  const { message: verticalMessage } = buildMessageForVertical(template, leadVertical);

  // {{name}} Platzhalter ersetzen
  let finalMessage = verticalMessage;

  if (leadName) {
    // Vorname extrahieren
    const firstName = leadName.split(' ')[0];
    finalMessage = finalMessage.replace(/\{\{\s*name\s*\}\}/g, firstName);
  } else {
    // Platzhalter entfernen mit korrekter Interpunktion:
    // 1. ", {{name}}:" → ":" (Komma vor Name + Doppelpunkt danach)
    finalMessage = finalMessage.replace(/,\s*\{\{\s*name\s*\}\}\s*:/g, ':');
    // 2. ", {{name}}," → "," (Komma vor und nach Name)
    finalMessage = finalMessage.replace(/,\s*\{\{\s*name\s*\}\}\s*,/g, ',');
    // 3. ", {{name}}" am Ende oder vor Leerzeichen → "" (Komma vor Name, nichts danach)
    finalMessage = finalMessage.replace(/,\s*\{\{\s*name\s*\}\}(\s|$)/g, '$1');
    // 4. "{{name}}, " oder "{{name}}: " → "" (Name am Anfang mit Komma/Doppelpunkt)
    finalMessage = finalMessage.replace(/\{\{\s*name\s*\}\}[,:]\s*/g, '');
    // 5. Fallback: Verbleibende {{name}} Platzhalter entfernen
    finalMessage = finalMessage.replace(/\{\{\s*name\s*\}\}\s*/g, '');
  }

  return finalMessage;
};

/**
 * Bereinigt eine Telefonnummer für WhatsApp.
 * Erlaubt nur Ziffern und führendes +.
 */
const cleanPhoneNumber = (phone: string | null | undefined): string | null => {
  if (!phone) return null;

  // Alle nicht-Ziffern entfernen, außer führendes +
  let cleaned = phone.trim();
  
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/[^\d]/g, '');
  
  if (hasPlus && cleaned.length > 0) {
    cleaned = '+' + cleaned;
  }

  // Wenn keine Nummer übrig bleibt
  if (cleaned.replace(/\+/g, '').length === 0) {
    return null;
  }

  // Wenn mit 0 beginnend (deutsche Nummer ohne Ländercode), zu +49 konvertieren
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = '+49' + cleaned.slice(1);
  }

  return cleaned;
};

// ─────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const { tasks, loading, error, markAs, refetch } = useFollowUpTasks();
  
  // Template Overrides aus DB laden
  const {
    loading: overridesLoading,
    error: overridesError,
    overrides,
  } = useFollowUpTemplateOverrides();
  
  // State für Lade-Indikatoren einzelner Buttons
  const [processingId, setProcessingId] = useState<string | null>(null);
  // State für Aktions-Fehler
  const [actionError, setActionError] = useState<string | null>(null);
  // State für Kopier-Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Dev-Test States
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [startingSequence, setStartingSequence] = useState(false);
  const [availableLeads, setAvailableLeads] = useState<LeadOption[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  // Leads für das Dropdown laden
  useEffect(() => {
    const fetchLeads = async () => {
      setLoadingLeads(true);
      try {
        const { data, error: fetchError } = await supabaseClient
          .from('leads')
          .select('id, name, company')
          .order('name', { ascending: true });
        
        if (fetchError) {
          console.error('Leads laden fehlgeschlagen:', fetchError);
          return;
        }
        
        setAvailableLeads((data as LeadOption[]) || []);
      } catch (err) {
        console.error('Leads laden fehlgeschlagen:', err);
      } finally {
        setLoadingLeads(false);
      }
    };
    
    fetchLeads();
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────

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

  const handleCopyMessage = async (taskId: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(taskId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('Konnte Nachricht nicht kopieren. Bitte manuell kopieren.');
    }
  };

  const handleStartSequence = async () => {
    if (!selectedLeadId) {
      alert('Bitte wähle einen Lead aus.');
      return;
    }
    
    setStartingSequence(true);
    setActionError(null);
    
    try {
      await startStandardFollowUpSequenceForLead(selectedLeadId);
      const selectedLead = availableLeads.find(l => l.id === selectedLeadId);
      alert(`Follow-up Sequenz für "${selectedLead?.name || 'Lead'}" erfolgreich gestartet!`);
      setSelectedLeadId('');
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sequenz konnte nicht gestartet werden';
      setActionError(message);
      alert(`Fehler: ${message}`);
    } finally {
      setStartingSequence(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // Render: Loading State
  // ─────────────────────────────────────────────────────────────────

  if (loading || overridesLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="ml-3">Lade Follow-ups …</span>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────

  const groupedTasks = groupTasks(tasks);

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 pb-24 text-slate-50">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Follow-ups 📬</h1>
            <p className="text-sm text-slate-400">Deine offenen Nachfass-Aufgaben aus allen Leads.</p>
          </div>
        </div>
        
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </button>
      </div>

      {/* Admin-Tool: Sequenz manuell starten (nur für Tests/Admin) */}
      <details className="mb-6 rounded-xl border border-dashed border-slate-700 bg-slate-800/50">
        <summary className="cursor-pointer p-4 text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-400">
          <span className="inline-flex items-center gap-2">
            <Rocket className="h-3 w-3" />
            Admin: Sequenz manuell starten (nur für Tests)
          </span>
        </summary>
        <div className="border-t border-slate-700 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                disabled={loadingLeads}
                className="w-full appearance-none rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 pr-10 text-sm text-white focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {loadingLeads ? 'Lade Leads...' : 'Lead auswählen...'}
                </option>
                {availableLeads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name || 'Unbenannt'} {lead.company ? `(${lead.company})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            <button
              onClick={handleStartSequence}
              disabled={startingSequence || !selectedLeadId || loadingLeads}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {startingSequence ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Target className="h-4 w-4" />
              )}
              Sequenz starten
            </button>
          </div>
          {availableLeads.length === 0 && !loadingLeads && (
            <p className="mt-2 text-xs text-slate-500">
              Keine Leads gefunden. Importiere zuerst Leads, um eine Sequenz zu starten.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-600">
            💡 Hinweis: Nutze den "Follow-up Sequenz starten" Button direkt auf den Lead-Karten im Hunter Board oder Daily Command.
          </p>
        </div>
      </details>

      {/* Error Banner - nur für echte Ladefehler, nicht für Admin-Panel Aktionen */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Hinweis wenn Template-Overrides nicht geladen werden konnten */}
      {overridesError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p>Hinweis: Aktive Template-Overrides konnten nicht geladen werden – es werden Standard-Texte verwendet.</p>
        </div>
      )}

      {/* Empty State */}
      {tasks.length === 0 && !error && (
        <div className="mt-12 text-center text-slate-400">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <Check className="h-8 w-8 text-slate-600" />
          </div>
          <p className="text-lg">Aktuell keine offenen Follow-ups. 🎯</p>
          <p className="mt-2 text-sm text-slate-500">
            Starte eine Sequenz für einen Lead, um hier Follow-up-Aufgaben zu sehen.
          </p>
        </div>
      )}

      {/* Task Groups */}
      {tasks.length > 0 && (
        <div className="space-y-8">
          {/* Überfällig */}
          {groupedTasks.overdue.length > 0 && (
            <TaskGroupSection
              title="Überfällig"
              tasks={groupedTasks.overdue}
              badgeColor="bg-red-500/20 text-red-400"
              onMarkAs={handleAction}
              onCopyMessage={handleCopyMessage}
              processingId={processingId}
              copiedId={copiedId}
              overrides={overrides}
            />
          )}
          
          {/* Heute */}
          {groupedTasks.today.length > 0 && (
            <TaskGroupSection
              title="Heute"
              tasks={groupedTasks.today}
              badgeColor="bg-amber-500/20 text-amber-400"
              onMarkAs={handleAction}
              onCopyMessage={handleCopyMessage}
              processingId={processingId}
              copiedId={copiedId}
              overrides={overrides}
            />
          )}
          
          {/* Demnächst */}
          {groupedTasks.upcoming.length > 0 && (
            <TaskGroupSection
              title="Demnächst"
              tasks={groupedTasks.upcoming}
              badgeColor="bg-slate-500/20 text-slate-400"
              onMarkAs={handleAction}
              onCopyMessage={handleCopyMessage}
              processingId={processingId}
              copiedId={copiedId}
              overrides={overrides}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────

interface TaskGroupSectionProps {
  title: string;
  tasks: ReturnType<typeof useFollowUpTasks>['tasks'];
  badgeColor: string;
  onMarkAs: (id: string, status: 'done' | 'skipped') => Promise<void>;
  onCopyMessage: (taskId: string, message: string) => Promise<void>;
  processingId: string | null;
  copiedId: string | null;
  overrides: FollowUpTemplateOverrideLookup;
}

function TaskGroupSection({
  title,
  tasks,
  badgeColor,
  onMarkAs,
  onCopyMessage,
  processingId,
  copiedId,
  overrides,
}: TaskGroupSectionProps) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeColor}`}>
          {title}
        </span>
        <span className="text-xs text-slate-500">({tasks.length})</span>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <FollowUpTaskCard
            key={task.id}
            task={task}
            onMarkAs={onMarkAs}
            onCopyMessage={onCopyMessage}
            isProcessing={processingId === task.id}
            isCopied={copiedId === task.id}
            overrides={overrides}
          />
        ))}
      </div>
    </div>
  );
}

interface FollowUpTaskCardProps {
  task: ReturnType<typeof useFollowUpTasks>['tasks'][0];
  onMarkAs: (id: string, status: 'done' | 'skipped') => Promise<void>;
  onCopyMessage: (taskId: string, message: string) => Promise<void>;
  isProcessing: boolean;
  isCopied: boolean;
  overrides: FollowUpTemplateOverrideLookup;
}

function FollowUpTaskCard({
  task,
  onMarkAs,
  onCopyMessage,
  isProcessing,
  isCopied,
  overrides,
}: FollowUpTaskCardProps) {
  const lead = task.lead;
  const template = getFollowUpTemplateByKey(task.template_key);
  const phaseDisplay = template ? getPhaseDisplay(template.phase) : null;
  const dueInfo = getDueLabel(task.due_at);
  
  // DB-Override für diesen Step + Vertical suchen
  const overrideKey = buildOverrideKey(task.template_key, lead?.vertical);
  const overrideTemplate = overrides[overrideKey];
  
  // Personalisierte Nachricht bauen:
  // 1. Prüfen ob DB-Override existiert → template_message nutzen
  // 2. Sonst Standard buildFollowUpMessage (Config-basiert)
  let personalizedMessage: string;
  
  if (overrideTemplate) {
    // DB-Override nutzen
    let message = overrideTemplate.template_message;
    
    // {{name}} Platzhalter ersetzen
    if (lead?.name) {
      const firstName = lead.name.split(' ')[0];
      message = message.replace(/\{\{\s*name\s*\}\}/gi, firstName);
      message = message.replace(/\[Name\]/g, firstName);
    } else {
      // Platzhalter entfernen
      message = message.replace(/,\s*\{\{\s*name\s*\}\}\s*:/g, ':');
      message = message.replace(/,\s*\{\{\s*name\s*\}\}\s*,/g, ',');
      message = message.replace(/,\s*\{\{\s*name\s*\}\}(\s|$)/g, '$1');
      message = message.replace(/\{\{\s*name\s*\}\}[,:]\s*/g, '');
      message = message.replace(/\{\{\s*name\s*\}\}\s*/g, '');
      message = message.replace(/\[Name\]\s*/g, '');
    }
    
    personalizedMessage = message;
  } else {
    // Standard Config-basierte Nachricht
    personalizedMessage = buildFollowUpMessage(template, lead?.name, lead?.vertical, task.note);
  }
  
  // Telefonnummer bereinigen
  const cleanedPhone = cleanPhoneNumber(lead?.phone);
  const hasPhone = Boolean(cleanedPhone);

  // WhatsApp öffnen Handler
  const handleOpenWhatsApp = () => {
    if (!cleanedPhone) {
      alert('Keine Telefonnummer für diesen Lead hinterlegt.');
      console.error('WhatsApp: Keine Telefonnummer vorhanden für Lead:', lead?.name || 'Unbekannt');
      return;
    }

    try {
      // Führendes + für wa.me URL entfernen (wa.me erwartet Nummer ohne +)
      const phoneForUrl = cleanedPhone.startsWith('+') ? cleanedPhone.slice(1) : cleanedPhone;
      const url = `https://wa.me/${phoneForUrl}?text=${encodeURIComponent(personalizedMessage)}`;
      window.open(url, '_blank');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'WhatsApp konnte nicht geöffnet werden.';
      console.error('WhatsApp öffnen fehlgeschlagen:', message);
      alert(`Fehler: ${message}`);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-lg transition-all hover:border-slate-600">
      {/* Header: Lead Info */}
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              {lead?.name || 'Unbekannter Lead'}
            </h3>
            <p className="text-sm text-slate-400">
              {lead?.company || 'Keine Firma'}
            </p>
          </div>
          <span className="rounded bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {lead?.vertical || 'Generic'}
          </span>
        </div>
        
        {/* Template Label & Phase Badge */}
        {template && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {template.label}
            </span>
            {phaseDisplay && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${phaseDisplay.color}`}>
                {phaseDisplay.label}
              </span>
            )}
          </div>
        )}
        
        {/* Due Date Badge */}
        <div className={`mt-2 flex items-center gap-2 text-xs font-medium ${
          dueInfo.isOverdue 
            ? 'text-red-400' 
            : dueInfo.isToday 
              ? 'text-amber-400' 
              : 'text-emerald-400'
        }`}>
          <CalendarClock className="h-3 w-3" />
          <span>Fällig: {dueInfo.label}</span>
        </div>
      </div>

      {/* Message Preview */}
      {personalizedMessage && (
        <div className="mb-4">
          <div className="rounded-lg bg-slate-900/70 p-3">
            <div className="mb-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              <MessageCircle className="h-3 w-3" />
              Nachricht
            </div>
            <p className="text-sm leading-relaxed text-slate-300">
              {personalizedMessage}
            </p>
          </div>
          
          {/* Copy & WhatsApp Buttons */}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => onCopyMessage(task.id, personalizedMessage)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition ${
                isCopied
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Kopiert!
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4" />
                  Kopieren
                </>
              )}
            </button>
            
            <button
              onClick={handleOpenWhatsApp}
              disabled={!hasPhone}
              title={hasPhone ? 'WhatsApp öffnen' : 'Keine Telefonnummer hinterlegt'}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${
                hasPhone
                  ? 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  : 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500 opacity-50'
              }`}
            >
              <Phone className="h-4 w-4" />
              WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 border-t border-slate-700 pt-4">
        <button
          onClick={() => onMarkAs(task.id, 'skipped')}
          disabled={isProcessing}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-600 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SkipForward className="h-4 w-4" />
          Überspringen
        </button>
        <button
          onClick={() => onMarkAs(task.id, 'done')}
          disabled={isProcessing}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Erledigt
        </button>
      </div>
    </div>
  );
}
