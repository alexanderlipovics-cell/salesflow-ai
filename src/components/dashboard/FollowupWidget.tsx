import { useEffect, useState } from "react";
import { Bell, Clock, X, MessageCircle, Instagram, Linkedin, Mail, Check } from "lucide-react";
import { oneClickSend } from "@/utils/deepLinks";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Suggestion {
  id: string;
  suggested_message: string;
  reason: string;
  channel?: string;
  leads: {
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    instagram?: string;
    linkedin?: string;
    whatsapp?: string;
  };
}

export default function FollowupWidget() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/api/followups/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSuggestions(data.today || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: string, snoozeDays?: number) => {
    const token = localStorage.getItem("access_token");
    await fetch(`${API_BASE_URL}/api/followups/suggestions/${id}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action, snooze_days: snoozeDays })
    });
    fetchSuggestions();
  };

  const getChannelIcon = (channel?: string) => {
    switch ((channel || "").toLowerCase()) {
      case "instagram":
        return <Instagram className="w-3 h-3 text-pink-500" />;
      case "linkedin":
        return <Linkedin className="w-3 h-3 text-blue-500" />;
      case "email":
        return <Mail className="w-3 h-3 text-gray-300" />;
      default:
        return <MessageCircle className="w-3 h-3 text-green-500" />;
    }
  };

  const handleSend = async (suggestion: Suggestion) => {
    const channel = (suggestion.channel || "whatsapp").toLowerCase();
    let platform: "whatsapp" | "instagram" | "linkedin" | "email" = "whatsapp";
    let contact = "";

    switch (channel) {
      case "instagram":
        platform = "instagram";
        contact = suggestion.leads.instagram || "";
        break;
      case "linkedin":
        platform = "linkedin";
        contact = suggestion.leads.linkedin || "";
        break;
      case "email":
        platform = "email";
        contact = suggestion.leads.email || "";
        break;
      default:
        platform = "whatsapp";
        contact = suggestion.leads.whatsapp || suggestion.leads.phone || "";
        break;
    }

    if (!contact) {
      alert(`Keine ${channel} Kontaktdaten für ${suggestion.leads.name} vorhanden`);
      return;
    }

    const result = await oneClickSend(platform, contact, suggestion.suggested_message);
    if (!result.success) {
      alert(result.error || "Fehler beim Senden");
      return;
    }

    setCopiedId(suggestion.id);
    setTimeout(() => setCopiedId(null), 3000);
    await handleAction(suggestion.id, "send");
  };

  if (loading) return <div className="animate-pulse h-32 bg-slate-800 rounded-xl" />;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-cyan-400" />
          Follow-ups heute
        </h3>
        <span className="text-2xl font-bold text-cyan-400">{suggestions.length}</span>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-slate-400 text-sm">Keine Follow-ups fällig! 🎉</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {suggestions.slice(0, 5).map((s) => (
            <div key={s.id} className="p-3 bg-slate-800/50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-white">{s.leads?.name}</p>
                  <p className="text-xs text-slate-400">{s.reason}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-3 line-clamp-2">
                {s.suggested_message}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSend(s)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium text-white"
                >
                  {copiedId === s.id ? <Check className="w-3 h-3" /> : getChannelIcon(s.channel)}
                  {copiedId === s.id ? "Kopiert!" : "Senden"}
                </button>
                <button
                  onClick={() => handleAction(s.id, "snooze", 1)}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300"
                >
                  <Clock className="w-3 h-3" /> +1 Tag
                </button>
                <button
                  onClick={() => handleAction(s.id, "skip")}
                  className="flex items-center justify-center px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

