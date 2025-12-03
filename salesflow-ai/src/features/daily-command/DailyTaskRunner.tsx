import React, { useState, useEffect, useMemo } from 'react';
import { Phone, MessageCircle, CheckCircle, Play, X, Instagram, Copy, Loader2, RefreshCw, AlertTriangle, Rocket, CalendarClock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { startStandardFollowUpSequenceForLead } from '@/services/followUpService';
import { useFollowUpSequenceStatus } from '@/hooks/useFollowUpSequenceStatus'; 

// --- TYPEN ---
type TaskType = 'follow_up' | 'reactivation' | 'closing_call' | 'intro';
type Channel = 'whatsapp' | 'instagram' | 'linkedin';

interface DailyTask {
  id: string;
  leadName: string;
  company?: string;
  phone?: string;
  instagram?: string;
  channel: Channel;
  type: TaskType;
  context: string;
  isCompleted: boolean;
}

// Helper: Datum formatieren
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const DailyTaskRunner: React.FC = () => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [activeTask, setActiveTask] = useState<DailyTask | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [startingSequenceId, setStartingSequenceId] = useState<string | null>(null);

  // Lead-IDs für den Follow-up Status Hook
  const leadIds = useMemo(() => tasks.map(t => t.id), [tasks]);
  
  // Follow-up Sequenz Status Hook
  const {
    loading: followUpStatusLoading,
    error: followUpStatusError,
    statusesByLeadId,
    refetch: refetchFollowUpStatus,
  } = useFollowUpSequenceStatus(leadIds);

  // --- ECHTE DATEN LADEN ---
  const fetchTasks = async () => {
    setLoading(true);
    setErrorMsg(null);
    console.log("Start: Lade Leads aus Supabase...");
    
    try {
      // 1. Abfrage an Supabase
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .neq('status', 'closed') // Nur offene Leads
        .limit(10);

      // Debugging Logs (Drücke F12 im Browser -> Console)
      console.log('Supabase Antwort:', leads);
      console.log('Supabase Fehler:', error);

      if (error) throw error;

      if (!leads || leads.length === 0) {
        console.warn("Keine Leads gefunden. Tabelle leer?");
        setTasks([]);
        setLoading(false);
        return;
      }

      // 2. Mapping: DB Spalten -> Frontend Logik
      const mappedTasks: DailyTask[] = leads.map((lead: any) => {
        // Logik: Hat er Insta? -> Insta Channel. Sonst WhatsApp.
        const channel: Channel = lead.instagram ? 'instagram' : 'whatsapp';
        
        // Zufälliger Task-Typ basierend auf Status oder Random
        const types: TaskType[] = ['follow_up', 'reactivation', 'closing_call', 'intro'];
        // Wir nehmen den Status aus der DB wenn er passt, sonst Random
        let type: TaskType = 'follow_up';
        if (lead.status === 'reactivation') type = 'reactivation';
        else if (lead.status === 'intro') type = 'intro';
        else type = types[Math.floor(Math.random() * types.length)];

        // Kontext generieren
        let context = 'Offener Task';
        if (type === 'follow_up') context = 'Hat Info erhalten, Follow-up fällig';
        if (type === 'reactivation') context = 'Lange kein Kontakt, Reaktivierung';
        if (type === 'closing_call') context = 'Entscheidung steht an';
        if (type === 'intro') context = 'Neuer Lead, Erstkontakt';

        return {
          id: lead.id,
          leadName: lead.name, // WICHTIG: DB Feld 'name'
          company: lead.company,
          phone: lead.phone,
          instagram: lead.instagram,
          channel: channel,
          type: type,
          context: context,
          isCompleted: false
        };
      });
      
      setTasks(mappedTasks);

    } catch (err: any) {
      console.error('CRITICAL ERROR:', err);
      setErrorMsg(err.message || "Datenbank-Verbindung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // --- SKRIPT LOGIK ---
  const getScriptAndAction = (task: DailyTask) => {
    const { leadName, type } = task;
    switch (type) {
      case 'follow_up':
        return {
          title: 'Nachfassen',
          script_phone: `"Hi ${leadName}, Alex hier. Ganz kurz: Du hattest ja die Infos. Welche EINE Frage hält dich gerade noch davon ab, loszulegen?"`,
          script_msg: `Hi ${leadName}, kurze Frage: Startklar oder hängt es noch irgendwo? Wollte das kurz vor dem Wochenende klären. 🚀`,
        };
      case 'reactivation':
        return {
          title: 'Wecken',
          script_phone: `"Hey ${leadName}, ich sortiere gerade Kontakte. Thema noch aktuell oder Akte schließen?"`,
          script_msg: `Hey ${leadName}, lange nichts gehört! 👋 Ist das Thema eigentlich noch aktuell oder soll ich dich von der Liste nehmen? Kurzes ja/nein reicht.`,
        };
      case 'closing_call':
        return {
          title: 'Closing',
          script_phone: `"Hi ${leadName}, ich rufe an wegen der Zusammenarbeit. Go oder No-Go?"`,
          script_msg: `Hi ${leadName}, kurzes Update: Go oder No-Go?`,
        };
      case 'intro':
        return {
          title: 'Erstkontakt',
          script_phone: `"Hi ${leadName}, ich habe gesehen du bist im Bereich [Branche]. Lass uns kurz connecten."`,
          script_msg: `Hey ${leadName}, cooles Profil! 🚀 Bist du offen für einen kurzen Austausch zum Thema Skalierung?`,
        };
      default:
        return { title: 'Allgemein', script_phone: '...', script_msg: '...' };
    }
  };

  const markDone = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: true } : t));
    setActiveTask(null);
    setCopied(false);
  };

  const handleStartFollowUpSequence = async (leadId: string, leadName: string) => {
    // Prüfen ob bereits eine aktive Sequenz existiert
    const followUpStatus = statusesByLeadId[leadId];
    if (followUpStatus?.hasActiveSequence) {
      alert(`Für "${leadName}" ist bereits eine Follow-up Sequenz aktiv.\nNächster Step am ${formatDate(followUpStatus.nextDueAt)}.`);
      return;
    }

    setStartingSequenceId(leadId);
    try {
      await startStandardFollowUpSequenceForLead(leadId);
      alert(`Follow-up Sequenz für "${leadName}" erfolgreich gestartet!`);
      // Status aktualisieren, damit UI sofort auf "Sequenz aktiv" springt
      await refetchFollowUpStatus();
    } catch (err) {
      console.error('Follow-up Sequenz Fehler:', err);
      const message = err instanceof Error ? err.message : 'Sequenz konnte nicht gestartet werden';
      alert(`Follow-up Sequenz konnte nicht gestartet werden: ${message}`);
    } finally {
      setStartingSequenceId(null);
    }
  };

  const getWALink = (phone: string | undefined, text: string) => {
    if (!phone) return '#';
    return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
  };

  const getInstaLink = (handle: string | undefined) => {
    if (!handle) return '#';
    return `https://instagram.com/${handle.replace('@', '')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeScript = activeTask ? getScriptAndAction(activeTask) : null;

  return (
    <div className="space-y-6">
      
      {/* TASK LISTE */}
      {!activeTask && (
        <div className="grid gap-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Deine Power Hour ⚡ 
                    {!loading && tasks.length > 0 && (
                        <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
                            {tasks.filter(t => !t.isCompleted).length} offen
                        </span>
                    )}
                </h2>
                <button onClick={fetchTasks} className="text-slate-500 hover:text-white transition p-2 hover:bg-slate-800 rounded-full">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

          {errorMsg && (
             <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <div>
                   <p className="font-bold text-sm">Fehler beim Laden</p>
                   <p className="text-xs">{errorMsg}</p>
                </div>
             </div>
          )}

          {followUpStatusError && (
             <div className="bg-amber-500/10 border border-amber-500/50 p-3 rounded-lg flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs">Follow-up Status konnte nicht geladen werden.</p>
             </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p>Lade Leads...</p>
            </div>
          ) : tasks.length === 0 && !errorMsg ? (
             <div className="text-center p-8 bg-slate-900 border border-dashed border-slate-700 rounded-xl text-slate-400">
                <p className="mb-2">Keine Leads in der Datenbank gefunden.</p>
                <button onClick={fetchTasks} className="text-emerald-500 hover:underline text-sm">Erneut versuchen</button>
             </div>
          ) : (
            tasks.filter(t => !t.isCompleted).map((task) => (
                <div key={task.id} className="bg-slate-900 border border-slate-700 p-4 rounded-xl hover:border-emerald-500/50 transition">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setActiveTask(task)}>
                  <div>
                      <div className="flex items-center gap-2">
                      {task.channel === 'instagram' ? (
                          <Instagram className="w-4 h-4 text-pink-500" />
                      ) : (
                          <MessageCircle className="w-4 h-4 text-emerald-500" />
                      )}
                      <h3 className="text-white font-semibold">{task.leadName}</h3>
                      </div>
                      <p className="text-slate-400 text-sm mt-1">{task.context}</p>
                  </div>
                  
                  <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold transition border border-slate-600">
                      <Play className="w-4 h-4 fill-current text-emerald-400" />
                  </button>
                </div>
                
                {/* Follow-up Sequenz Status & Button */}
                {(() => {
                  const followUpStatus = statusesByLeadId[task.id];
                  const isSequenceActive = followUpStatus?.hasActiveSequence === true;
                  const isLoading = startingSequenceId === task.id;

                  if (isSequenceActive) {
                    // Sequenz ist aktiv - zeige Status und Link zu Follow-ups
                    return (
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-3 py-2">
                        <div className="flex items-center gap-2 text-xs text-emerald-400">
                          <CalendarClock className="h-3 w-3 flex-shrink-0" />
                          <span>
                            Sequenz aktiv{followUpStatus.nextDueAt && (
                              <span className="text-emerald-500"> · Nächster Step: {formatDate(followUpStatus.nextDueAt)}</span>
                            )}
                          </span>
                        </div>
                        <Link
                          to="/follow-ups"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Öffnen
                        </Link>
                      </div>
                    );
                  }

                  // Keine aktive Sequenz - zeige Start-Button
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartFollowUpSequence(task.id, task.leadName);
                      }}
                      disabled={isLoading || followUpStatusLoading}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-600/30 bg-amber-600/10 py-2 text-xs font-medium text-amber-400 transition hover:bg-amber-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Follow-up Sequenz starten"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Rocket className="h-3 w-3" />
                      )}
                      {followUpStatusLoading ? 'Status wird geladen...' : 'Follow-up Sequenz starten'}
                    </button>
                  );
                })()}
                </div>
            ))
          )}
          
          {!loading && tasks.length > 0 && tasks.filter(t => !t.isCompleted).length === 0 && (
            <div className="text-center p-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg">Alles erledigt!</h3>
                <p className="text-slate-400">Genieß deinen Feierabend. 🍻</p>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE MODE OVERLAY (Pop-up) */}
      {activeTask && activeScript && (
        <div className="bg-slate-900 border border-slate-600 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-white ${activeTask.channel === 'instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-[#25D366]'}`}>
                    {activeTask.channel}
                 </span>
                 <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">
                    {activeTask.type.replace('_', ' ')}
                 </span>
              </div>
              <h2 className="text-2xl font-bold text-white">{activeTask.leadName}</h2>
              <p className="text-slate-400 text-sm">
                {activeTask.company ? `${activeTask.company} • ` : ''}{activeTask.context}
              </p>
            </div>
            <button onClick={() => setActiveTask(null)} className="text-slate-500 hover:text-white bg-slate-800 p-2 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* LINK: TELEFON SKRIPT */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Phone className="w-4 h-4 text-blue-400" />
                Backup: Anruf Skript
              </div>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-slate-300 italic">
                {activeScript.script_phone}
              </div>
              {activeTask.phone ? (
                  <a href={`tel:${activeTask.phone}`} className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Nummer wählen ({activeTask.phone})
                  </a>
              ) : (
                <div className="text-red-400 text-xs">Keine Nummer hinterlegt</div>
              )}
            </div>

            {/* RECHTS: NACHRICHTEN ACTION HUB */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-white font-semibold">
                <div className="flex items-center gap-2">
                    {activeTask.channel === 'instagram' ? <Instagram className="w-4 h-4 text-pink-500"/> : <MessageCircle className="w-4 h-4 text-emerald-400"/>}
                    Nachricht
                </div>
                <button 
                    onClick={() => copyToClipboard(activeScript.script_msg)}
                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition"
                >
                    {copied ? <span className="text-emerald-400 font-bold">Kopiert!</span> : <><Copy className="w-3 h-3" /> Text kopieren</>}
                </button>
              </div>
              
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-white text-lg font-medium leading-relaxed">
                {activeScript.script_msg}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => copyToClipboard(activeScript.script_msg)}
                    className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition"
                  >
                    <Copy className="w-4 h-4" />
                    Kopieren
                  </button>

                  {activeTask.channel === 'whatsapp' ? (
                      <a 
                        href={getWALink(activeTask.phone, activeScript.script_msg)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                  ) : activeTask.channel === 'instagram' ? (
                      <a 
                        href={getInstaLink(activeTask.instagram)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-purple-900/20 transition"
                      >
                        <Instagram className="w-4 h-4" />
                        Profil
                      </a>
                  ) : (
                      <button className="bg-slate-600 text-slate-300 cursor-not-allowed py-3 rounded-lg font-bold">Kein Link</button>
                  )}
              </div>
            </div>

          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-700">
            <button onClick={() => setActiveTask(null)} className="px-6 py-2 text-slate-400 hover:text-white font-medium">
              Später
            </button>
            <button 
                onClick={() => markDone(activeTask.id)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2 rounded-lg font-bold transition text-lg shadow-lg shadow-emerald-900/20"
            >
              <CheckCircle className="w-5 h-5" />
              Erledigt
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
