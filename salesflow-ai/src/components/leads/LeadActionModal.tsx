import React, { useState, useEffect, useMemo } from "react";
import { X, Send, Copy, Check, MessageCircle, Mail, Phone, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

type LeadAction = "whatsapp" | "email" | "call" | null;

interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status: string;
  temperature?: string | number | null;
  notes?: string | null;
  last_contact?: string | null;
}

interface LeadActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  action: LeadAction;
}

export default function LeadActionModal({ isOpen, onClose, lead, action }: LeadActionModalProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  const userFirstName = useMemo(() => {
    const fromUser = (user as any)?.name || (user as any)?.user_metadata?.full_name || (user as any)?.email;
    if (fromUser) {
      return fromUser.split(" ")[0].split("@")[0] || "Dein Berater";
    }
    return "Dein Berater";
  }, [user]);

  useEffect(() => {
    if (isOpen && lead && action) {
      generateMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lead?.id, action]);

  const buildPrompt = (currentLead: Lead, currentAction: LeadAction) => {
    const channel = currentAction === "whatsapp" ? "WhatsApp" : currentAction === "email" ? "Email" : "Anruf";
    const statusText = getStatusText(currentLead.status);

    return (
      `Generiere eine kurze ${channel}-Nachricht für ${currentLead.name}` +
      `${currentLead.company ? ` von ${currentLead.company}` : ""}.\n\n` +
      `Lead-Status: ${statusText}\n` +
      `Temperatur: ${currentLead.temperature ?? "warm"}\n` +
      `${currentLead.notes ? `Notizen: ${currentLead.notes}\n` : ""}` +
      `${currentLead.last_contact ? `Letzter Kontakt: ${currentLead.last_contact}\n` : "Noch kein Kontakt\n"}\n` +
      "Die Nachricht soll:\n" +
      "- Persönlich und freundlich sein\n" +
      `- Zum Status passen (${statusText})\n` +
      "- Kurz und WhatsApp-ready sein\n" +
      "- Keine ** oder Markdown enthalten\n\n" +
      "Antworte NUR mit der Nachricht, kein 'Hier ist...' davor."
    );
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      new: "Neuer Lead - Erstkontakt",
      contacted: "Bereits kontaktiert - Follow-up",
      qualified: "Qualifiziert - Abschluss vorbereiten",
      customer: "Bereits Kunde - Beziehungspflege",
      lost: "Verloren - Reaktivierung versuchen",
    };
    return statusMap[status] || status;
  };

  const getMessageByStatus = (currentLead: Lead) => {
    const leadName = currentLead.name?.split(" ")[0] || "du";
    switch ((currentLead.status || "").toLowerCase()) {
      case "new":
      case "neu":
        return `Hallo ${leadName}! 👋

Ich bin neu in deinem Netzwerk und freue mich darauf, dich kennenzulernen.

Hast du Lust, ein paar Minuten zu quatschen?`;

      case "contacted":
      case "kontaktiert":
        return `Hey ${leadName}! 😊

Ich wollte nochmal nachfragen, ob du Zeit hattest, über unser Gespräch nachzudenken?

Lass mich wissen, wenn du Fragen hast!`;

      case "qualified":
      case "qualifiziert":
        return `Hi ${leadName}! 🎯

Basierend auf unserem Gespräch habe ich ein paar spannende Infos für dich.

Wann passt es dir für einen kurzen Call?`;

      case "proposal":
      case "angebot":
        return `Hallo ${leadName}! 📋

Hast du dir das Angebot schon anschauen können?

Ich beantworte gerne alle Fragen!`;

      case "won":
      case "kunde":
        return `Hey ${leadName}! 🎉

Willkommen im Team! Ich freue mich auf die Zusammenarbeit.

Bei Fragen bin ich jederzeit für dich da!`;

      default:
        return `Hallo ${leadName}! 👋

Ich hoffe, es geht dir gut!`;
    }
  };

  const generateMessage = async () => {
    if (!lead || !action) return;
    setLoading(true);
    setCopied(false);

    try {
      const prompt = buildPrompt(lead, action);
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: prompt,
          include_context: false,
          conversation_history: [],
        }),
      });

      const data = await response.json();
      const rawMessage = data.response || data.message || getMessageByStatus(lead);
      // AI generiert bereits Signatur aus user_knowledge Präferenzen - keine doppelte Signatur hinzufügen
      setMessage((rawMessage || "").trim());
    } catch (error) {
      console.error("Failed to generate message:", error);
      // Fallback: Verwende Status-basierte Nachricht (ohne Signatur, da AI sie später hinzufügt)
      setMessage(getMessageByStatus(lead));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!lead) return;

    if (action === "whatsapp" && lead.phone) {
      const phone = lead.phone.replace(/[^0-9+]/g, "");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    } else if (action === "email" && lead.email) {
      window.open(`mailto:${lead.email}?subject=Nachricht&body=${encodeURIComponent(message)}`, "_blank");
    }

    onClose();
  };

  if (!isOpen || !lead || !action) return null;

  const actionLabels = {
    whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "bg-green-600 hover:bg-green-700" },
    email: { label: "Email", icon: Mail, color: "bg-blue-600 hover:bg-blue-700" },
    call: { label: "Anruf-Script", icon: Phone, color: "bg-purple-600 hover:bg-purple-700" },
  } as const;

  const currentAction = actionLabels[action];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl w-full max-w-lg mx-4 border border-slate-800">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <currentAction.icon className="w-5 h-5" />
              {currentAction.label} an {lead.name}
            </h2>
            <p className="text-sm text-gray-400">
              Status: {lead.status} • {lead.company || "Keine Firma"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-400">Generiere Nachricht...</span>
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full h-48 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap"
                placeholder="Nachricht wird generiert..."
              />

              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>{message.length} Zeichen</span>
                <button onClick={generateMessage} className="text-blue-400 hover:text-blue-300">
                  🔄 Neu generieren
                </button>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 flex gap-2">
          <button onClick={handleCopy} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Kopiert!" : "Kopieren"}
          </button>

          {action !== "call" && (
            <button
              onClick={handleSend}
              disabled={!message || (action === "whatsapp" && !lead.phone) || (action === "email" && !lead.email)}
              className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-white ${currentAction.color} disabled:bg-gray-600 disabled:cursor-not-allowed`}
            >
              <Send className="w-4 h-4" />
              Senden
            </button>
          )}
        </div>

        {action === "whatsapp" && !lead.phone && (
          <div className="px-4 pb-4">
            <p className="text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded">⚠️ Keine Telefonnummer hinterlegt</p>
          </div>
        )}
        {action === "email" && !lead.email && (
          <div className="px-4 pb-4">
            <p className="text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded">⚠️ Keine Email-Adresse hinterlegt</p>
          </div>
        )}
      </div>
    </div>
  );
}

