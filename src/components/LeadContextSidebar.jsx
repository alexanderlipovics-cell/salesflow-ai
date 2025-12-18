import React from "react";
import {
  Phone,
  Mail,
  Linkedin,
  Instagram,
  Zap,
  Sun,
  CloudRain,
  Cloud,
  Edit,
} from "lucide-react";

const LeadContextSidebar = ({ lead, onEdit, onCall, onEmail }) => {
  if (!lead) return null;

  const initials =
    lead.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ||
    "??";

  const aiScore = lead.ai_score || Math.floor(Math.random() * 30) + 70;
  const dealProgress = lead.deal_progress || 65;

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case "positive":
        return <Sun className="w-4 h-4 text-yellow-400" />;
      case "negative":
        return <CloudRain className="w-4 h-4 text-blue-400" />;
      default:
        return <Cloud className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="w-80 bg-gray-900/90 backdrop-blur-xl border border-gray-800 flex flex-col h-full shadow-2xl rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-800">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            {lead.avatar_url ? (
              <img
                src={lead.avatar_url}
                alt={lead.name}
                className="w-20 h-20 rounded-full border-2 border-blue-500 p-0.5 object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-2 border-blue-500 p-0.5 bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{initials}</span>
              </div>
            )}

            <div className="absolute -bottom-1 -right-1 bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg border-2 border-gray-900">
              {aiScore}
            </div>
          </div>

          <h3 className="text-xl font-bold text-white text-center">
            {lead.name}
          </h3>
          <p className="text-gray-400 text-sm text-center">
            {lead.position && <span>{lead.position} @ </span>}
            <span className="text-blue-400 font-medium">
              {lead.company || "Unbekannt"}
            </span>
          </p>

          <div className="flex items-center gap-1 mt-2">
            {getSentimentIcon(lead.sentiment)}
            <span className="text-xs text-gray-500">
              {lead.sentiment === "positive"
                ? "Positiv gestimmt"
                : lead.sentiment === "negative"
                ? "Kritisch"
                : "Neutral"}
            </span>
          </div>

          <div className="flex gap-2 mt-4">
            {lead.phone && (
              <button
                onClick={() => onCall?.(lead)}
                className="p-2.5 bg-gray-800 hover:bg-green-600 rounded-lg transition-all hover:scale-105 group"
                title="Anrufen"
              >
                <Phone className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </button>
            )}
            {lead.email && (
              <button
                onClick={() => onEmail?.(lead)}
                className="p-2.5 bg-gray-800 hover:bg-purple-600 rounded-lg transition-all hover:scale-105 group"
                title="E-Mail"
              >
                <Mail className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </button>
            )}
            {lead.linkedin && (
              <a
                href={lead.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-gray-800 hover:bg-blue-600 rounded-lg transition-all hover:scale-105 group"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </a>
            )}
            {lead.instagram && (
              <a
                href={`https://instagram.com/${lead.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-gray-800 hover:bg-pink-600 rounded-lg transition-all hover:scale-105 group"
                title="Instagram"
              >
                <Instagram className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-800">
        <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50">
          <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
            <span>Win Probability</span>
            <span
              className={
                dealProgress >= 60
                  ? "text-green-400"
                  : dealProgress >= 40
                  ? "text-yellow-400"
                  : "text-red-400"
              }
            >
              {dealProgress >= 60
                ? "High"
                : dealProgress >= 40
                ? "Medium"
                : "Low"}{" "}
              ({dealProgress}%)
            </span>
          </div>

          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                dealProgress >= 60
                  ? "bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                  : dealProgress >= 40
                  ? "bg-gradient-to-r from-yellow-500 to-orange-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                  : "bg-gradient-to-r from-red-500 to-orange-500"
              }`}
              style={{ width: `${dealProgress}%` }}
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
            <span className="text-xs text-gray-400">Phase:</span>
            <span className="text-xs font-bold text-blue-300 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
              {lead.status || "Kontaktiert"}
            </span>
          </div>

          {lead.deal_value && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">Deal Value:</span>
              <span className="text-sm font-bold text-green-400">
                €{lead.deal_value.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-b border-gray-800 flex-1 overflow-y-auto">
        <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 flex items-center">
          <Zap className="w-3 h-3 mr-1 text-yellow-500" />
          AI Strategy
        </h4>

        <div className="space-y-3">
          <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 rounded-lg border border-yellow-500/20">
            <p className="text-xs text-gray-300 leading-relaxed">
              <span className="text-yellow-400 font-bold">💡 Tipp:</span>{" "}
              {lead.ai_insight ||
                `${lead.name?.split(" ")[0] || "Dieser Lead"} reagiert gut auf konkrete Zahlen. Fokussiere auf ROI und Zeitersparnis.`}
            </p>
          </div>

          {lead.personality_type && (
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <p className="text-xs text-gray-400 mb-1">Persönlichkeitstyp:</p>
              <p className="text-sm text-white font-medium">
                {lead.personality_type}
              </p>
            </div>
          )}

          <div className="space-y-2 mt-4">
            <h5 className="text-xs text-gray-500 uppercase tracking-wider">
              Letzte Signale
            </h5>

            <div className="flex items-start gap-3 p-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 shadow-[0_0_5px_#22c55e]" />
              <p className="text-xs text-gray-400">
                Letzter Kontakt:{" "}
                <span className="text-white">
                  {lead.last_contact_days || "?"} Tage
                </span>
              </p>
            </div>

            {lead.temperature && (
              <div className="flex items-start gap-3 p-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                    lead.temperature === "hot"
                      ? "bg-red-500"
                      : lead.temperature === "warm"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  }`}
                />
                <p className="text-xs text-gray-400">
                  Temperatur:{" "}
                  <span className="text-white capitalize">
                    {lead.temperature}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => onEdit?.(lead)}
          className="w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Kontext bearbeiten
        </button>
      </div>
    </div>
  );
};

export default LeadContextSidebar;

