// src/pages/ColdCallAssistantPage.tsx

import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useApi, useMutation } from '@/hooks/useApi';
import { supabaseClient } from '@/lib/supabaseClient';

type CallGoal = "book_meeting" | "qualify" | "identify_decision_maker";
type ScriptSectionType = "opener" | "objection_response" | "close";

interface ScriptSection {
  section_type: ScriptSectionType;
  title: string;
  script: string;
  tips: string[];
}

interface PersonalizedScript {
  contact_name: string;
  company_name: string;
  goal: CallGoal;
  sections: ScriptSection[];
  suggested_objections: string[];
}

type SessionStatus = "planned" | "in_progress" | "completed";

interface ColdCallSession {
  id: string;
  contact_id: string;
  contact_name: string;
  goal: CallGoal;
  status: SessionStatus;
  started_at?: string | null;
  completed_at?: string | null;
  duration_seconds?: number | null;
  notes?: string | null;
  mode?: "live" | "practice";
}

interface Contact {
  id: string;
  name: string;
  company?: string;
  title?: string;
  phone?: string;
}

// --- Einwand-Bibliothek ---

interface ObjectionEntry {
  key: string;
  label: string;
  response: string;
}

const OBJECTION_LIBRARY: ObjectionEntry[] = [
  {
    key: "too_expensive",
    label: "Das ist mir zu teuer",
    response:
      "Verstehe ich total – gerade deswegen ist es wichtig, dass sich jeder investierte Euro rechnet. Darf ich dir kurz zeigen, wie sich das in deinem Alltag wirklich auszahlt?",
  },
  {
    key: "no_time",
    label: "Ich habe gerade keine Zeit",
    response:
      "Absolut nachvollziehbar. Genau darum halten wir das Gespräch kurz und fokussiert. Wenn wir heute in 10 Minuten klären können, ob es überhaupt sinnvoll ist, sparst du dir langfristig viel Zeit.",
  },
  {
    key: "send_info",
    label: "Schick mir einfach Infos per Mail",
    response:
      "Sehr gerne – ich kann dir Infos schicken. Erfahrungsgemäß ist ein kurzes Gespräch aber viel wertvoller, weil wir direkt auf deine Situation eingehen können. Sollen wir 10 Minuten einplanen?",
  },
  {
    key: "already_have_solution",
    label: "Wir haben schon eine Lösung",
    response:
      "Super, dass ihr bereits etwas im Einsatz habt. Genau dann macht ein kurzer Vergleich Sinn: Wenn es nicht besser ist, bleiben wir einfach bei deinem aktuellen Setup – fair?",
  },
];

// --- Timer-Komponente ---

interface TimerProps {
  isRunning: boolean;
  initialSeconds?: number;
  onTick?: (seconds: number) => void;
}

const Timer: FC<TimerProps> = ({ isRunning, initialSeconds = 0, onTick }) => {
  const [seconds, setSeconds] = useState<number>(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    const intervalId = window.setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        if (onTick) {
          onTick(next);
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, onTick]);

  const formatted = useMemo(() => {
    const total = seconds;
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");
    return hrs > 0
      ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
      : `${pad(mins)}:${pad(secs)}`;
  }, [seconds]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/60 px-3 py-1 text-sm text-slate-100">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>Call Timer</span>
      <span className="font-mono text-xs">{formatted}</span>
    </div>
  );
};

// --- Practice Mode Types ---

type PracticeSpeaker = "contact" | "you";

interface PracticeTurn {
  id: string;
  from: PracticeSpeaker;
  text: string;
}

// Hilfsfunktion für IDs
const uid = () => Math.random().toString(36).slice(2);

const ColdCallAssistantPage: FC = () => {
  // Contacts - Nutze bestehende API
  const contactsQuery = useApi<{ items: Contact[] }>('/api/contacts?per_page=100', { immediate: true });
  const contacts = contactsQuery.data?.items || [];
  const contactsLoading = contactsQuery.isLoading;
  const contactsError = contactsQuery.error?.message || null;

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [goal, setGoal] = useState<CallGoal>("book_meeting");

  const [script, setScript] = useState<PersonalizedScript | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Sessions
  const sessionsQuery = useApi<ColdCallSession[]>('/api/cold-call/sessions', { immediate: true });
  const sessions = sessionsQuery.data || [];
  const sessionsLoading = sessionsQuery.isLoading;
  const sessionsError = sessionsQuery.error?.message || null;

  const [currentSession, setCurrentSession] = useState<ColdCallSession | null>(null);
  const [isSessionRunning, setIsSessionRunning] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [notes, setNotes] = useState("");

  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  const [selectedObjectionKey, setSelectedObjectionKey] = useState<string>("");
  const [selectedObjectionText, setSelectedObjectionText] = useState<string>("");

  // Practice Mode
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practiceTurns, setPracticeTurns] = useState<PracticeTurn[]>([]);
  const [practiceInput, setPracticeInput] = useState("");

  // --- Script Generation ---

  const generateScript = useCallback(
    async (contactId: string, callGoal: CallGoal) => {
      try {
        setIsGeneratingScript(true);
        setScriptError(null);

        const { data: sessionData } = await supabaseClient.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        const res = await fetch(
          `/api/cold-call/generate-script/${contactId}?goal=${callGoal}`,
          {
            method: "POST",
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            }
          }
        );

        if (!res.ok) {
          throw new Error(`Generate script failed with ${res.status}`);
        }

        const data: PersonalizedScript = await res.json();
        setScript(data);

        // Reset Objections / Accordions
        setOpenSections({});
        setSelectedObjectionKey("");
        setSelectedObjectionText("");
      } catch (err: any) {
        console.error(err);
        setScriptError(
          "Script konnte nicht generiert werden. Bitte später erneut versuchen."
        );
        setScript(null);
      } finally {
        setIsGeneratingScript(false);
      }
    },
    []
  );

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setGoal("book_meeting");
    setCurrentSession(null);
    setNotes("");
    setIsSessionRunning(false);
    setCurrentDuration(0);
    setIsPracticeMode(false);
    setPracticeTurns([]);
    setPracticeInput("");

    generateScript(contact.id, "book_meeting").catch(() => {
      // Fehler wurde im generateScript bereits behandelt
    });
  };

  const handleGoalChange = (nextGoal: CallGoal) => {
    setGoal(nextGoal);
    if (selectedContact) {
      generateScript(selectedContact.id, nextGoal).catch(() => {
        /* no-op */
      });
    }
  };

  // --- Session Management ---

  const createSessionMutation = useMutation<ColdCallSession>(
    'post',
    '/api/cold-call/session',
    {
      onSuccess: (session) => {
        sessionsQuery.refetch();
        return session;
      },
      onError: (error) => {
        console.error('Create session error:', error);
      }
    }
  );

  const createSession = useCallback(
    async (
      contact: Contact,
      callGoal: CallGoal,
      mode: "live" | "practice"
    ): Promise<ColdCallSession | null> => {
      try {
        const session = await createSessionMutation.mutate({
          contact_id: contact.id,
          goal: callGoal,
          mode,
        });
        return session;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [createSessionMutation]
  );

  const startSessionOnServer = useCallback(async (sessionId: string) => {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const res = await fetch(`/api/cold-call/session/${sessionId}/start`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!res.ok) {
      throw new Error(`Start session failed with ${res.status}`);
    }

    const updated: ColdCallSession = await res.json();
    return updated;
  }, []);

  const completeSessionOnServer = useCallback(
    async (sessionId: string, durationSeconds: number, notesText: string) => {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const res = await fetch(`/api/cold-call/session/${sessionId}/complete`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          duration_seconds: durationSeconds,
          notes: notesText,
        }),
      });

      if (!res.ok) {
        throw new Error(`Complete session failed with ${res.status}`);
      }

      const updated: ColdCallSession = await res.json();
      return updated;
    },
    []
  );

  const handleStartLiveCall = async () => {
    if (!selectedContact) return;

    try {
      setIsPracticeMode(false);
      setPracticeTurns([]);

      let session = currentSession;
      if (!session || session.mode === "practice") {
        session = await createSession(selectedContact, goal, "live");
      }

      if (!session) return;

      const updated = await startSessionOnServer(session.id);
      setCurrentSession(updated);
      sessionsQuery.refetch();
      setCurrentDuration(updated.duration_seconds ?? 0);
      setIsSessionRunning(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartPracticeSession = async () => {
    if (!selectedContact) return;

    try {
      setIsPracticeMode(true);
      setPracticeTurns([]);

      let session = currentSession;
      if (!session || session.mode === "live") {
        session = await createSession(selectedContact, goal, "practice");
      }

      if (!session) return;

      const updated = await startSessionOnServer(session.id);
      setCurrentSession(updated);
      sessionsQuery.refetch();

      setCurrentDuration(updated.duration_seconds ?? 0);
      setIsSessionRunning(true);

      const initialContactLine =
        script?.sections.find((s) => s.section_type === "opener")?.script ??
        `Hallo, hier ist ${selectedContact.name} von ${
          selectedContact.company ?? "Ihrer Firma"
        }.`;

      setPracticeTurns([
        {
          id: uid(),
          from: "contact",
          text: initialContactLine,
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteSession = async () => {
    if (!currentSession) return;

    try {
      const updated = await completeSessionOnServer(
        currentSession.id,
        currentDuration,
        notes
      );
      setCurrentSession(updated);
      sessionsQuery.refetch();
      setIsSessionRunning(false);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Copy-to-Clipboard ---

  const handleCopyToClipboard = async (text: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API not available");
      }
      await navigator.clipboard.writeText(text);
      setClipboardMessage("Text in Zwischenablage kopiert.");
    } catch (err) {
      console.error(err);
      setClipboardMessage("Kopieren nicht möglich.");
    } finally {
      window.setTimeout(() => setClipboardMessage(null), 2500);
    }
  };

  // --- Accordions ---

  const toggleSection = (index: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // --- Objections Handling ---

  const allObjectionOptions = useMemo(() => {
    const scriptSuggestions = script?.suggested_objections ?? [];

    const mappedSuggestions = scriptSuggestions.map((text, index) => ({
      key: `script_${index}`,
      label: text,
    }));

    const libraryOptions = OBJECTION_LIBRARY.map((o) => ({
      key: o.key,
      label: o.label,
    }));

    return {
      scriptSuggestions: mappedSuggestions,
      libraryOptions,
    };
  }, [script]);

  const resolveObjectionAnswer = (key: string): string => {
    if (!key) return "";

    // 1) Prüfe Library
    const library = OBJECTION_LIBRARY.find((o) => o.key === key);
    if (library) return library.response;

    // 2) Script-basierte generische Antwort
    if (script) {
      const section = script.sections.find(
        (s) => s.section_type === "objection_response"
      );
      if (section) {
        return section.script;
      }
    }

    // 3) Fallback
    return "Nutze deine Einwandbehandlung: Wiederhole den Einwand, zeige Verständnis und verknüpfe die Antwort mit dem Nutzen für dein Gegenüber.";
  };

  const handleObjectionSelect = (key: string, label?: string) => {
    setSelectedObjectionKey(key);
    const answer = resolveObjectionAnswer(key);
    setSelectedObjectionText(answer || "");
    if (!answer && label) {
      setSelectedObjectionText(label);
    }
  };

  // --- Practice Mode Chat ---

  const handlePracticeSend = () => {
    const text = practiceInput.trim();
    if (!text) return;

    const yourTurn: PracticeTurn = {
      id: uid(),
      from: "you",
      text,
    };

    const followUps = [
      "Klingt interessant – aber was genau bringt mir das im Alltag?",
      "Ich bin ehrlich gesagt skeptisch. Gibt es Beispiele aus meiner Branche?",
      "Wie schnell würde ich denn Ergebnisse sehen?",
      "Okay, das ist spannend. Was wäre der nächste Schritt?",
    ];

    const contactFollowUp: PracticeTurn | null =
      practiceTurns.length < followUps.length * 2
        ? {
            id: uid(),
            from: "contact",
            text: followUps[Math.floor(practiceTurns.length / 2)] ?? "",
          }
        : null;

    setPracticeTurns((prev) => [
      ...prev,
      yourTurn,
      ...(contactFollowUp ? [contactFollowUp] : []),
    ]);
    setPracticeInput("");
  };

  const canStartCall = !!selectedContact && !!script;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">📞 Cold Call Assistant</h1>
          <p className="text-sm text-slate-400">
            Skripte, Sessions und Übungsmodus für deine Kaltakquise.
          </p>
        </div>
        {clipboardMessage && (
          <div className="rounded-md bg-emerald-900/60 px-3 py-1 text-xs text-emerald-200">
            {clipboardMessage}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
          {/* LEFT COLUMN: Contacts + Sessions */}
          <div className="flex flex-col gap-6">
            {/* Contacts */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-md flex flex-col h-[55%] min-h-[260px]">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  Kontakte
                </h2>
                {contactsLoading && (
                  <span className="text-xs text-slate-400">Laden…</span>
                )}
              </div>
              <div className="px-4 py-3 border-b border-slate-800">
                <input
                  type="text"
                  placeholder="Kontakt suchen…"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {contactsError && (
                  <div className="px-2 text-xs text-red-400">
                    {contactsError}
                  </div>
                )}
                {!contactsError && contacts.length === 0 && !contactsLoading && (
                  <div className="px-2 text-xs text-slate-500">
                    Keine Kontakte gefunden. Bitte API oder Seed-Daten prüfen.
                  </div>
                )}
                <ul className="space-y-1">
                  {contacts.map((contact) => {
                    const isSelected =
                      selectedContact && selectedContact.id === contact.id;
                    return (
                      <li key={contact.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectContact(contact)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? "border border-emerald-500 bg-emerald-500/10"
                              : "border border-transparent hover:border-slate-700 hover:bg-slate-800/70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">
                                {contact.name || "Unbekannter Kontakt"}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {contact.company || "—"}
                              </div>
                            </div>
                            {contact.phone && (
                              <div className="text-[11px] text-slate-400">
                                {contact.phone}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Sessions */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-md flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="text-sm font-semibold tracking-tight">
                  Sessions
                </h2>
                {sessionsLoading && (
                  <span className="text-xs text-slate-400">Laden…</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {sessionsError && (
                  <div className="text-xs text-red-400 mb-2">
                    {sessionsError}
                  </div>
                )}
                {sessions.length === 0 && !sessionsLoading && (
                  <div className="text-xs text-slate-500">
                    Noch keine Cold Call Sessions vorhanden.
                  </div>
                )}
                <ul className="space-y-1 text-xs">
                  {sessions.map((session) => {
                    const isCurrent =
                      currentSession && currentSession.id === session.id;

                    const duration =
                      session.duration_seconds && session.duration_seconds > 0
                        ? `${Math.round(session.duration_seconds / 60)} min`
                        : "—";

                    return (
                      <li
                        key={session.id}
                        className={`rounded-lg border px-3 py-2 ${
                          isCurrent
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-slate-800 bg-slate-900/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium">
                              {session.contact_name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Goal: {session.goal} · Mode:{" "}
                              {session.mode || "live"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] text-slate-400">
                              Status: {session.status}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Dauer: {duration}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Script, Timer, Objections, Practice */}
          <div className="flex flex-col gap-6">
            {/* Current Call Area */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 shadow-md flex flex-col h-[60%] min-h-[320px]">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {selectedContact
                      ? `Call mit ${selectedContact.name}`
                      : "Kein Kontakt ausgewählt"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedContact?.company ?? "Wähle einen Kontakt links."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={goal}
                    onChange={(e) =>
                      handleGoalChange(e.target.value as CallGoal)
                    }
                    disabled={!selectedContact}
                  >
                    <option value="book_meeting">Ziel: Termin buchen</option>
                    <option value="qualify">Ziel: Qualifizieren</option>
                    <option value="identify_decision_maker">
                      Ziel: Entscheider:in finden
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      selectedContact &&
                      generateScript(selectedContact.id, goal).catch(() => {})
                    }
                    disabled={!selectedContact || isGeneratingScript}
                    className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs hover:border-emerald-500 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGeneratingScript ? "Generiere…" : "Script neu generieren"}
                  </button>
                </div>
              </div>

              {/* Script + Timer + Notes */}
              <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer
                      isRunning={isSessionRunning}
                      initialSeconds={
                        currentSession?.duration_seconds ?? currentDuration
                      }
                      onTick={(s) => setCurrentDuration(s)}
                    />
                    {currentSession && (
                      <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">
                        Session: {currentSession.mode ?? "live"} ·{" "}
                        {currentSession.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStartLiveCall}
                      disabled={!canStartCall || isSessionRunning}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                    >
                      Live-Call starten
                    </button>
                    <button
                      type="button"
                      onClick={handleStartPracticeSession}
                      disabled={!canStartCall || isSessionRunning}
                      className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-800/60"
                    >
                      Übungsmodus starten
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteSession}
                      disabled={!currentSession || currentSession.status === "completed"}
                      className="rounded-md bg-red-700/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-800/60"
                    >
                      Session abschließen
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4 flex-1 overflow-hidden">
                  {/* Live Script */}
                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Live Script
                      </h3>
                      {script && (
                        <span className="text-[10px] text-slate-400">
                          Für {script.contact_name} · {script.company_name}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                      {scriptError && (
                        <div className="text-xs text-red-400">
                          {scriptError}
                        </div>
                      )}
                      {!script && !scriptError && (
                        <div className="text-xs text-slate-500">
                          Wähle links einen Kontakt, um ein Script zu
                          generieren.
                        </div>
                      )}
                      {script &&
                        script.sections.map((section, index) => {
                          const isOpen = openSections[index] ?? true;
                          return (
                            <div
                              key={`${section.title}-${index}`}
                              className="rounded-lg border border-slate-800 bg-slate-900/80 text-xs"
                            >
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2"
                                onClick={() => toggleSection(index)}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                                    {section.section_type}
                                  </span>
                                  <span className="font-semibold">
                                    {section.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyToClipboard(section.script);
                                    }}
                                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] hover:border-emerald-500 hover:text-emerald-300"
                                  >
                                    Copy
                                  </button>
                                  <span className="text-slate-500 text-[11px]">
                                    {isOpen ? "▴" : "▾"}
                                  </span>
                                </div>
                              </button>
                              {isOpen && (
                                <div className="border-t border-slate-800 px-3 py-2">
                                  <p className="whitespace-pre-line text-[11px] leading-relaxed text-slate-100">
                                    {section.script}
                                  </p>
                                  {section.tips && section.tips.length > 0 && (
                                    <ul className="mt-2 space-y-1 text-[10px] text-slate-400">
                                      {section.tips.map((tip, i) => (
                                        <li key={i}>• {tip}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Notizen während des Calls
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        Wird beim Abschließen der Session gespeichert.
                      </span>
                    </div>
                    <textarea
                      className="flex-1 rounded-lg border border-slate-800 bg-slate-950/80 p-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Wichtige Infos, Einwände, Follow-up-Todos…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Objection Library + Practice Mode */}
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
              {/* Objection Library */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 shadow-md p-4 flex flex-col">
                <h3 className="text-sm font-semibold mb-2">
                  Einwand-Bibliothek
                </h3>
                <p className="mb-2 text-[11px] text-slate-400">
                  Wähle einen Einwand aus oder klicke auf eine Empfehlung aus
                  dem Script.
                </p>

                <select
                  className="mb-2 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={selectedObjectionKey}
                  onChange={(e) =>
                    handleObjectionSelect(e.target.value || "", undefined)
                  }
                >
                  <option value="">Einwand auswählen…</option>
                  {allObjectionOptions.scriptSuggestions.length > 0 && (
                    <optgroup label="Empfohlen für dieses Script">
                      {allObjectionOptions.scriptSuggestions.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Standard-Einwände">
                    {allObjectionOptions.libraryOptions.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {script && script.suggested_objections.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {script.suggested_objections.map((obj, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          handleObjectionSelect(`script_${i}`, obj)
                        }
                        className="rounded-full bg-slate-800/80 px-2 py-1 text-[10px] text-slate-100 hover:bg-slate-700"
                      >
                        {obj}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex-1 rounded-md border border-slate-800 bg-slate-950/80 p-2 text-[11px] text-slate-100">
                  {selectedObjectionKey ? (
                    <p className="whitespace-pre-line">{selectedObjectionText}</p>
                  ) : (
                    <p className="text-slate-500">
                      Wähle einen Einwand, um eine passende Antwort
                      anzuzeigen.
                    </p>
                  )}
                </div>
              </div>

              {/* Practice Mode */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 shadow-md p-4 flex flex-col h-[260px]">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Übungsmodus</h3>
                  <span className="text-[10px] text-slate-400">
                    KI spielt den Kontakt, du antwortest.
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/80 p-2 mb-2 text-[11px] space-y-1">
                  {practiceTurns.length === 0 && (
                    <p className="text-slate-500">
                      Starte eine Übungssession, um einen simulierten Dialog zu
                      beginnen.
                    </p>
                  )}
                  {practiceTurns.map((turn) => (
                    <div
                      key={turn.id}
                      className={`flex ${
                        turn.from === "you" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-2 py-1 ${
                          turn.from === "you"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-100"
                        }`}
                      >
                        <div className="text-[9px] opacity-75 mb-0.5">
                          {turn.from === "you" ? "Du" : "Kontakt (KI)"}
                        </div>
                        <div>{turn.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <input
                    type="text"
                    className="flex-1 rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder={
                      isPracticeMode
                        ? "Deine Antwort…"
                        : "Starte erst den Übungsmodus."
                    }
                    disabled={!isPracticeMode}
                    value={practiceInput}
                    onChange={(e) => setPracticeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (isPracticeMode) {
                          handlePracticeSend();
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handlePracticeSend}
                    disabled={!isPracticeMode || !practiceInput.trim()}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    Senden
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>  
    </div>
  );
};

export default ColdCallAssistantPage;

