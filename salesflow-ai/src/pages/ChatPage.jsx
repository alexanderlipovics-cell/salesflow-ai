import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Bot, Loader2, Mic, MicOff, Paperclip, Send, Shield, Sparkles, Upload, User, Volume2, VolumeX, Camera } from "lucide-react";
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
      "Hey! 👋 Ich bin dein Sales Flow Copilot. Was können wir heute in deiner Pipeline bewegen?",
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
  // URL-Parameter für vorgefüllten Text (z.B. aus Follow-ups Seite)
  const [searchParams, setSearchParams] = useSearchParams();
  const promptParam = searchParams.get("prompt") ?? "";
  const [prefillApplied, setPrefillApplied] = useState(false);

  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
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
  const [, setUploadedImage] = useState(null);
  const [stakeholderCandidate, setStakeholderCandidate] = useState(null);
  const [lastStakeholderName, setLastStakeholderName] = useState(null);
  const [listDetected, setListDetected] = useState(false);
  const [parsedContacts, setParsedContacts] = useState([]);
  const [selectedForImport, setSelectedForImport] = useState([]);
  const [isParsingList, setIsParsingList] = useState(false);
  const [listError, setListError] = useState(null);
  const [isImportingList, setIsImportingList] = useState(false);
  const [sendModal, setSendModal] = useState({ open: false, message: "", lead: null });
  const [activeCompetitorCard, setActiveCompetitorCard] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [sessionId, setSessionId] = useState(null);

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
      setInput((prev) => prev + (prev ? ' ' : '') + text);
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
      setPrefillApplied(true);
      // URL-Parameter entfernen, um bei Refresh nicht erneut zu setzen
      setSearchParams({}, { replace: true });
    }
  }, [promptParam, prefillApplied, setSearchParams]);

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

      const data = await response.json();
      if (data.success && Array.isArray(data.contacts)) {
        setParsedContacts(data.contacts);
        setSelectedForImport(data.contacts.map((_, idx) => idx));
        setListDetected(true);
        lastParsedListRef.current = text.trim();
      } else {
        resetListDetection();
        setListError(data.error || "Konnte Liste nicht parsen.");
      }
    } catch (error) {
      console.error("List parse failed:", error);
      resetListDetection();
      setListError("Fehler beim Parsen der Liste.");
    } finally {
      setIsParsingList(false);
    }
  };

  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      resetListDetection();
      return;
    }

    const looksLikeList = detectListInput(trimmed);
    if (!looksLikeList) {
      resetListDetection();
      return;
    }

    // Vermeide erneute Analyse derselben Liste
    if (lastParsedListRef.current === trimmed || isParsingList) return;
    parseContactList(trimmed);
  }, [input]);

  useEffect(() => {
    const liveKeywords = ['bin beim kunden', 'bin im gespräch', 'bin gerade bei', 'live call', 'im meeting', 'kunde fragt'];
    const normalized = (input || '').toLowerCase();
    const isLive = liveKeywords.some((kw) => normalized.includes(kw));
    setIsLiveMode(isLive);
  }, [input]);

  const checkCompetitor = async (text) => {
    const normalized = (text || "").trim();
    if (!normalized) {
      setActiveCompetitorCard(null);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/competitors/match?text=${encodeURIComponent(normalized)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Match request failed: ${response.status}`);
      }

      const data = await response.json();
      if (data?.found) {
        setActiveCompetitorCard(data.card);
      } else {
        setActiveCompetitorCard(null);
      }
    } catch (error) {
      console.error("Competitor match failed:", error);
    }
  };

  const handleSendMessage = async (event, customMessage = null) => {
    if (event) {
      event.preventDefault();
    }

    const messageText = customMessage || input.trim();
    if (!messageText) return;

    setActiveCompetitorCard(null);

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

      const userAskedToCreate =
        intentDetected === "CREATE_LEAD" ||
        intentDetected === "CREATE_FOLLOWUP" ||
        /anlegen|erstellen|follow-?up/i.test(messageText || "");

      if (userAskedToCreate) {
        const stakeholderDetection = detectNewStakeholder(reply);
        if (stakeholderDetection?.name) {
          const normalizedName = stakeholderDetection.name.toLowerCase();
          if (!lastStakeholderName || lastStakeholderName !== normalizedName) {
            setLastStakeholderName(normalizedName);
            setStakeholderCandidate({
              name: stakeholderDetection.name,
              company: stakeholderDetection.company || parsedLeadContext?.company || "",
              context: stakeholderDetection.context,
              leadId:
                parsedLeadContext?.id ||
                parsedLeadContext?.lead_id ||
                parsedLeadContext?.leadId ||
                null,
            });
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: reply,
          intentDetected,
          intentDescription,
        },
      ]);

      checkCompetitor(`${messageText}\n${reply}`);

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

  // Image upload handler
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target.result);
    reader.readAsDataURL(file);

    // Analyze
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/vision/analyze-screenshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success && data.contact) {
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
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-vision-error-${Date.now()}`,
            role: 'assistant',
            content: '❌ Konnte keine Kontaktdaten im Screenshot finden. Bitte versuche ein deutlicheres Bild.'
          }
        ]);
      }
    } catch (error) {
      console.error('Screenshot analysis failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-vision-error-${Date.now()}`,
          role: 'assistant',
          content: '❌ Fehler beim Analysieren des Screenshots. Bitte versuche es erneut.'
        }
      ]);
    } finally {
      setIsAnalyzing(false);
      setUploadedImage(null);
    }
  };

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
      } else {
        setListError("Keine Kontakte importiert.");
      }
    } catch (error) {
      console.error("Import failed:", error);
      setListError("Fehler beim Importieren der Kontakte.");
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
  const handleSaveLead = async (analysis) => {
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

  return (
    <main className="flex-1 bg-slate-950">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row">
        {/* HAUPTBEREICH - Chat */}
        <section className="flex flex-1 flex-col gap-4">
          {/* Header */}
          <header className="flex flex-col gap-3 border-b border-slate-800/80 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Sales Flow Brain
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

          {listError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-100">
              {listError}
            </div>
          )}

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
                    {message.content}
                  </div>
                  {message.role === "assistant" && (
                    <WhatsAppMessageActions
                      message={message.content}
                      leadPhone={parsedLeadContext?.phone}
                      leadName={parsedLeadContext?.name}
                    />
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

            {/* Meeting Prep Card */}
            {activeCompetitorCard && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 my-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-orange-400" />
                  <span className="font-bold text-orange-400">
                    Battle Card: {activeCompetitorCard.competitor_name}
                  </span>
                </div>
                {activeCompetitorCard.quick_response && (
                  <p className="text-white font-medium mb-3">
                    "{activeCompetitorCard.quick_response}"
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase mb-2">Ihre Schwächen</p>
                    {activeCompetitorCard.weaknesses?.map((w, i) => (
                      <p key={i} className="text-sm text-gray-300">• {w.title}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase mb-2">Unsere Stärken</p>
                    {activeCompetitorCard.our_advantages?.map((a, i) => (
                      <p key={i} className="text-sm text-green-300">✓ {a.title}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
                onSaveLead={handleSaveLead}
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
                value={input}
                onChange={(event) => setInput(event.target.value)}
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
                  {/* Image Upload Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Screenshot analysieren"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <span>Screenshot</span>
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
                      }
                      if (analysis?.result) {
                        setAnalysisResult(analysis.result);
                      }
                    }}
                    onTranscription={(text) => {
                      if (text) {
                        setInput(text);
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
                    disabled={isLoading || isAnalyzing || isPreparingMeeting || !input.trim()}
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

        {/* SIDEBAR - Kontext */}
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
                    : "Bestandskunden importieren"}
                </h2>
              </div>
              <div className="inline-flex gap-2 rounded-full bg-slate-900/60 p-1 text-xs font-semibold text-slate-400">
                {["lead", "import"].map((panel) => (
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
                    {panel === "lead" ? "Lead" : "Import"}
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
                  hasError={!parsedLeadContext}
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

                {contextSaved && (
                  <p className="text-center text-xs text-emerald-200">
                    ✓ Kontext gespeichert
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Lade CSV-Listen hoch. Sales Flow AI segmentiert automatisch.
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/60 px-4 py-8 text-sm text-slate-300 hover:border-emerald-500/40">
                  <Upload className="h-8 w-8 text-slate-400" />
                  <span>CSV oder XLSX ablegen</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
                {importStatus && (
                  <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                    {importStatus}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold">Sales Flow Brain</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ich helfe dir bei Lead-Analyse, Follow-up-Sequenzen, Einwandbehandlung
              und Abschluss-Strategien. Frag mich einfach!
            </p>
          </div>
        </aside>
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
