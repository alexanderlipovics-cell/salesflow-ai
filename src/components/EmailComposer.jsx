import { useEffect, useMemo, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/**
 * Einfacher E-Mail Composer mit Templates und Variable-Replacement.
 */
const EmailComposer = ({
  isOpen,
  onClose,
  defaultTo = "",
  leadId = null,
  lead = null,
  onSent = () => {},
}) => {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [sending, setSending] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTo(defaultTo || lead?.email || "");
      fetchTemplates();
    }
  }, [isOpen, defaultTo, lead]);

  const replacements = useMemo(
    () => ({
      name: lead?.name || "",
      company: lead?.company || "",
    }),
    [lead]
  );

  const applyVariables = (content) => {
    return content.replace(/{(\w+)}/g, (_, key) => replacements[key] || "");
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/emails/templates`,
        { credentials: "include" }
      );
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (e) {
      console.error("Templates konnten nicht geladen werden", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const tpl = templates.find((t) => t.id === templateId);
    setSelectedTemplate(templateId);
    if (tpl) {
      setSubject(applyVariables(tpl.subject || ""));
      setBody(applyVariables(tpl.body_html || ""));
    }
  };

  const handleSend = async () => {
    if (!to || !subject) return;
    setSending(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/emails/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            to,
            subject,
            body_html: body,
            lead_id: leadId,
            track_opens: true,
          }),
        }
      );
      if (!res.ok) {
        throw new Error("E-Mail konnte nicht gesendet werden");
      }
      onSent();
      onClose();
      setSubject("");
      setBody("");
      setSelectedTemplate(null);
    } catch (e) {
      console.error(e);
      alert("Senden fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">E-Mail verfassen</div>
            <div className="text-lg font-semibold text-white">{lead?.name || to}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:border-white/40"
            >
              Schließen
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="rounded-xl bg-salesflow-accent px-4 py-2 text-sm font-semibold text-white hover:bg-salesflow-accent/80 disabled:opacity-60"
            >
              {sending ? "Sendet..." : "Senden"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-1/2 space-y-3">
              <div>
                <label className="text-xs uppercase text-gray-500">An</label>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
                  placeholder="lead@example.com"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Betreff</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
                  placeholder="Betreff eingeben"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-500">Template</label>
                <select
                  value={selectedTemplate || ""}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
                >
                  <option value="">Kein Template</option>
                  {loadingTemplates && <option>Lade...</option>}
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-xs text-gray-400">
                Platzhalter: {`{name}`}, {`{company}`}
              </div>
            </div>

            <div className="w-1/2">
              <label className="text-xs uppercase text-gray-500">Nachricht</label>
              <div className="mt-1 overflow-hidden rounded-xl border border-white/10 bg-white">
                <ReactQuill theme="snow" value={body} onChange={setBody} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;

