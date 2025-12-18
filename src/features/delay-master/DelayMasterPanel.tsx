import React, { useState } from "react";
import { RefreshCw, Send, UserRoundSearch } from "lucide-react";
import { useVertical, type Vertical } from "../../core/VerticalContext";
import {
  ContactPickerDialog,
  type ContactSummary,
} from "../contacts/ContactPickerDialog";

type DelayBranch =
  | "network_marketing"
  | "immo"
  | "finance"
  | "coaching"
  | "generic";
type DelayChannel = "whatsapp" | "email" | "instagram_dm" | "facebook_dm";
type DelayTone = "du" | "sie";
type DelayResponseSource = "template" | "llm" | "fallback";

interface DelayMasterState {
  contactName: string;
  delayMinutes: number;
  channel: DelayChannel;
  tone: DelayTone;
  location: string;
  context: string;
}

interface DelayResponsePayload {
  message: string;
  template_id?: string | null;
  source?: DelayResponseSource;
}

const CHANNEL_OPTIONS: Array<{ label: string; value: DelayChannel }> = [
  { label: "WhatsApp", value: "whatsapp" },
  { label: "E-Mail", value: "email" },
  { label: "Instagram DM", value: "instagram_dm" },
  { label: "Facebook DM", value: "facebook_dm" },
];

const TONE_OPTIONS: Array<{ label: string; value: DelayTone }> = [
  { label: "Du", value: "du" },
  { label: "Sie", value: "sie" },
];

const SOURCE_LABELS: Record<DelayResponseSource, string> = {
  template: "Vorlage",
  llm: "KI",
  fallback: "Fallback",
};

const verticalToBranch = (vertical: Vertical): DelayBranch => {
  if (vertical === "chief") {
    return "generic";
  }
  if (vertical === "network_marketing" || vertical === "immo") {
    return vertical;
  }
  if (vertical === "finance") {
    return "finance";
  }
  return "generic";
};

export const DelayMasterPanel: React.FC = () => {
  const { vertical } = useVertical();
  const branch = verticalToBranch(vertical);

  const [state, setState] = useState<DelayMasterState>({
    contactName: "",
    delayMinutes: 15,
    channel: "whatsapp",
    tone: "du",
    location: "",
    context: "",
  });
  const [message, setMessage] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [source, setSource] = useState<DelayResponseSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const requestDelayMessage = async (options?: {
    useLastTemplateAsExclude?: boolean;
  }) => {
    const lastTemplateId =
      options?.useLastTemplateAsExclude && templateId ? templateId : null;

    try {
      setIsLoading(true);
      setError(null);
      setMessage("");
      setSource(null);
      if (!options?.useLastTemplateAsExclude) {
        setTemplateId(null);
      }

      const payload = {
        branch,
        channel: state.channel,
        tone: state.tone,
        minutes_late: state.delayMinutes,
        name: state.contactName.trim() || undefined,
        location: state.location.trim() || undefined,
        context: state.context.trim() || undefined,
        last_template_id: lastTemplateId,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/delay/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Fehler beim Erzeugen der Delay-Nachricht.");
      }

      const data = (await response.json()) as DelayResponsePayload;
      setMessage(data.message ?? "");
      setTemplateId(data.template_id ?? null);
      setSource(data.source ?? null);
    } catch (err) {
      console.error("Delay Master Fehler:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Unbekannter Fehler beim Generieren.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSelected = (contact: ContactSummary) => {
    setState((prev) => ({
      ...prev,
      contactName: contact.name ?? prev.contactName,
      location: prev.location || contact.city || "",
    }));
    setIsPickerOpen(false);
  };

  const copyMessage = () => {
    if (!message) {
      return;
    }
    const textToCopy = message.replace(/\*\*/g, "");
    void navigator.clipboard?.writeText(textToCopy);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-xl">
      <h3 className="text-xl font-bold mb-4 text-orange-400">Delay Master ⏱️</h3>
      <p className="text-sm text-gray-400 mb-4">
        Erstelle die perfekte, empathische Nachricht bei Verspätungen.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Kontakt &amp; Ort
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Name eingeben oder aus Kontakten wählen"
              value={state.contactName}
              onChange={(e) =>
                setState((prev) => ({ ...prev, contactName: e.target.value }))
              }
              className="flex-1 bg-gray-700 text-white border-gray-600 rounded-md p-2"
            />
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 px-3 text-sm font-medium text-gray-200 hover:bg-gray-700"
            >
              <UserRoundSearch className="h-4 w-4" />
              Kontakte
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Minuten Verspätung
          </label>
          <input
            type="number"
            min="1"
            value={state.delayMinutes}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                delayMinutes: Math.max(1, parseInt(e.target.value, 10) || 1),
              }))
            }
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Ort/Standort (Optional)
          </label>
          <input
            type="text"
            placeholder="z.B. 'Büro in München' oder 'Online-Meeting'"
            value={state.location}
            onChange={(e) =>
              setState((prev) => ({ ...prev, location: e.target.value }))
            }
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 my-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Kanal
          </label>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setState((prev) => ({ ...prev, channel: option.value }))
                }
                className={`py-1 px-3 rounded-full text-sm font-medium transition duration-150 ${
                  state.channel === option.value
                    ? "bg-orange-600 text-white"
                    : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Ton
          </label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setState((prev) => ({ ...prev, tone: option.value }))
                }
                className={`py-1 px-3 rounded-full text-sm font-medium transition duration-150 ${
                  state.tone === option.value
                    ? "bg-orange-600 text-white"
                    : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Zusatz-Kontext (z.B. Grund der Verspätung)
        </label>
        <textarea
          rows={2}
          placeholder="z.B. 'Ein Meeting hat sich unerwartet gezogen' oder 'Stau auf der A1'"
          value={state.context}
          onChange={(e) =>
            setState((prev) => ({ ...prev, context: e.target.value }))
          }
          className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2 resize-none"
        />
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <button
          type="button"
          onClick={() => requestDelayMessage()}
          disabled={isLoading || state.delayMinutes < 1}
          className={`w-full mt-4 py-2 px-4 rounded-md text-lg font-semibold flex items-center justify-center transition duration-200 ${
            isLoading || state.delayMinutes < 1
              ? "bg-gray-500 text-gray-300 cursor-not-allowed"
              : "bg-orange-600 hover:bg-orange-700 text-white"
          }`}
        >
          {isLoading ? (
            "Nachricht wird generiert..."
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" /> Perfekte Nachricht generieren
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => requestDelayMessage({ useLastTemplateAsExclude: true })}
          disabled={isLoading || !message}
          className={`w-full md:w-auto mt-0 py-2 px-4 rounded-md text-sm font-semibold flex items-center justify-center transition duration-200 border ${
            isLoading || !message
              ? "border-gray-600 text-gray-400 cursor-not-allowed"
              : "border-orange-500 text-orange-300 hover:bg-orange-600/20"
          }`}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Neue Variante
        </button>
      </div>

      {(message || error) && (
        <div className="mt-4 p-4 bg-gray-700 border border-gray-600 rounded-md space-y-3">
          <div className="flex items-center justify-between text-sm">
            <h4 className="font-medium text-orange-400">
              Vorschlag vom Delay Master:
            </h4>
            {source && (
              <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-200">
                Quelle: {SOURCE_LABELS[source]}
              </span>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-300">
              {error} – bitte erneut versuchen.
            </p>
          )}
          {message && (
            <>
              <textarea
                readOnly
                rows={4}
                value={message}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-md p-3 resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyMessage}
                  className="text-xs py-1 px-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-200"
                >
                  Kopieren
                </button>
                {templateId && (
                  <span className="text-[11px] text-gray-400">
                    Template-ID: {templateId}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <ContactPickerDialog
        open={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleContactSelected}
      />
    </div>
  );
};

