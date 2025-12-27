import clsx from "clsx";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Bot, Loader2, Mic, MicOff, Paperclip, Send, Shield, Sparkles, Upload, User, Volume2, VolumeX, Camera, Zap, Target, Check, AlertTriangle, TrendingUp, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useVoice } from "../hooks/useVoice";
import AnalysisCard from '../components/chat/AnalysisCard';
import { useSmartImport } from '../hooks/useSmartImport';
import MeetingPrepCard from "../components/chat/MeetingPrepCard";
import StakeholderCard from "../components/StakeholderCard";
import VoiceRecorder from "../components/VoiceRecorder";
import WhatsAppMessageActions from "../components/chat/WhatsAppMessageActions";
import SendMessageModal from "@/components/chat/SendMessageModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const initialMessages = [
  {
    id: "sys",
    role: "assistant",
    content:
      "Hey! 👋 Ich bin dein Al Sales Solutions Copilot. Was können wir heute in deiner Pipeline bewegen?",
  },
];

const quickActions = [
  "Lead analysieren",
  "Follow-up schreiben",
  "Einwand behandeln",
  "Abschluss-Strategie",
];

const quickSuggestions = [
  { label: "Was soll ich tun?", icon: "🎯" },
  { label: "Meine Performance", icon: "📊" },
  { label: "Gefährdete Leads", icon: "⚠️" },
  { label: "Gespräch üben", icon: "🎭" },
];

const defaultLeadContext = `{
  "name": "Sebastian Krüger",
  "company": "Flowmatic",
  "status": "Demo erledigt",
  "next_step": "Nach 3 Tagen follow-up",
  "notes": "Hat Budget für Q1 reserviert"
}`;

const leadFieldLabels = [
  { key: "name", label: "Name" },
  { key: "company", label: "Firma" },
  { key: "status", label: "Status" },
  { key: "next_step", label: "Nächster Schritt" },
  { key: "notes", label: "Notizen" },
];

const LeadContextSummary = ({ entries, hasError, onEdit, className = "" }) => {
  if (hasError) {
    return (
      <div
        className={clsx(
          "rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-50",
          className
        )}
      >
        <p>Der Lead-Kontext konnte nicht geladen werden. Bitte prüfe dein JSON.</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-rose-400/50 px-4 py-1.5 text-xs font-semibold text-rose-100 hover:border-rose-200/80"
          >
            JSON bearbeiten
          </button>
        )}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div
        className={clsx(
          "rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-300",
          className
        )}
      >
        <p>Noch keine Lead-Daten hinterlegt.</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:text-white"
          >
            Lead-Kontext hinzufügen
          </button>
        )}
      </div>
    );
  }

  return (
    <dl className={clsx("space-y-3", className)}>
      {entries.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            {label}
          </dt>
          <dd className="mt-1 text-sm text-slate-100 whitespace-pre-line">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // URL-Parameter für vorgefüllten Text (z.B. aus Follow-ups Seite)
  const [searchParams, setSearchParams] = useSearchParams();
  const promptParam = searchParams.get("prompt") ?? "";
  // State-basierte initiale Nachricht (z.B. von Network Dashboard)
  const stateInitialMessage = location.state?.initialMessage ?? "";
  const [prefillApplied, setPrefillApplied] = useState(false);

  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [localInput, setLocalInput] = useState(""); // Local state for input to prevent re-renders
  const [isLoading, setIsLoading] = useState(false);
  const [leadContext, setLeadContext] = useState(defaultLeadContext);
  const [contextSaved, setContextSaved] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [contextPanel, setContextPanel] = useState("lead");
  const [isEditingLeadContext, setIsEditingLeadContext] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [meetingPrep, setMeetingPrep] = useState(null);
  const [isPreparingMeeting, setIsPreparingMeeting] = useState(false);
  const [extractedContact, setExtractedContact] = useState(null);

  // Onboarding States
  const [onboardingMode, setOnboardingMode] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [, setUploadedImage] = useState(null);
  const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState(false);
  const [stakeholderCandidate, setStakeholderCandidate] = useState(null);
  const [lastStakeholderName, setLastStakeholderName] = useState(null);
  const [listDetected, setListDetected] = useState(false);
  const [parsedContacts, setParsedContacts] = useState([]);
  const [selectedForImport, setSelectedForImport] = useState([]);
  const [isParsingList, setIsParsingList] = useState(false);
  const [listError, setListError] = useState(null);
  const [isImportingList, setIsImportingList] = useState(false);
  const [sendModal, setSendModal] = useState({ open: false, message: "", lead: null });
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const ENABLE_STAKEHOLDER_DETECTION = false; // disable auto stakeholder dialog
  // Deep Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [leadAnalysis, setLeadAnalysis] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [savingLead, setSavingLead] = useState(false);

  const showSuggestions = messages.length <= 1 && !isLoading;

  const lastParsedListRef = useRef("");

  // File input ref for screenshots
  const fileInputRef = useRef(null);

  // Voice Hook für Spracheingabe & -ausgabe
  const {
    isListening,
    transcript,
    interimTranscript,
    toggleListening,
    isSupported: voiceSupported,
    isSpeaking,
    speak,
    stopSpeaking,
    isTTSSupported,
  } = useVoice({
    language: 'de-DE',
    onResult: (text) => {
      const newText = (input || '') + (input ? ' ' : '') + text;
      setInput(newText);
      setLocalInput(newText);
    },
  });

  // Smart Import Hook
  const {
    isAnalyzing,
    analysisResult,
    shouldAnalyze,
    analyzeText,
    saveLead,
    getMagicLink,
    clearAnalysis,
    setAnalysisResult
  } = useSmartImport();

  // Ref für Auto-Scroll
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-Scroll zu neuesten Nachrichten
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Prompt aus URL-Parameter anwenden
  useEffect(() => {
    if (promptParam && !prefillApplied) {
      const decodedPrompt = decodeURIComponent(promptParam);
      setInput(decodedPrompt);
      setLocalInput(decodedPrompt);
      setPrefillApplied(true);
      // URL-Parameter entfernen, um bei Refresh nicht erneut zu setzen
      setSearchParams({}, { replace: true });
    }
  }, [promptParam, prefillApplied, setSearchParams]);

  // State-basierte initiale Nachricht (z.B. von Network Dashboard)
  useEffect(() => {
    if (stateInitialMessage && !prefillApplied && !promptParam) {
      setInput(stateInitialMessage);
      setLocalInput(stateInitialMessage);
      setPrefillApplied(true);
    }
  }, [stateInitialMessage, prefillApplied, promptParam]);

  const parsedLeadContext = useMemo(() => {
    try {
      return JSON.parse(leadContext || "{}");
    } catch (error) {
      console.error("Ungültiger Lead-Kontext", error);
      return null;
    }
  }, [leadContext]);

  const currentLead = useMemo(() => {
    if (!parsedLeadContext || typeof parsedLeadContext !== "object") return null;
    return parsedLeadContext;
  }, [parsedLeadContext]);

  const leadContextEntries = useMemo(() => {
    if (!parsedLeadContext || typeof parsedLeadContext !== "object") {
      return [];
    }

    const prioritized = leadFieldLabels
      .map(({ key, label }) => {
        const value = parsedLeadContext[key];
        if (value === undefined || value === null || value === "") return null;
        return {
          label,
          value:
            typeof value === "string" ? value : JSON.stringify(value, null, 2),
        };
      })
      .filter(Boolean);

    const additional = Object.entries(parsedLeadContext)
      .filter(([key, value]) => {
        if (value === undefined || value === null || value === "") return false;
        return !leadFieldLabels.some((field) => field.key === key);
      })
      .map(([key, value]) => ({
        label: key
          .split("_")
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(" "),
        value: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      }));

    return [...prioritized, ...additional];
  }, [parsedLeadContext]);

  const hasLeadContextError = !parsedLeadContext || typeof parsedLeadContext !== "object";

  const detectNewStakeholder = (text) => {
    if (!text) return null;

    const patterns = [
      /(?:Herr|Frau|Hr\.|Fr\.)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/g,
      /(?:mit|von|bei)\s+([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)/g,
    ];
    const matches = patterns.flatMap((pattern) => Array.from(text.matchAll(pattern)));
    let detectedName = matches.length ? matches[0][1].trim() : null;

    if (!detectedName) {
      const fallbackMatch = text.match(/([A-ZÄÖÜ][a-zäöüß]+)\s+([A-ZÄÖÜ][a-zäöüß]+)/);
      if (fallbackMatch) {
        detectedName = `${fallbackMatch[1]} ${fallbackMatch[2]}`.trim();
      }
    }

    if (!detectedName) return null;

    const normalizedLeadName = (parsedLeadContext?.name || "").toLowerCase();
    if (normalizedLeadName && detectedName.toLowerCase().includes(normalizedLeadName)) {
      return null;
    }

    const lower = text.toLowerCase();
    let inferredContext = null;
    if (lower.includes("einkauf")) inferredContext = "Einkauf";
    else if (lower.includes("it-leiter") || lower.includes("it leiter")) inferredContext = "IT-Leitung";
    else if (lower.includes("geschäftsführung") || lower.includes("geschaeftsfuehrung")) inferredContext = "Geschäftsführung";

    return {
      name: detectedName,
      company: parsedLeadContext?.company,
      context: inferredContext,
    };
  };

  const detectMeetingPrep = (text) => {
    if (!text) return null;
    const patterns = [
      /bereite mich auf gespr\u00e4ch mit\s+(.+)/i,
      /meeting prep f\u00fcr\s+(.+)/i,
      /gespr\u00e4chsvorbereitung\s+(.+)/i,
      /was wei\u00df ich \u00fcber\s+(.+)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].replace(/[?.!]+$/, "").trim();
      }
    }
    return null;
  };

  const handleOpenSendModal = (messageText, lead) => {
    setSendModal({ open: true, message: messageText, lead });
  };

  const detectListInput = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 3) return false;

    let nameCount = 0;
    for (const line of lines.slice(0, 10)) {
      const cleaned = line.replace(/^[\d\.\-\*\u2022]\s*/, '').trim();
      if (cleaned && cleaned.split(' ').length <= 5 && /^[A-ZÄÖÜ]/.test(cleaned)) {
        nameCount++;
      }
    }

    return nameCount >= lines.length * 0.5;
  };

  const resetListDetection = () => {
    setListDetected(false);
    setParsedContacts([]);
    setSelectedForImport([]);
    setListError(null);
    lastParsedListRef.current = "";
  };

  const parseContactList = async (text) => {
    setIsParsingList(true);
    setListError(null);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/smart-import/parse-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      // Ignoriere Auth-Fehler und andere API-Fehler stillschweigend
      if (!response.ok) {
        // 401/403 = Auth-Fehler, 404 = Endpoint nicht gefunden, 500 = Server-Fehler
        // Alle nicht kritisch - Chat funktioniert trotzdem
        console.log(`Smart import endpoint not available (${response.status}) - continuing without list parsing`);
        resetListDetection();
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.contacts)) {
        setParsedContacts(data.contacts);
        setSelectedForImport(data.contacts.map((_, idx) => idx));
        setListDetected(true);
        lastParsedListRef.current = text.trim();
      } else {
        // Keine Liste erkannt - nicht kritisch, einfach zurücksetzen
        resetListDetection();
      }
    } catch (error) {
      // Fehler stillschweigend ignorieren - Chat funktioniert trotzdem
      console.log("Smart import not available - continuing without list parsing:", error.message);
      resetListDetection();
    } finally {
      setIsParsingList(false);
    }
  };

  // Debounced effect for list detection (prevents lag while typing)
  useEffect(() => {
    const trimmed = localInput.trim();
    if (!trimmed) {
      resetListDetection();
      return;
    }

    const timeoutId = setTimeout(() => {
      const looksLikeList = detectListInput(trimmed);
      if (!looksLikeList) {
        resetListDetection();
        return;
      }

      // Vermeide erneute Analyse derselben Liste
      if (lastParsedListRef.current === trimmed || isParsingList) return;
      parseContactList(trimmed);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [localInput]);

  // Debounced effect for live mode detection
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const liveKeywords = ['bin beim kunden', 'bin im gespräch', 'bin gerade bei', 'live call', 'im meeting', 'kunde fragt'];
      const normalized = (localInput || '').toLowerCase();
      const isLive = liveKeywords.some((kw) => normalized.includes(kw));
      setIsLiveMode(isLive);
    }, 200); // 200ms debounce

    return () => clearTimeout(timeoutId);
  }, [localInput]);

  // Sync localInput to input when needed (for voice, etc.)
  useEffect(() => {
    setLocalInput(input);
  }, [input]);

  const handleSendMessage = async (event, customMessage = null) => {
    if (event) {
      event.preventDefault();
    }

    // Use localInput for sending, then sync to input
    const messageText = customMessage || localInput.trim();
    if (!messageText) return;

    // Check if onboarding mode is active
    if (onboardingMode) {
      handleOnboardingResponse(messageText);
      setInput("");
      setLocalInput("");
      return;
    }

    // Detect meeting prep intent
    const meetingTarget = detectMeetingPrep(messageText);
    if (meetingTarget) {
      setIsPreparingMeeting(true);
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/api/meeting-prep`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: meetingTarget }),
        });
        const data = await response.json();
        if (data?.success) {
          setMeetingPrep(data);
          setInput("");
          setLocalInput("");
          setMessages((prev) => [
            ...prev,
            {
              id: `prep-${Date.now()}`,
              role: "assistant",
              content: `🗂️ Gesprächsvorbereitung für **${meetingTarget}** erstellt.`,
            },
          ]);
          setIsPreparingMeeting(false);
          return;
        }
      } catch (err) {
        console.error("Meeting prep failed:", err);
      } finally {
        setIsPreparingMeeting(false);
      }
      // On failure, continue with normal flow
    }

    // Check if should analyze
    const analysisType = shouldAnalyze(messageText);
    if (analysisType) {
      const result = await analyzeText(messageText);
      if (result) {
        setInput('');
        setLocalInput('');
        return; // Don't send as chat, show analysis card instead
      }
    }

    // ... rest of existing chat logic
    const humanMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, humanMessage]);
    setInput("");
    setLocalInput("");
    setIsLoading(true);

    try {
      // Baue History für Backend (nur content und role)
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const token = localStorage.getItem("access_token");
      console.log("Token exists:", !!token);
      console.log("Token value:", token ? `${token.substring(0, 20)}...` : "missing");
      const leadIdForLive =
        parsedLeadContext?.id ||
        parsedLeadContext?.lead_id ||
        parsedLeadContext?.leadId ||
        null;
      const isLiveRequest = isLiveMode;

      const response = await fetch(
        isLiveRequest
          ? `${API_BASE_URL}/api/copilot/live-assist`
          : `${API_BASE_URL}/api/ai/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(
            isLiveRequest
              ? {
                  text: messageText,
                  lead_id: leadIdForLive,
                }
              : {
                  message: messageText,
                  include_context: true,
                  conversation_history: messages.slice(-10).map(m => ({
                    role: m.role,
                    content: m.content
                  })),
                  lead_id: parsedLeadContext?.id,
                }
          ),
        }
      );

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data);
      console.log("Tool results:", data?.tool_results);

      if (!isLiveRequest && data?.session_id) {
        setSessionId(data.session_id);
      }

      const reply = isLiveRequest
        ? data?.assistance || data?.reply
        : data?.message || data?.reply || data?.response;
      if (!reply) {
        throw new Error("No reply from backend");
      }
      const intentDetected = data?.intent_detected || data?.detected_intent || null;
      const intentDescription = data?.intent_description || data?.intent || null;

      // Deep link extrahieren - mehrere mögliche Strukturen prüfen
      let deepLink = null;
      let messageLeadId = null;
      let messageChannel = null;

      // Variante 1: tool_results Array
      if (Array.isArray(data?.tool_results)) {
        const prepareResult = data.tool_results.find((t) => t?.name === "prepare_message");
        if (prepareResult?.result) {
          if (prepareResult.result.deep_link) {
            deepLink = prepareResult.result.deep_link;
          }
          // Channel und Lead-ID aus prepare_message Result extrahieren
          if (prepareResult.result.channel) {
            messageChannel = prepareResult.result.channel;
          }
          if (prepareResult.result.lead_id) {
            messageLeadId = prepareResult.result.lead_id;
          }
        }
      }

      // Variante 2: Direkt in der Response
      if (!deepLink && data?.deep_link) {
        deepLink = data.deep_link;
      }

      // Variante 3: Im message String nach mailto: oder wa.me suchen
      if (!deepLink && typeof reply === "string") {
        const mailtoMatch = reply.match(/mailto:[^\s\)]+/);
        const waMatch = reply.match(/https:\/\/wa\.me\/[^\s\)]+/);
        const instaMatch = reply.match(/https:\/\/instagram\.com\/[^\s\)]+/);
        if (mailtoMatch) {
          deepLink = mailtoMatch[0];
          if (!messageChannel) messageChannel = "email";
        } else if (waMatch) {
          deepLink = waMatch[0];
          if (!messageChannel) messageChannel = "whatsapp";
        } else if (instaMatch) {
          deepLink = instaMatch[0];
          if (!messageChannel) messageChannel = "instagram";
        }
      }

      // Lead-ID extrahieren (aus parsedLeadContext oder prepare_message Result)
      messageLeadId = 
        parsedLeadContext?.id || 
        parsedLeadContext?.lead_id || 
        parsedLeadContext?.leadId ||
        null;

      // Channel aus deep_link ableiten falls noch nicht vorhanden
      if (!messageChannel && deepLink) {
        if (deepLink.startsWith("mailto:")) {
          messageChannel = "email";
        } else if (deepLink.includes("wa.me")) {
          messageChannel = "whatsapp";
        } else if (deepLink.includes("instagram.com")) {
          messageChannel = "instagram";
        } else if (deepLink.includes("linkedin.com")) {
          messageChannel = "linkedin";
        } else {
          messageChannel = "instagram"; // Default
        }
      }

      const userAskedToCreate =
        intentDetected === "CREATE_LEAD" ||
        intentDetected === "CREATE_FOLLOWUP" ||
        /anlegen|erstellen|follow-?up/i.test(messageText || "");

      // Stakeholder-Erkennung temporär deaktiviert, um falsche Dialoge zu verhindern
      // if (ENABLE_STAKEHOLDER_DETECTION && userAskedToCreate) {
      //   const stakeholderDetection = detectNewStakeholder(reply);
      //   if (stakeholderDetection?.name) {
      //     const normalizedName = stakeholderDetection.name.toLowerCase();
      //     if (!lastStakeholderName || lastStakeholderName !== normalizedName) {
      //       setLastStakeholderName(normalizedName);
      //       setStakeholderCandidate({
      //         name: stakeholderDetection.name,
      //         company: stakeholderDetection.company || parsedLeadContext?.company || "",
      //         context: stakeholderDetection.context,
      //         leadId:
      //           parsedLeadContext?.id ||
      //           parsedLeadContext?.lead_id ||
      //           parsedLeadContext?.leadId ||
      //           null,
      //       });
      //     }
      //   }
      // }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: reply,
          intentDetected,
          intentDescription,
          deep_link: deepLink,
          lead_id: messageLeadId,
          channel: messageChannel,
        },
      ]);

      // Auto-Speak AI response if enabled
      if (autoSpeak && isTTSSupported) {
        speak(reply);
      }
    } catch (error) {
      console.error("Fehler beim Abrufen der AI-Antwort", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Ups, da ist was schiefgelaufen. Bitte prüfe, ob du eingeloggt bist und das Backend erreichbar ist.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  const handleQuickAction = (action) => {
    handleSendMessage(null, action);
  };

  // ============================================================================
  // ONBOARDING FUNCTIONS
  // ============================================================================

  const checkOnboardingStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/chief/onboarding-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (!data.onboarding_completed || data.missing_fields.length > 0) {
          setOnboardingMode(true);
          // CHIEF startet automatisch Onboarding
          addChiefMessage(getOnboardingGreeting());
        }
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  };

  const getOnboardingGreeting = () => {
    return `Hey! 👋 Ich bin CHIEF, dein persönlicher AI Sales Coach.

Bevor wir loslegen, lass mich dich kurz kennenlernen - das dauert nur 30 Sekunden!

**Wie heißt du?**`;
  };

  const addChiefMessage = (content) => {
    const messageId = `chief-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        role: "assistant",
        content: content,
      },
    ]);
  };

  const handleOnboardingResponse = async (userMessage) => {
    const step = onboardingStep;

    if (step === 0) {
      // Name speichern
      await updateOnboarding({ name: userMessage });
      setOnboardingStep(1);
      addChiefMessage(`Freut mich, ${userMessage}! 🎉

Bei welcher **Company** bist du? (z.B. Zinzino, PM-International, Herbalife...)`);

    } else if (step === 1) {
      // Company speichern
      await updateOnboarding({ company: userMessage, vertical_id: 'mlm' });
      setOnboardingStep(2);
      addChiefMessage(`${userMessage} - nice! 💪

Was ist dein **größtes Ziel** gerade?
(z.B. "Mehr Leads", "Team aufbauen", "Rank aufsteigen"...)`);

    } else if (step === 2) {
      // Goal speichern & Onboarding abschließen
      await updateOnboarding({
        goal: userMessage,
        onboarding_completed: true
      });
      setOnboardingMode(false);
      addChiefMessage(`Perfekt! Ich hab alles gespeichert. 🚀

Du bist ready! Hier ein paar Tipps:

- **Command Center** → Arbeite deine Leads ab
- **Screenshot hochladen** → Ich lese WhatsApp/Insta Chats
- **Frag mich alles** → Ich helfe bei Einwänden, Follow-ups, Strategien

Was möchtest du als erstes tun?`);
    }
  };

  const updateOnboarding = async (data) => {
    const token = localStorage.getItem('access_token');
    await fetch(`${API_BASE_URL}/api/chief/onboarding-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  };

  // Entfernt lange Deep-Link-Fragmente aus der Nachricht, wenn ein Deep Link separat vorliegt
  const cleanMessageContent = (content, hasDeepLink) => {
    if (!content || !hasDeepLink) return content;

    let cleaned = content
      .replace(/\[.*?\]\(mailto:[^\)]+\)/g, "") // [text](mailto:...)
      .replace(/\[.*?\]\(https:\/\/wa\.me[^\)]+\)/g, "") // [text](wa.me...)
      .replace(/\[.*?\]\(https:\/\/instagram\.com[^\)]+\)/g, "") // [text](instagram...)
      .replace(/\[.*?\]\(https:\/\/linkedin\.com[^\)]+\)/g, "") // [text](linkedin...)
      .replace(/mailto:[^\s\)]+/g, "") // Rohe mailto: Links
      .replace(/https:\/\/wa\.me\/[^\s\)]+/g, "") // Rohe wa.me Links
      .replace(/👆 Klicke auf \*\*Senden\*\* um .* zu öffnen\./g, "") // Anweisung entfernen
      .replace(/👉 Klicke \[hier[^\n]+/g, "") // "Klicke hier" Zeile entfernen
      .replace(/und die Email zu öffnen!/g, "") // Rest entfernen
      .replace(/\n{3,}/g, "\n\n") // Mehrfache Leerzeilen reduzieren
      .trim();

    return cleaned;
  };

  // Markdown-Links zu klickbaren Links konvertieren
  const renderMessageWithLinks = (content) => {
    if (!content || typeof content !== "string") return content;

    const parts = [];
    let lastIndex = 0;

    // Regex für Markdown Links: [text](url)
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Text vor dem Link hinzufügen
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Link hinzufügen
      const linkText = match[1];
      const url = match[2];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline"
          onClick={(e) => {
            e.preventDefault();
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        >
          {linkText}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Rest des Textes nach dem letzten Link
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : content;
  };

  // Image upload handler - unterstützt jetzt mehrere Bilder
  // WICHTIG: Mit useCallback wrappen, damit es in useEffect verwendet werden kann
  const handleImageUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files || files.length === 0) return;

    const isMultiImage = files.length > 1;

    // Preview: Zeige erstes Bild (oder mehrere wenn Multi-Mode)
    if (files.length === 1) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target.result);
      reader.readAsDataURL(files[0]);
    } else {
      // Bei mehreren Bildern: Zeige Info
      setUploadedImage(`📸 ${files.length} Bilder ausgewählt`);
    }

    // Analyze
    setIsAnalyzingScreenshot(true);
    const formData = new FormData();

    try {
      const token = localStorage.getItem('access_token');
      
      // Wähle Endpoint basierend auf Anzahl der Bilder
      const endpoint = isMultiImage 
        ? `${API_BASE_URL}/api/vision/analyze-screenshots`
        : `${API_BASE_URL}/api/vision/analyze-screenshot`;
      
      // Dateien hinzufügen - FastAPI erwartet unterschiedliche Parameter-Namen
      if (isMultiImage) {
        // Multi-Image: Alle Dateien mit 'files' (FastAPI List[UploadFile])
        files.forEach((file) => {
          formData.append('files', file);
        });
      } else {
        // Single-Image: Einzelne Datei mit 'file'
        formData.append('file', files[0]);
      }
      
      console.log(`[Vision] ${isMultiImage ? 'Multi' : 'Single'}-image mode: ${files.length} file(s)`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      // Console Logging für Debugging
      console.log('[Vision] API Response:', data);
      console.log('[Vision] Success:', data.success);
      
      if (isMultiImage) {
        // Multi-Image Response verarbeiten
        console.log('[Vision] Processing multi-image response:', data.total_images, 'images,', data.total_contacts, 'contacts');
        
        if (data.success && data.contacts && data.contacts.length > 0) {
          const contactsList = data.contacts || [];
          const totalFound = data.total_contacts || contactsList.length;
          
          // Formatierung für die Nachricht
          let contactsText = `📸 **${totalFound} Kontakt${totalFound > 1 ? 'e' : ''} aus ${data.total_images} Bild${data.total_images > 1 ? 'ern' : ''} erkannt!**\n\n`;
          
          contactsList.forEach((contact, index) => {
            contactsText += `**${index + 1}. ${contact.name || contact.first_name || 'Unbekannt'}**\n`;
            if (contact.platform) contactsText += `   Platform: ${contact.platform}\n`;
            if (contact.phone) contactsText += `   📱 ${contact.phone}\n`;
            if (contact.email) contactsText += `   📧 ${contact.email}\n`;
            if (contact.instagram) contactsText += `   📷 @${contact.instagram}\n`;
            if (contact.title || contact.position) contactsText += `   💼 ${contact.title || contact.position}\n`;
            if (contact.bio || contact.notes) contactsText += `   💬 ${(contact.bio || contact.notes || '').substring(0, 100)}${(contact.bio || contact.notes || '').length > 100 ? '...' : ''}\n`;
            contactsText += '\n';
          });
          
          // Zeige Details pro Bild
          if (data.results_per_image && data.results_per_image.length > 0) {
            contactsText += `\n**Details pro Bild:**\n`;
            data.results_per_image.forEach((result, idx) => {
              const status = result.success ? '✅' : '❌';
              contactsText += `${status} Bild ${result.image_index}: ${result.contacts_found || 0} Kontakt${result.contacts_found !== 1 ? 'e' : ''}${result.filename ? ` (${result.filename})` : ''}\n`;
            });
          }
          
          // Zeige Fehler falls vorhanden
          if (data.errors && data.errors.length > 0) {
            contactsText += `\n**Warnungen:**\n`;
            data.errors.forEach((error) => {
              contactsText += `⚠️ ${error}\n`;
            });
          }
          
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-vision-multi-${Date.now()}`,
              role: 'assistant',
              content: contactsText,
              extractedContacts: contactsList
            }
          ]);
          
          // Setze den ersten Kontakt als extractedContact für Kompatibilität
          if (contactsList.length > 0) {
            setExtractedContact(contactsList[0]);
          }
        } else {
          // Keine Kontakte gefunden
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-vision-multi-error-${Date.now()}`,
              role: 'assistant',
              content: `❌ Keine Kontakte in den ${data.total_images} Bildern gefunden. Bitte versuche es mit klareren Screenshots.`
            }
          ]);
        }
      } else {
        // Single-Image Response (bestehender Code)
        console.log('[Vision] Has contact:', !!data.contact);
        console.log('[Vision] Has contacts:', !!data.contacts);
        console.log('[Vision] Is bulk list:', data.is_bulk_list);
        console.log('[Vision] Total found:', data.total_found);

        if (data.success && data.contact) {
          // Einzelner Kontakt
          console.log('[Vision] Processing single contact:', data.contact);
          setExtractedContact(data.contact);
          // Add AI message with extracted info
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-vision-${Date.now()}`,
              role: 'assistant',
              content: `📸 Kontakt erkannt!\n\n**${data.contact.name || 'Unbekannt'}**\n${data.contact.platform ? `Platform: ${data.contact.platform}` : ''}\n${data.contact.phone ? `📱 ${data.contact.phone}` : ''}\n${data.contact.email ? `📧 ${data.contact.email}` : ''}\n${data.contact.instagram ? `📷 @${data.contact.instagram}` : ''}\n${data.contact.notes ? `\n💬 ${data.contact.notes}` : ''}`,
              extractedContact: data.contact
            }
          ]);
        } else if (data.success && data.contacts && data.is_bulk_list) {
          // Bulk-Liste mit mehreren Kontakten
          console.log('[Vision] Processing bulk contacts:', data.contacts.length, 'contacts');
          const contactsList = data.contacts || [];
          const totalFound = data.total_found || contactsList.length;
          
          // Formatierung für die Nachricht
          let contactsText = `📸 **${totalFound} Kontakt${totalFound > 1 ? 'e' : ''} erkannt!**\n\n`;
          contactsList.forEach((contact, index) => {
            contactsText += `**${index + 1}. ${contact.name || contact.first_name || 'Unbekannt'}**\n`;
            if (contact.platform) contactsText += `   Platform: ${contact.platform}\n`;
            if (contact.phone) contactsText += `   📱 ${contact.phone}\n`;
            if (contact.email) contactsText += `   📧 ${contact.email}\n`;
            if (contact.instagram) contactsText += `   📷 @${contact.instagram}\n`;
            if (contact.title || contact.position) contactsText += `   💼 ${contact.title || contact.position}\n`;
            if (contact.bio || contact.notes) contactsText += `   💬 ${(contact.bio || contact.notes || '').substring(0, 100)}${(contact.bio || contact.notes || '').length > 100 ? '...' : ''}\n`;
            contactsText += '\n';
          });
          
          if (data.scroll_hint) {
            contactsText += `\n${data.scroll_hint}\n`;
          }
          
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-vision-bulk-${Date.now()}`,
              role: 'assistant',
              content: contactsText,
              extractedContacts: contactsList
            }
          ]);
          
          // Setze den ersten Kontakt als extractedContact für Kompatibilität
          if (contactsList.length > 0) {
            setExtractedContact(contactsList[0]);
          }
        } else {
          // Fehler oder keine Kontakte gefunden
          console.log('[Vision] No contacts found or error:', data.error || 'Unknown error');
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-vision-error-${Date.now()}`,
              role: 'assistant',
              content: data.error ? `❌ ${data.error}` : '❌ Konnte keine Kontaktdaten im Screenshot finden. Bitte versuche ein deutlicheres Bild.'
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Screenshot analysis failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-vision-error-${Date.now()}`,
          role: 'assistant',
          content: `❌ Fehler beim Analysieren des ${isMultiImage ? 'Screenshots' : 'Screenshots'}. Bitte versuche es erneut.`
        }
      ]);
    } finally {
      setIsAnalyzingScreenshot(false);
      setUploadedImage(null);
      // Reset file input
      if (event?.target?.value !== undefined) {
        event.target.value = '';
      }
    }
  }, [setMessages, setExtractedContact, setIsAnalyzingScreenshot, setUploadedImage]); // Dependencies für useCallback

  // Clipboard Paste Support für Screenshots (Strg+V / Cmd+V)
  // MUSS NACH handleImageUpload stehen, da es diese Funktion verwendet
  useEffect(() => {
    const handlePaste = async (e) => {
      // Nur verarbeiten, wenn nicht in einem Input/Textarea
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Erlaube normales Paste-Verhalten in Input-Feldern
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      // Suche nach Bildern in der Zwischenablage
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          
          const file = item.getAsFile();
          if (file) {
            // Zeige Toast-Feedback
            toast.success('📋 Bild aus Zwischenablage eingefügt', {
              icon: '📋',
              duration: 2000,
            });

            // Erstelle ein fake Event-Objekt für handleImageUpload
            const fakeEvent = {
              target: {
                files: [file]
              }
            };
            
            // Rufe handleImageUpload mit dem eingefügten Bild auf
            handleImageUpload(fakeEvent);
          }
          break;
        }
      }
    };

    // Event Listener hinzufügen
    document.addEventListener('paste', handlePaste);
    
    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handleImageUpload]); // handleImageUpload als Dependency

  // Onboarding check on mount
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Save lead handler for extracted contacts (screenshots)
  const handleSaveExtractedLead = async (contact) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...contact,
          status: 'new',
          temperature: 'warm'
        })
      });

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-lead-saved-${Date.now()}`,
            role: 'assistant',
            content: `✅ **${contact.name}** wurde als Lead gespeichert!`
          }
        ]);
        setExtractedContact(null);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Save lead failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-lead-error-${Date.now()}`,
          role: 'assistant',
          content: '❌ Fehler beim Speichern des Leads.'
        }
      ]);
    }
  };

  const handleStakeholderSaved = (contact) => {
    setStakeholderCandidate(null);
    if (contact?.name) {
      setMessages((prev) => [
        ...prev,
        {
          id: `stakeholder-saved-${Date.now()}`,
          role: "assistant",
          content: `✅ **${contact.name}** wurde als Stakeholder gespeichert.`,
        },
      ]);
    }
  };

  const toggleSelect = (index) => {
    setSelectedForImport((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleImportSelected = async () => {
    if (!selectedForImport.length || !parsedContacts.length) return;
    setIsImportingList(true);
    setListError(null);
    try {
      const token = localStorage.getItem("access_token");
      let successCount = 0;

      for (const idx of selectedForImport) {
        const contact = parsedContacts[idx];
        if (!contact) continue;

        const name =
          contact.name ||
          [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();

        const payload = {
          name: name || "Unbekannt",
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          position: contact.position,
          notes: contact.notes,
          temperature: contact.warm_score >= 60 ? "warm" : "cold",
          status: "new",
          source: "contact_list",
        };

        const response = await fetch(`${API_BASE_URL}/api/leads`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          successCount += 1;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `list-import-${Date.now()}`,
          role: "assistant",
          content: `📋 ${successCount}/${selectedForImport.length} Kontakte importiert.`,
        },
      ]);

      if (successCount > 0) {
        resetListDetection();
        setInput("");
        setLocalInput("");
      } else {
        // Keine Fehlermeldung mehr anzeigen - nur in Console loggen
        console.log("Keine Kontakte importiert - möglicherweise API-Fehler");
      }
    } catch (error) {
      // Fehler stillschweigend ignorieren - nur in Console loggen
      console.log("Import fehlgeschlagen (nicht kritisch):", error.message);
    } finally {
      setIsImportingList(false);
    }
  };

  // Copy to clipboard utility
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSaveContext = (event) => {
    event.preventDefault();
    setContextSaved(true);
    setTimeout(() => setContextSaved(false), 1800);
  };

  // New handlers for AnalysisCard
  const handleAnalysisSaveLead = async (analysis) => {
    try {
      const result = await saveLead(analysis);
      // Add success message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **${analysis.lead.name}** wurde als Lead gespeichert!\n\n📅 Follow-up in ${analysis.follow_up_days} Tagen eingestellt.`
      }]);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleMagicSend = async (platform, message, lead) => {
    try {
      await getMagicLink(platform, message, lead);
      // Optionally mark as contacted
    } catch (err) {
      console.error('Magic send failed:', err);
    }
  };

  const handleOpenLead = (leadId) => {
    window.location.href = `/leads/${leadId}`;
  };

  const handleImport = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const fileNames = fileList.map((file) => file.name).join(", ") || "Deine Dateien";

    setImportStatus(`${fileList.length} Datei(en) hinzugefügt · Analyse gestartet`);
    setMessages((prev) => [
      ...prev,
      {
        id: `import-${Date.now()}`,
        role: "user",
        content: `Import gestartet: ${fileNames}`,
      },
    ]);

    setTimeout(() => setImportStatus(null), 4000);
    event.target.value = "";
  };

  // ═══════════════════════════════════════════════════════════════
  // DEEP SCAN & LEAD ACTIONS
  // ═══════════════════════════════════════════════════════════════

  const handleDeepScan = async () => {
    let leadId = null;
    try {
      const parsed = JSON.parse(leadContext || "{}");
      leadId = parsed.id || parsed.lead_id;
    } catch (e) {}

    if (!leadId) {
      setScanError("Kein Lead mit ID gefunden. Speichere zuerst den Lead.");
      return;
    }

    setIsScanning(true);
    setLeadAnalysis(null);
    setScanError(null);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/lead-analysis/deep-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lead_id: leadId }),
      });

      const result = await response.json();

      if (result.success) {
        setLeadAnalysis(result);
        setContextPanel("intelligence"); // Wechsel zu Ergebnissen
        setMessages((prev) => [
          ...prev,
          {
            id: `scan-${Date.now()}`,
            role: "assistant",
            content: `🧠 **Deep Scan für ${result.name || 'Lead'}:** ${result.disc_profile?.primary_type || 'Analysiert'}. Closing: ${result.closing_probability || 50}%`,
          },
        ]);
      } else {
        setScanError(result.detail || "Analyse fehlgeschlagen");
      }
    } catch (error) {
      console.error("Deep scan failed:", error);
      setScanError("Verbindungsfehler");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveLead = async () => {
    if (!parsedLeadContext || hasLeadContextError) return;
    
    setSavingLead(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: parsedLeadContext.name || "Unbekannt",
          company: parsedLeadContext.company || "",
          status: parsedLeadContext.status || "new",
          notes: parsedLeadContext.notes || parsedLeadContext.next_step || "",
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.id) {
        // Update context with new ID
        const updatedContext = { ...parsedLeadContext, id: result.id, lead_id: result.id };
        setLeadContext(JSON.stringify(updatedContext, null, 2));
        
        setMessages((prev) => [...prev, {
          id: `save-${Date.now()}`,
          role: "assistant",
          content: `✅ Lead **${parsedLeadContext.name}** wurde gespeichert! Du kannst jetzt Deep Scan nutzen.`,
        }]);
      } else {
        throw new Error(result.detail || "Speichern fehlgeschlagen");
      }
    } catch (error) {
      console.error("Save failed:", error);
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant", 
        content: `❌ Fehler beim Speichern: ${error.message}`,
      }]);
    } finally {
      setSavingLead(false);
    }
  };

  const renderDISCBar = () => {
    if (!leadAnalysis?.disc_profile) return null;
    const { dominant, influential, steady, conscientious } = leadAnalysis.disc_profile;
    const total = dominant + influential + steady + conscientious || 100;
    
    return (
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-red-500" style={{ width: `${(dominant/total)*100}%` }} />
          <div className="h-full bg-yellow-500" style={{ width: `${(influential/total)*100}%` }} />
          <div className="h-full bg-green-500" style={{ width: `${(steady/total)*100}%` }} />
          <div className="h-full bg-blue-500" style={{ width: `${(conscientious/total)*100}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span className="text-red-400">D:{dominant}</span>
          <span className="text-yellow-400">I:{influential}</span>
          <span className="text-green-400">S:{steady}</span>
          <span className="text-blue-400">C:{conscientious}</span>
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 bg-slate-950">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-6 py-8">
        {/* HAUPTBEREICH - Chat */}
        <section className="flex flex-1 flex-col gap-4">
          {/* Header */}
          <header className="flex flex-col gap-3 border-b border-slate-800/80 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Al Sales Solutions Brain
              </p>
              <h1 className="text-2xl font-bold text-slate-50">
                Chat Assistent
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Dein KI-Copilot für Vertriebsstrategie, Einwände & Follow-ups
              </p>
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400"
              title="Live-Modus: Antworten basieren auf deinen echten CRM-Daten."
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span>LIVE</span>
            </div>
          </header>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="rounded-full border border-slate-800/80 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/40 hover:bg-slate-800/80 hover:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {action}
              </button>
            ))}
          </div>

          {isLiveMode && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-sm font-medium">Live-Modus aktiv</span>
              <span className="text-gray-400 text-xs">Schnelle, präzise Antworten</span>
            </div>
          )}

          {isParsingList && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-200 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Liste erkannt – KI extrahiert Kontakte...
            </div>
          )}

          {/* Fehlermeldungen für Smart Import werden nicht mehr angezeigt - Chat funktioniert trotzdem */}
          {/* {listError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-100">
              {listError}
            </div>
          )} */}

          {listDetected && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 mb-2">
                📋 Liste erkannt! {parsedContacts.length} Kontakte gefunden.
              </p>

              <div className="max-h-40 overflow-y-auto space-y-1 mb-4">
                {parsedContacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedForImport.includes(i)}
                      onChange={() => toggleSelect(i)}
                    />
                    <span>{c.name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "Ohne Namen"}</span>
                    {c.company && <span className="text-gray-500">({c.company})</span>}
                    <span
                      className={`ml-auto ${c.warm_score > 60 ? "text-green-400" : "text-gray-400"}`}
                    >
                      {(c.warm_score ?? 0)}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleImportSelected}
                  disabled={!selectedForImport.length || isImportingList}
                  className="px-4 py-2 bg-green-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImportingList
                    ? "Importiere..."
                    : `${selectedForImport.length} Kontakte importieren`}
                </button>
                <button
                  onClick={resetListDetection}
                  className="px-4 py-2 bg-gray-700 rounded-lg"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {showSuggestions && (
            <div data-tour="quick-actions" className="flex flex-wrap gap-2 mb-4">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  onClick={() => handleSendMessage(null, suggestion.label)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-100 rounded-full text-sm hover:bg-slate-700 transition"
                  type="button"
                  disabled={isLoading}
                >
                  {suggestion.icon} {suggestion.label}
                </button>
              ))}
            </div>
          )}

          {/* Chat-Nachrichten */}
          <div
            ref={messagesContainerRef}
            className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6"
            style={{ minHeight: "400px", maxHeight: "calc(100vh - 400px)" }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  "flex items-start gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {/* Avatar AI */}
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Bot className="h-5 w-5" />
                  </div>
                )}

                {/* Nachricht Bubble */}
                <div
                  className={clsx(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "border border-slate-800 bg-slate-900/80 text-slate-100"
                  )}
                >
                  {message.role === "assistant" && message.intentDetected && (
                    <span className="mb-2 inline-block rounded-full bg-purple-500/10 px-2 py-1 text-[11px] font-semibold text-purple-300">
                      🧠 {message.intentDescription || message.intentDetected}
                    </span>
                  )}
                  <div className="whitespace-pre-wrap break-words">
                    {renderMessageWithLinks(cleanMessageContent(message.content, message.deep_link))}
                  </div>
                  {message.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() => speak(message.content)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                      title="Vorlesen"
                    >
                      <Volume2 className="w-4 h-4" />
                      Vorlesen
                    </button>
                  )}
                  {message.role === "assistant" && (
                    <WhatsAppMessageActions
                      message={message.content}
                      leadPhone={parsedLeadContext?.phone}
                      leadName={parsedLeadContext?.name}
                    />
                  )}
                  {message.role === "assistant" && message.deep_link && (
                    <a
                      href={message.deep_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={async () => {
                        // Wenn lead_id vorhanden ist, Status auf "contacted" setzen
                        if (message.lead_id && message.channel) {
                          try {
                            const token = localStorage.getItem("access_token");
                            await fetch(`${API_BASE_URL}/api/leads/${message.lead_id}/message-sent`, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                message: message.content?.substring(0, 500) || "",
                                channel: message.channel,
                              }),
                            });
                            // Optional: Erfolgs-Feedback (nicht blockierend)
                            console.log("✅ Nachricht protokolliert, Status auf 'contacted' gesetzt");
                          } catch (error) {
                            // Fehler nicht anzeigen - Logging ist nicht kritisch
                            console.warn("Konnte Nachricht nicht protokollieren:", error);
                          }
                        }
                      }}
                      className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-emerald-500/25"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Jetzt senden
                    </a>
                  )}
                  {message.role === "assistant" && message.content?.length > 50 && (
                    <button
                      type="button"
                      onClick={() => handleOpenSendModal(message.content, currentLead)}
                      className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Send className="w-3 h-3" />
                      Senden
                    </button>
                  )}
                </div>

                {/* Avatar User */}
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}

            {meetingPrep && (
              <MeetingPrepCard
                prep={meetingPrep}
                onClose={() => setMeetingPrep(null)}
              />
            )}

            {isPreparingMeeting && (
              <div className="flex items-center gap-2 text-amber-300 text-sm px-4 py-2">
                <div className="animate-spin w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full" />
                Gesprächsvorbereitung läuft...
              </div>
            )}

            {/* Analysis Card */}
            {analysisResult && (
              <AnalysisCard
                analysis={analysisResult}
                onSaveLead={handleAnalysisSaveLead}
                onClose={clearAnalysis}
                onCopy={(text, field) => console.log('Copied:', field)}
                onMagicSend={handleMagicSend}
                onOpenLead={handleOpenLead}
              />
            )}

            {stakeholderCandidate && (
              <StakeholderCard
                name={stakeholderCandidate.name}
                company={stakeholderCandidate.company}
                context={stakeholderCandidate.context}
                leadId={stakeholderCandidate.leadId}
                onSaved={handleStakeholderSaved}
                onClose={() => {
                  setStakeholderCandidate(null);
                  setLastStakeholderName(null);
                }}
              />
            )}

            {/* Extracted Contact Card */}
            {extractedContact && (
              <div className="my-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <h4 className="mb-3 font-semibold text-emerald-400">📸 Kontakt erkannt</h4>
                <div className="space-y-2 text-sm">
                  {extractedContact.name && <p><strong>Name:</strong> {extractedContact.name}</p>}
                  {extractedContact.phone && <p><strong>Telefon:</strong> {extractedContact.phone}</p>}
                  {extractedContact.email && <p><strong>Email:</strong> {extractedContact.email}</p>}
                  {extractedContact.instagram && <p><strong>Instagram:</strong> @{extractedContact.instagram}</p>}
                  {extractedContact.company && <p><strong>Firma:</strong> {extractedContact.company}</p>}
                  {extractedContact.platform && <p><strong>Platform:</strong> {extractedContact.platform}</p>}
                  {extractedContact.confidence && (
                    <p><strong>Konfidenz:</strong> {Math.round(extractedContact.confidence * 100)}%</p>
                  )}
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => handleSaveExtractedLead(extractedContact)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                  >
                    ✓ Als Lead speichern
                  </button>
                  <button
                    onClick={() => setExtractedContact(null)}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-600 transition-colors"
                  >
                    ✗ Verwerfen
                  </button>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Tippt...</span>
                </div>
              </div>
            )}

            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bereich */}
          <form onSubmit={handleSendMessage} className="space-y-3">
          <div data-tour="chat-input" className="rounded-2xl border border-slate-800 bg-slate-900/60">
              <textarea
                value={localInput}
                onChange={(event) => setLocalInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage(event);
                  }
                }}
                rows={3}
                disabled={isLoading}
                placeholder="Frag nach einem Follow-up, einer Sequenz oder Einwandbehandlung..."
                className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-50"
              />
              <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  {/* Image Upload Button - Multi-Screenshot Support */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing || isAnalyzingScreenshot}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Screenshot analysieren (Mehrere Bilder möglich: Strg+Klick oder Cmd+Klick)"
                  >
                    {isAnalyzingScreenshot ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <span>Screenshot{isAnalyzingScreenshot ? '...' : ''}</span>
                  </button>
                  
                  {/* Voice Input Button */}
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={clsx(
                        "inline-flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200",
                        isListening
                          ? "bg-red-500 text-white animate-pulse glow-cyan"
                          : "border border-slate-800 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400"
                      )}
                      title={isListening ? "Aufnahme stoppen" : "Spracheingabe starten"}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                  
                  {/* Auto-Speak Toggle */}
                  {isTTSSupported && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isSpeaking) {
                          stopSpeaking();
                        }
                        setAutoSpeak(!autoSpeak);
                      }}
                      className={clsx(
                        "inline-flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200",
                        autoSpeak
                          ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-400"
                          : "border border-slate-800 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400"
                      )}
                      title={autoSpeak ? "Sprachausgabe deaktivieren" : "Sprachausgabe aktivieren"}
                    >
                      {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <VoiceRecorder
                    analyzeAfter={true}
                    onAnalysis={(analysis, text) => {
                      if (text) {
                        setInput(text);
                        setLocalInput(text);
                      }
                      if (analysis?.result) {
                        setAnalysisResult(analysis.result);
                      }
                    }}
                    onTranscription={(text) => {
                      if (text) {
                        setInput(text);
                        setLocalInput(text);
                      }
                    }}
                    onCommandExecuted={(data) => {
                      if (data?.message) {
                        setMessages(prev => [...prev, { id: `voice-cmd-${Date.now()}`, role: "assistant", content: data.message }]);
                      }
                    }}
                    onMeetingPrep={(leadName) => {
                      if (leadName) {
                        handleSendMessage(null, `Gesprächsvorbereitung ${leadName}`);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || isAnalyzing || isPreparingMeeting || !localInput.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPreparingMeeting ? "Bereite vor..." : isAnalyzing ? "Analysiere..." : isLoading ? "Verarbeite..." : "Senden"}
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Voice Status Indicator */}
              {(isListening || interimTranscript) && (
                <div className="px-4 py-2 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400">
                      {interimTranscript || "Höre zu..."}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Tipp: Enter zum Senden, Shift+Enter für neue Zeile
            </p>
          </form>
        </section>

        {/* SIDEBAR - Kontext (hidden) */}
        {false && (
        <aside className="w-full lg:w-96 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Kontext
                </p>
                <h2 className="text-lg font-semibold text-slate-50">
                  {contextPanel === "lead"
                    ? "Lead-Kontext"
                    : "Lead Intelligence"}
                </h2>
              </div>
              <div className="inline-flex gap-2 rounded-full bg-slate-900/60 p-1 text-xs font-semibold text-slate-400">
                {["lead", "intelligence"].map((panel) => (
                  <button
                    key={panel}
                    type="button"
                    onClick={() => setContextPanel(panel)}
                    className={clsx(
                      "rounded-full px-3 py-1 transition",
                      contextPanel === panel
                        ? "bg-emerald-500 text-slate-950"
                        : "text-slate-400 hover:text-slate-100"
                    )}
                  >
                    {panel === "lead" ? "Lead" : "🧠 Scan"}
                  </button>
                ))}
              </div>
            </div>

            {contextPanel === "lead" ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Kontext für deinen Copilot. Name, Firma, Status & letzte Aktion.
                </p>
                <LeadContextSummary
                  entries={leadContextEntries}
                  hasError={hasLeadContextError}
                  onEdit={() => setIsEditingLeadContext(true)}
                />

                {isEditingLeadContext ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      handleSaveContext(event);
                      setIsEditingLeadContext(false);
                    }}
                  >
                    <textarea
                      value={leadContext}
                      onChange={(event) => setLeadContext(event.target.value)}
                      className="h-48 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-4 font-mono text-xs text-emerald-200 outline-none"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30"
                      >
                        Speichern
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingLeadContext(false)}
                        className="flex-1 rounded-xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingLeadContext(true)}
                    className="w-full rounded-xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white"
                  >
                    Lead-Kontext bearbeiten
                  </button>
                )}

                {/* ═══ QUICK ACTIONS ═══ */}
                {parsedLeadContext && !hasLeadContextError && (
                  <div className="pt-4 mt-4 border-t border-slate-800 space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Aktionen
                    </p>
                    
                    {/* Save Lead Button - Prominent wenn keine ID */}
                    {!parsedLeadContext.id && !parsedLeadContext.lead_id && (
                      <button
                        onClick={handleSaveLead}
                        disabled={savingLead}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                      >
                        {savingLead ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Speichere...</>
                        ) : (
                          <><Save className="w-4 h-4" /> Lead speichern</>
                        )}
                      </button>
                    )}
                    
                    {/* Action Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleDeepScan}
                        disabled={isScanning || (!parsedLeadContext.id && !parsedLeadContext.lead_id)}
                        className={clsx(
                          "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all",
                          parsedLeadContext.id || parsedLeadContext.lead_id
                            ? "bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30"
                            : "bg-slate-800/50 border border-slate-700/50 text-slate-500 cursor-not-allowed"
                        )}
                      >
                        <Zap className={clsx("w-3 h-3", isScanning && "animate-spin")} />
                        {isScanning ? "Scannt..." : "Deep Scan"}
                      </button>
                      
                      <button
                        onClick={() => {
                          const text = `Schreibe ein Follow-up für ${parsedLeadContext.name}`;
                          setInput(text);
                          setLocalInput(text);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        Follow-up
                      </button>
                      
                      <button
                        onClick={() => {
                          const text = `Wie behandle ich Einwände bei ${parsedLeadContext.name}?`;
                          setInput(text);
                          setLocalInput(text);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                      >
                        <Shield className="w-3 h-3" />
                        Einwände
                      </button>
                      
                      <button
                        onClick={() => {
                          const text = `Gib mir eine Abschluss-Strategie für ${parsedLeadContext.name}`;
                          setInput(text);
                          setLocalInput(text);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                      >
                        <TrendingUp className="w-3 h-3" />
                        Strategie
                      </button>
                    </div>
                    
                    {/* Hint wenn kein Lead gespeichert */}
                    {!parsedLeadContext.id && !parsedLeadContext.lead_id && (
                      <p className="text-[10px] text-slate-500 text-center">
                        💡 Speichere den Lead um Deep Scan zu nutzen
                      </p>
                    )}
                  </div>
                )}

                {contextSaved && (
                  <p className="text-center text-xs text-emerald-200">
                    ✓ Kontext gespeichert
                  </p>
                )}
              </div>
            ) : (
              /* ═══ INTELLIGENCE PANEL (ersetzt Import) ═══ */
              <div className="space-y-4">
                
                {/* Header mit Scan Button */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    KI-Analyse des aktuellen Leads
                  </p>
                  <button
                    onClick={handleDeepScan}
                    disabled={isScanning}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      isScanning
                        ? "bg-violet-600/50 text-violet-300"
                        : "bg-violet-600 hover:bg-violet-500 text-white"
                    )}
                  >
                    <Zap className={clsx("w-3 h-3", isScanning && "animate-spin")} />
                    {isScanning ? "..." : "Neu scannen"}
                  </button>
                </div>

                {/* Error */}
                {scanError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                    {scanError}
                  </div>
                )}

                {/* Results */}
                {leadAnalysis ? (
                  <div className="space-y-3">
                    
                    {/* Closing Score */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-sm text-slate-400">Closing-Chance</span>
                      <span className={clsx(
                        "text-xl font-bold",
                        leadAnalysis.closing_probability >= 70 ? "text-green-400" :
                        leadAnalysis.closing_probability >= 40 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {leadAnalysis.closing_probability}%
                      </span>
                    </div>

                    {/* DISC */}
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-slate-500">DISC-Profil</span>
                        <span className="text-xs font-semibold text-blue-400">
                          {leadAnalysis.disc_profile?.primary_type}
                        </span>
                      </div>
                      {renderDISCBar()}
                      <p className="text-xs text-slate-400 mt-2">
                        {leadAnalysis.disc_profile?.description}
                      </p>
                    </div>

                    {/* Do's */}
                    <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                      <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Do's
                      </h4>
                      <ul className="space-y-1">
                        {leadAnalysis.dos?.map((item, i) => (
                          <li key={i} className="text-xs text-slate-300">• {item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Don'ts */}
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                      <h4 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Don'ts
                      </h4>
                      <ul className="space-y-1">
                        {leadAnalysis.donts?.map((item, i) => (
                          <li key={i} className="text-xs text-slate-300">• {item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Strategie */}
                    {leadAnalysis.recommended_approach && (
                      <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                        <h4 className="text-xs font-bold text-violet-400 mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Empfehlung
                        </h4>
                        <p className="text-xs text-slate-200">
                          {leadAnalysis.recommended_approach}
                        </p>
                      </div>
                    )}

                  </div>
                ) : (
                  /* Empty State */
                  <div className="text-center py-8">
                    <Target className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">
                      Noch kein Scan durchgeführt
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Wähle einen Lead und starte Deep Scan
                    </p>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold">Al Sales Solutions Brain</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ich helfe dir bei Lead-Analyse, Follow-up-Sequenzen, Einwandbehandlung
              und Abschluss-Strategien. Frag mich einfach!
            </p>
          </div>
        </aside>
        )}
      </div>

      <SendMessageModal
        isOpen={sendModal.open}
        onClose={() => setSendModal({ open: false, message: "", lead: null })}
        message={sendModal.message}
        lead={sendModal.lead || currentLead}
      />
    </main>
  );
};

export default ChatPage;
