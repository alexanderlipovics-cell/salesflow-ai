import { useEffect, useMemo, useState } from 'react';
import { endOfWeek, isWithinInterval, parseISO, startOfWeek } from 'date-fns';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  Clipboard,
  LayoutGrid,
  Loader2,
  List,
  Mail,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Rocket,
  Send,
  Sparkles,
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
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import FollowUpTemplateManagerPage from './FollowUpTemplateManagerPage';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface LeadOption {
  id: string;
  name: string | null;
  company: string | null;
}

interface MagicSendPreview {
  taskId?: string;
  lead: LeadOption | (FollowUpTaskCardProps['task']['lead'] | null);
  message: string;
  channel?: string | null;
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

const isSameDay = (dateA: Date, dateB: Date) => {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

const isDueToday = (dateString: string | null) => {
  if (!dateString) return false;
  const dueDate = new Date(dateString);
  const today = new Date();
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return isSameDay(dueDate, today);
};

const isDueThisWeek = (dateString: string | null) => {
  if (!dateString) return false;
  const dueDate = parseISO(dateString);
  const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Montag
  const end = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sonntag
  return isWithinInterval(dueDate, { start, end });
};

/**
 * Gruppiert Tasks nach Dringlichkeit
 */
type TaskGroup = 'overdue' | 'today' | 'upcoming';
type ViewMode = 'grid' | 'list';

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

const getPersonalizedMessageForTask = (
  task: ReturnType<typeof useFollowUpTasks>['tasks'][0],
  overrides: FollowUpTemplateOverrideLookup
) => {
  const lead = task.lead;
  const template = getFollowUpTemplateByKey(task.template_key);
  const phaseDisplay = template ? getPhaseDisplay(template.phase) : null;

  const overrideKey = buildOverrideKey(task.template_key, lead?.vertical);
  const overrideTemplate = overrides[overrideKey];

  let personalizedMessage: string;

  if (overrideTemplate) {
    let message = overrideTemplate.template_message;

    if (lead?.name) {
      const firstName = lead.name.split(' ')[0];
      message = message.replace(/\{\{\s*name\s*\}\}/gi, firstName);
      message = message.replace(/\[Name\]/g, firstName);
    } else {
      message = message.replace(/,\s*\{\{\s*name\s*\}\}\s*:/g, ':');
      message = message.replace(/,\s*\{\{\s*name\s*\}\}\s*,/g, ',');
      message = message.replace(/,\s*\{\{\s*name\s*\}\}(\s|$)/g, '$1');
      message = message.replace(/\{\{\s*name\s*\}\}[,:]\s*/g, '');
      message = message.replace(/\{\{\s*name\s*\}\}\s*/g, '');
      message = message.replace(/\[Name\]\s*/g, '');
    }

    personalizedMessage = message;
  } else {
    personalizedMessage = buildFollowUpMessage(template, lead?.name, lead?.vertical, task.note);
  }

  return { personalizedMessage, template, phaseDisplay };
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
  // State für Zeitfilter (MUSS vor useFollowUpTasks sein!)
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('week');
  
  const { tasks, loading, error, markAs, refetch } = useFollowUpTasks(timeFilter);
  
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
  const [magicSendPreview, setMagicSendPreview] = useState<MagicSendPreview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [magicSendError, setMagicSendError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'due' | 'week' | 'templates'>('due');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const markAsResponded = async (leadId: string) => {
    if (!leadId) {
      alert('Lead-ID fehlt – bitte Lead-Daten prüfen.');
      return;
    }

    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/follow-ups/lead/${leadId}/responded`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (response.ok) {
      await refetch();
      alert('✅ Lead als "Hat geantwortet" markiert!');
    } else {
      const errorData = await response.json().catch(() => ({}));
      alert(`Fehler: ${errorData.detail || 'Lead konnte nicht markiert werden.'}`);
    }
  };

  const markAsNoResponse = async (leadId: string) => {
    if (!leadId) {
      alert('Lead-ID fehlt – bitte Lead-Daten prüfen.');
      return;
    }

    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/follow-ups/lead/${leadId}/no-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (response.ok) {
      await refetch();
      alert('⏭️ Nächster Follow-up geplant!');
    } else {
      const errorData = await response.json().catch(() => ({}));
      alert(`Fehler: ${errorData.detail || 'Follow-up konnte nicht aktualisiert werden.'}`);
    }
  };

  const markAsWon = async (leadId: string) => {
    if (!leadId) {
      alert('Lead-ID fehlt – bitte Lead-Daten prüfen.');
      return;
    }

    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/follow-ups/lead/${leadId}/completed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (response.ok) {
      await refetch();
      alert('🎉 Herzlichen Glückwunsch zum neuen Kunden!');
    } else {
      const errorData = await response.json().catch(() => ({}));
      alert(`Fehler: ${errorData.detail || 'Lead konnte nicht als gewonnen markiert werden.'}`);
    }
  };

  const markAsLost = async (leadId: string) => {
    if (!leadId) {
      alert('Lead-ID fehlt – bitte Lead-Daten prüfen.');
      return;
    }

    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/follow-ups/lead/${leadId}/lost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (response.ok) {
      await refetch();
      alert('Lead als verloren markiert. Reaktivierung in 60-90 Tagen geplant.');
    } else {
      const errorData = await response.json().catch(() => ({}));
      alert(`Fehler: ${errorData.detail || 'Lead konnte nicht als verloren markiert werden.'}`);
    }
  };

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

  const dueToday = useMemo(
    () => tasks.filter((task) => isDueToday(task.due_at)),
    [tasks]
  );

  const dueThisWeek = useMemo(
    () => tasks.filter((task) => isDueThisWeek(task.due_at)),
    [tasks]
  );

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

  const inferChannel = (lead: FollowUpTaskCardProps['task']['lead'] | null): string => {
    if (!lead) return 'whatsapp';
    if (lead.phone) return 'whatsapp';
    if ((lead as any).email) return 'email';
    return 'linkedin';
  };

  const getLeadFirstName = (
    lead: FollowUpTaskCardProps['task']['lead'] | LeadOption | null
  ): string => {
    if (!lead) return 'Lead';
    const first = (lead as any).first_name || (lead as any).firstName;
    if (first) return first;
    const fullName = (lead as any).name;
    if (fullName && typeof fullName === 'string') {
      return fullName.split(' ')[0];
    }
    return 'Lead';
  };

  const handleMagicSend = async (
    task: ReturnType<typeof useFollowUpTasks>['tasks'][0],
    fallbackMessage?: string
  ) => {
    if (!task.lead_id && !task.lead?.id) {
      alert('Lead-ID fehlt – bitte Lead-Daten prüfen.');
      return;
    }

    setIsGenerating(true);
    setMagicSendError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/ai/generate-followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lead_id: task.lead_id || task.lead?.id,
          context: task.note || task.lead?.notes || task.lead?.source,
          follow_up_type: task.template_key,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'Nachricht konnte nicht generiert werden.');
      }

      const suggestedChannel = data.suggested_channel || data.channel || inferChannel(task.lead);
      const messageText =
        data.message || data.content || fallbackMessage || 'Nachricht konnte nicht generiert werden.';

      setMagicSendPreview({
        taskId: task.id,
        lead: task.lead,
        message: messageText,
        channel: suggestedChannel,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Magic Send fehlgeschlagen.';
      setMagicSendError(message);
      alert(`Fehler: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualWrite = (
    task: ReturnType<typeof useFollowUpTasks>['tasks'][0],
    fallbackMessage?: string
  ) => {
    setMagicSendPreview({
      taskId: task.id,
      lead: task.lead,
      message: fallbackMessage || '',
      channel: inferChannel(task.lead),
    });
  };

  const mapChannelToPlatform = (channel?: string | null) => {
    if (!channel) return 'whatsapp';
    if (channel.includes('email')) return 'email';
    if (channel.includes('instagram')) return 'instagram';
    if (channel.includes('linkedin')) return 'whatsapp';
    if (channel.includes('telegram')) return 'telegram';
    return channel;
  };

  const handleConfirmSend = async (preview: MagicSendPreview) => {
    if (!preview.lead) {
      alert('Kein Lead vorhanden.');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/magic-send/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          platform: mapChannelToPlatform(preview.channel),
          message: preview.message,
          phone: (preview.lead as any).phone,
          email: (preview.lead as any).email,
          instagram_handle: (preview.lead as any).instagram,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'Versand nicht möglich.');
      }

      if (data.deep_link) {
        window.open(data.deep_link, '_blank');
      }

      if (preview.taskId) {
        await markAs(preview.taskId, 'done');
        await refetch();
      }

      setMagicSendPreview(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Versand fehlgeschlagen';
      setMagicSendError(message);
      alert(`Fehler: ${message}`);
    }
  };

  const handleRegenerate = async () => {
    if (!magicSendPreview?.taskId) return;
    const relatedTask = tasks.find((t) => t.id === magicSendPreview.taskId);
    if (relatedTask) {
      await handleMagicSend(relatedTask, magicSendPreview.message);
    }
  };

  const handleMagicSendAll = async () => {
    if (!dueToday.length) {
      alert('Keine heute fälligen Follow-ups.');
      return;
    }

    setIsGenerating(true);
    setMagicSendError(null);

    try {
      const token = localStorage.getItem('access_token');
      const leadIds = dueToday
        .map((task) => task.lead_id || task.lead?.id)
        .filter(Boolean);

      const response = await fetch('/api/follow-ups/batch/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ lead_ids: leadIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'Batch-Generierung fehlgeschlagen.');
      }

      if (data.messages && data.messages.length > 0) {
        const first = data.messages[0];
        const relatedTask = tasks.find(
          (t) => (t.lead_id || t.lead?.id) === first.lead_id
        );

        setMagicSendPreview({
          taskId: relatedTask?.id,
          lead: relatedTask?.lead || null,
          message: first.content || first.message || '',
          channel: first.channel || first.suggested_channel,
        });
      } else {
        alert('Keine Nachrichten generiert.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Magic Send All fehlgeschlagen';
      setMagicSendError(message);
      alert(`Fehler: ${message}`);
    } finally {
      setIsGenerating(false);
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
  const groupedWeekTasks = groupTasks(dueThisWeek);

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 pb-24 text-slate-50">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Follow-ups 📬</h1>
            <p className="text-sm text-slate-400">Deine offenen Nachfass-Aufgaben aus allen Leads.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Zeitfilter */}
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 p-1">
            <Button
              size="sm"
              variant={timeFilter === 'week' ? 'default' : 'ghost'}
              className="flex items-center gap-1"
              onClick={() => setTimeFilter('week')}
            >
              Diese Woche
            </Button>
            <Button
              size="sm"
              variant={timeFilter === 'month' ? 'default' : 'ghost'}
              className="flex items-center gap-1"
              onClick={() => setTimeFilter('month')}
            >
              Dieser Monat
            </Button>
            <Button
              size="sm"
              variant={timeFilter === 'all' ? 'default' : 'ghost'}
              className="flex items-center gap-1"
              onClick={() => setTimeFilter('all')}
            >
              Alle
            </Button>
          </div>

          {/* View Mode */}
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 p-1">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              className="flex items-center gap-1"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              className="flex items-center gap-1"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              Liste
            </Button>
          </div>

          <Button
            onClick={handleMagicSendAll}
            className="bg-gradient-to-r from-purple-500 to-indigo-600"
            disabled={isGenerating || dueToday.length === 0}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Magic Send All ({dueToday.length})
          </Button>

          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={loading || overridesLoading || isGenerating}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
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

      {magicSendError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p>{magicSendError}</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mt-4">
        <TabsList>
          <TabsTrigger value="due">Heute fällig ({dueToday.length})</TabsTrigger>
          <TabsTrigger value="week">Diese Woche ({dueThisWeek.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="due">
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
            <div className="space-y-8 mt-6">
              {/* Überfällig */}
              {groupedTasks.overdue.length > 0 && (
                <TaskGroupSection
                  title="Überfällig"
                  tasks={groupedTasks.overdue}
                  badgeColor="bg-red-500/20 text-red-400"
                  onMarkAs={handleAction}
                  onCopyMessage={handleCopyMessage}
                  onMagicSend={handleMagicSend}
                  onManualWrite={handleManualWrite}
                  onResponded={markAsResponded}
                  onNoResponse={markAsNoResponse}
                  onWon={markAsWon}
                  onLost={markAsLost}
                  processingId={processingId}
                  copiedId={copiedId}
                  overrides={overrides}
                  isGenerating={isGenerating}
                  viewMode={viewMode}
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
                  onMagicSend={handleMagicSend}
                  onManualWrite={handleManualWrite}
                  onResponded={markAsResponded}
                  onNoResponse={markAsNoResponse}
                  onWon={markAsWon}
                  onLost={markAsLost}
                  processingId={processingId}
                  copiedId={copiedId}
                  overrides={overrides}
                  isGenerating={isGenerating}
                  viewMode={viewMode}
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
                  onMagicSend={handleMagicSend}
                  onManualWrite={handleManualWrite}
                  onResponded={markAsResponded}
                  onNoResponse={markAsNoResponse}
                  onWon={markAsWon}
                  onLost={markAsLost}
                  processingId={processingId}
                  copiedId={copiedId}
                  overrides={overrides}
                  isGenerating={isGenerating}
                  viewMode={viewMode}
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="week">
          {dueThisWeek.length === 0 ? (
            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
              Keine Follow-ups für diese Woche geplant.
            </div>
          ) : (
            <div className="space-y-8 mt-6">
              {groupedWeekTasks.today.length > 0 && (
                <TaskGroupSection
                  title="Diese Woche"
                  tasks={groupedWeekTasks.today}
                  badgeColor="bg-blue-500/20 text-blue-300"
                  onMarkAs={handleAction}
                  onCopyMessage={handleCopyMessage}
                  onMagicSend={handleMagicSend}
                  onManualWrite={handleManualWrite}
                  onResponded={markAsResponded}
                  onNoResponse={markAsNoResponse}
                  onWon={markAsWon}
                  onLost={markAsLost}
                  processingId={processingId}
                  copiedId={copiedId}
                  overrides={overrides}
                  isGenerating={isGenerating}
                  viewMode={viewMode}
                />
              )}
              {groupedWeekTasks.upcoming.length > 0 && (
                <TaskGroupSection
                  title="Später in der Woche"
                  tasks={groupedWeekTasks.upcoming}
                  badgeColor="bg-slate-500/20 text-slate-400"
                  onMarkAs={handleAction}
                  onCopyMessage={handleCopyMessage}
                  onMagicSend={handleMagicSend}
                  onManualWrite={handleManualWrite}
                  onResponded={markAsResponded}
                  onNoResponse={markAsNoResponse}
                  onWon={markAsWon}
                  onLost={markAsLost}
                  processingId={processingId}
                  copiedId={copiedId}
                  overrides={overrides}
                  isGenerating={isGenerating}
                  viewMode={viewMode}
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900">
            <FollowUpTemplateManagerPage />
          </div>
        </TabsContent>
      </Tabs>

      {magicSendPreview && (
        <Modal onClose={() => setMagicSendPreview(null)}>
          <div className="p-6">
            <h3 className="font-semibold mb-2">
              Nachricht an {getLeadFirstName(magicSendPreview.lead as any)}
            </h3>
            <div className="text-sm text-gray-500 mb-4">
              via {magicSendPreview.channel || 'whatsapp'}
            </div>
            
            <textarea
              value={magicSendPreview.message}
              onChange={(e) =>
                setMagicSendPreview({
                  ...magicSendPreview,
                  message: e.target.value,
                })
              }
              className="w-full h-32 p-3 border rounded-lg mb-4 text-slate-900"
            />
            
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setMagicSendPreview(null)}>
                Abbrechen
              </Button>
              <Button variant="outline" onClick={handleRegenerate}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Neu generieren
              </Button>
              <Button 
                className="bg-green-500 hover:bg-green-600"
                onClick={() => handleConfirmSend(magicSendPreview)}
              >
                <Send className="w-4 h-4 mr-1" />
                Senden
              </Button>
            </div>
          </div>
        </Modal>
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
  onMagicSend: (
    task: ReturnType<typeof useFollowUpTasks>['tasks'][0],
    fallbackMessage?: string
  ) => Promise<void>;
  onManualWrite: (
    task: ReturnType<typeof useFollowUpTasks>['tasks'][0],
    fallbackMessage?: string
  ) => void;
  onResponded: (leadId: string) => Promise<void> | void;
  onNoResponse: (leadId: string) => Promise<void> | void;
  onWon: (leadId: string) => Promise<void> | void;
  onLost: (leadId: string) => Promise<void> | void;
  processingId: string | null;
  copiedId: string | null;
  overrides: FollowUpTemplateOverrideLookup;
  isGenerating: boolean;
  viewMode: ViewMode;
}

function TaskGroupSection({
  title,
  tasks,
  badgeColor,
  onMarkAs,
  onCopyMessage,
  onMagicSend,
  onManualWrite,
  onResponded,
  onNoResponse,
  onWon,
  onLost,
  processingId,
  copiedId,
  overrides,
  isGenerating,
  viewMode,
}: TaskGroupSectionProps) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeColor}`}>
          {title}
        </span>
        <span className="text-xs text-slate-500">({tasks.length})</span>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <FollowUpTaskCard
              key={task.id}
              task={task}
              onMarkAs={onMarkAs}
              onCopyMessage={onCopyMessage}
              onMagicSend={onMagicSend}
              onManualWrite={onManualWrite}
              onResponded={onResponded}
              onNoResponse={onNoResponse}
              onWon={onWon}
              onLost={onLost}
              isProcessing={processingId === task.id}
              isGenerating={isGenerating}
              isCopied={copiedId === task.id}
              overrides={overrides}
            />
          ))}
        </div>
      ) : (
        <TaskListTable
          tasks={tasks}
          onMarkAs={onMarkAs}
          onCopyMessage={onCopyMessage}
          onMagicSend={onMagicSend}
          onManualWrite={onManualWrite}
          onResponded={onResponded}
          onNoResponse={onNoResponse}
          onWon={onWon}
          onLost={onLost}
          processingId={processingId}
          isGenerating={isGenerating}
          overrides={overrides}
        />
      )}
    </div>
  );
}

interface FollowUpTaskCardProps {
  task: ReturnType<typeof useFollowUpTasks>['tasks'][0];
  onMarkAs: (id: string, status: 'done' | 'skipped') => Promise<void>;
  onCopyMessage: (taskId: string, message: string) => Promise<void>;
  onMagicSend: (
    task: ReturnType<typeof useFollowUpTasks>['tasks'][0],
    fallbackMessage?: string
  ) => Promise<void>;
  onManualWrite: (
    task: ReturnType<typeof useFollowUpTasks>['tasks'][0],
    fallbackMessage?: string
  ) => void;
  onResponded: (leadId: string) => Promise<void> | void;
  onNoResponse: (leadId: string) => Promise<void> | void;
  onWon: (leadId: string) => Promise<void> | void;
  onLost: (leadId: string) => Promise<void> | void;
  isProcessing: boolean;
  isGenerating: boolean;
  isCopied: boolean;
  overrides: FollowUpTemplateOverrideLookup;
}

function FollowUpTaskCard({
  task,
  onMarkAs,
  onCopyMessage,
  onMagicSend,
  onManualWrite,
  onResponded,
  onNoResponse,
  onWon,
  onLost,
  isProcessing,
  isGenerating,
  isCopied,
  overrides,
}: FollowUpTaskCardProps) {
  const lead = task.lead;
  const { personalizedMessage, template, phaseDisplay } = getPersonalizedMessageForTask(task, overrides);
  const dueInfo = getDueLabel(task.due_at);
  const displayName = lead?.name || lead?.email || 'Neuer Kontakt';
  const displayCompany = lead?.company || '';
  const sequenceStatus = (lead as any)?.sequence_status || 'new';
  const leadId = task.lead_id || lead?.id || '';
  const [showFullMessage, setShowFullMessage] = useState(false);

  const statusBorder = dueInfo.isOverdue
    ? 'border-l-red-500'
    : dueInfo.isToday
      ? 'border-l-yellow-500'
      : 'border-l-slate-600';

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/80 p-4 shadow-sm transition-all hover:border-slate-600 border-l-4 ${statusBorder}`}
    >
      <div className="mb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">
              {displayName}
            </h3>
            <p className="text-xs text-slate-400">
              {displayCompany}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {lead?.vertical || 'Generic'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
              {sequenceStatus}
            </span>
            <div
              className={`flex items-center gap-2 text-[11px] font-medium ${
                dueInfo.isOverdue
                  ? 'text-red-400'
                  : dueInfo.isToday
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              <CalendarClock className="h-3 w-3" />
              <span>Fällig: {dueInfo.label}</span>
            </div>
          </div>
        </div>
        
        {template && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white leading-none">
              {template.label}
            </span>
            {phaseDisplay && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${phaseDisplay.color}`}>
                {phaseDisplay.label}
              </span>
            )}
          </div>
        )}
      </div>

      {personalizedMessage && (
        <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            <MessageCircle className="h-3 w-3" />
            Nachricht
          </div>
          <p
            className={`text-sm leading-relaxed text-slate-200 ${showFullMessage ? '' : 'line-clamp-2'}`}
          >
            {personalizedMessage}
          </p>
          {personalizedMessage.length > 140 && (
            <button
              onClick={() => setShowFullMessage((prev) => !prev)}
              className="mt-1 text-xs font-medium text-amber-400 hover:text-amber-300"
            >
              {showFullMessage ? 'Weniger anzeigen' : 'Mehr...'}
            </button>
          )}
        </div>
      )}

      <ActionButtons
        onSend={() => onMagicSend(task, personalizedMessage)}
        onDone={() => onMarkAs(task.id, 'done')}
        onCopy={() => onCopyMessage(task.id, personalizedMessage)}
        onManual={() => onManualWrite(task, personalizedMessage)}
        onSkip={() => onMarkAs(task.id, 'skipped')}
        onResponded={onResponded}
        onNoResponse={onNoResponse}
        onWon={onWon}
        onLost={onLost}
        leadId={leadId}
        isProcessing={isProcessing}
        isGenerating={isGenerating}
        disableCopy={!personalizedMessage}
        isCopied={isCopied}
      />
    </div>
  );
}

interface TaskListTableProps {
  tasks: ReturnType<typeof useFollowUpTasks>['tasks'];
  onMarkAs: (id: string, status: 'done' | 'skipped') => Promise<void>;
  onCopyMessage: (taskId: string, message: string) => Promise<void>;
  onMagicSend: (
    task: ReturnType<typeof useFollowUpTasks>['tasks'][0],
    fallbackMessage?: string
  ) => Promise<void>;
  onManualWrite: (
    task: ReturnType<typeof useFollowUpTasks>['tasks'][0],
    fallbackMessage?: string
  ) => void;
  onResponded: (leadId: string) => Promise<void> | void;
  onNoResponse: (leadId: string) => Promise<void> | void;
  onWon: (leadId: string) => Promise<void> | void;
  onLost: (leadId: string) => Promise<void> | void;
  processingId: string | null;
  isGenerating: boolean;
  overrides: FollowUpTemplateOverrideLookup;
}

function TaskListTable({
  tasks,
  onMarkAs,
  onCopyMessage,
  onMagicSend,
  onManualWrite,
  onResponded,
  onNoResponse,
  onWon,
  onLost,
  processingId,
  isGenerating,
  overrides,
}: TaskListTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-800 text-[11px] uppercase text-slate-400">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">Name</th>
            <th className="px-4 py-2 text-left font-semibold">Firma</th>
            <th className="px-4 py-2 text-left font-semibold">Status</th>
            <th className="px-4 py-2 text-left font-semibold">Fällig</th>
            <th className="px-4 py-2 text-left font-semibold">Aktionen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {tasks.map((task) => {
            const lead = task.lead;
            const { personalizedMessage, template } = getPersonalizedMessageForTask(task, overrides);
            const dueInfo = getDueLabel(task.due_at);
            const displayName = lead?.name || lead?.email || 'Neuer Kontakt';
            const displayCompany = lead?.company || '';
            const leadId = task.lead_id || lead?.id || '';
            const statusColor = dueInfo.isOverdue
              ? 'text-red-400'
              : dueInfo.isToday
                ? 'text-amber-400'
                : 'text-slate-300';

            return (
              <tr key={task.id} className="hover:bg-slate-800/60">
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-white">{displayName}</div>
                  <div className="text-xs text-slate-500">{template?.label || 'Follow-up'}</div>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {displayCompany || '–'}
                </td>
                <td className="px-4 py-3">
                  <div className={`flex items-center gap-2 text-sm ${statusColor}`}>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        dueInfo.isOverdue
                          ? 'bg-red-400'
                          : dueInfo.isToday
                            ? 'bg-amber-400'
                            : 'bg-slate-500'
                      }`}
                    />
                    <span>{dueInfo.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {formatDate(task.due_at)}
                </td>
                <td className="px-4 py-3">
                  <ActionButtons
                    onSend={() => onMagicSend(task, personalizedMessage)}
                    onDone={() => onMarkAs(task.id, 'done')}
                    onCopy={() => onCopyMessage(task.id, personalizedMessage)}
                    onManual={() => onManualWrite(task, personalizedMessage)}
                    onSkip={() => onMarkAs(task.id, 'skipped')}
                    onResponded={onResponded}
                    onNoResponse={onNoResponse}
                    onWon={onWon}
                    onLost={onLost}
                    leadId={leadId}
                    isProcessing={processingId === task.id}
                    isGenerating={isGenerating}
                    disableCopy={!personalizedMessage}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ActionButtonsProps {
  onSend: () => void;
  onDone: () => void;
  onCopy: () => void;
  onManual: () => void;
  onSkip: () => void;
  onResponded: (leadId: string) => Promise<void> | void;
  onNoResponse: (leadId: string) => Promise<void> | void;
  onWon: (leadId: string) => Promise<void> | void;
  onLost: (leadId: string) => Promise<void> | void;
  leadId: string;
  isProcessing: boolean;
  isGenerating: boolean;
  disableCopy?: boolean;
  isCopied?: boolean;
}

function ActionButtons({
  onSend,
  onDone,
  onCopy,
  onManual,
  onSkip,
  onResponded,
  onNoResponse,
  onWon,
  onLost,
  leadId,
  isProcessing,
  isGenerating,
  disableCopy,
  isCopied,
}: ActionButtonsProps) {
  const hasLead = Boolean(leadId);
  const MenuItem = DropdownMenuItem as any;

  // Handler mit Fehlerbehandlung
  const handleStatusClick = (handler: (leadId: string) => void | Promise<void>, actionName: string) => {
    if (!hasLead) {
      alert(`Lead-ID fehlt – ${actionName} kann nicht ausgeführt werden.`);
      return;
    }
    try {
      handler(leadId);
    } catch (error) {
      console.error(`Fehler bei ${actionName}:`, error);
      alert(`Fehler bei ${actionName}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={onSend}
          className="bg-indigo-500 hover:bg-indigo-600 text-white"
          disabled={isGenerating}
          size="sm"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Senden
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-green-500 text-green-400 hover:bg-green-500/10"
          onClick={onDone}
          disabled={isProcessing}
        >
          <Check className="w-4 h-4 mr-1" />
          Erledigt
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 border border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border border-slate-700 bg-slate-800 text-slate-100 shadow-lg"
          >
            <MenuItem
              onClick={onCopy}
              disabled={disableCopy}
              className="cursor-pointer focus:bg-slate-700"
            >
              <Clipboard className="mr-2 h-4 w-4" />
              {isCopied ? 'Kopiert!' : 'Kopieren'}
            </MenuItem>
            <MenuItem onClick={onManual} className="cursor-pointer focus:bg-slate-700">
              Manuell
            </MenuItem>
            <MenuItem onClick={onSkip} className="cursor-pointer focus:bg-slate-700">
              <SkipForward className="mr-2 h-4 w-4" />
              Überspringen
            </MenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700">
        <span className="text-xs text-slate-500 mr-2">Status:</span>

        <Button
          variant="outline"
          size="sm"
          className="border-green-500 text-green-400 hover:bg-green-500/10 text-xs px-2 py-1"
          onClick={() => handleStatusClick(onResponded, 'Geantwortet markieren')}
          disabled={!hasLead || isProcessing}
        >
          ✅ Geantwortet
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10 text-xs px-2 py-1"
          onClick={() => handleStatusClick(onNoResponse, 'Keine Antwort markieren')}
          disabled={!hasLead || isProcessing}
        >
          ⏭️ Keine Antwort
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 text-xs px-2 py-1"
          onClick={() => handleStatusClick(onWon, 'Gewonnen markieren')}
          disabled={!hasLead || isProcessing}
        >
          🎉 Gewonnen
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="border-red-500 text-red-400 hover:bg-red-500/10 text-xs px-2 py-1"
          onClick={() => handleStatusClick(onLost, 'Verloren markieren')}
          disabled={!hasLead || isProcessing}
        >
          ❌ Verloren
        </Button>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {children}
      </div>
    </div>
  );
}
