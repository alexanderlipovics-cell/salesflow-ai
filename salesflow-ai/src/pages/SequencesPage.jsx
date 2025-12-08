import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  Trash,
  Users,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { supabaseClient } from "@/lib/supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const defaultStep = (stepNumber) => ({
  step_number: stepNumber,
  delay_days: stepNumber === 1 ? 0 : 2,
  message_template: "",
  channel: "whatsapp",
  subject: "",
});

const cleanPhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = phone.trim();
  const hasPlus = cleaned.startsWith("+");
  cleaned = cleaned.replace(/[^\d]/g, "");
  if (hasPlus && cleaned.length > 0) cleaned = `+${cleaned}`;
  if (!cleaned.replace(/\+/g, "")) return null;
  if (cleaned.startsWith("0") && !cleaned.startsWith("+")) {
    cleaned = `+49${cleaned.slice(1)}`;
  }
  return cleaned;
};

export default function SequencesPage() {
  const [sequences, setSequences] = useState([]);
  const [dueActions, setDueActions] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [advancingId, setAdvancingId] = useState(null);
  const [error, setError] = useState(null);

  const [newSequence, setNewSequence] = useState({
    name: "",
    description: "",
    steps: [defaultStep(1)],
  });

  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchSequences(), fetchDueActions(), fetchLeads()]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const sortedSequences = useMemo(
    () =>
      [...sequences].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      ),
    [sequences],
  );

  const fetchSequences = async () => {
    try {
      setError(null);
      const res = await authFetch(`${API_BASE_URL}/api/sequences`);
      const body = await res.json();
      setSequences(body.sequences || []);
    } catch (err) {
      console.error(err);
      setError("Sequenzen konnten nicht geladen werden.");
    }
  };

  const fetchDueActions = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/sequences/due-today`);
      const body = await res.json();
      setDueActions(body.due_actions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeads = async () => {
    const { data, error: leadError } = await supabaseClient
      .from("leads")
      .select("id, name, first_name, company, phone, email")
      .order("name", { ascending: true })
      .limit(500);

    if (leadError) {
      console.error("Leads laden fehlgeschlagen:", leadError);
      return;
    }
    setLeads(data || []);
  };

  const updateStep = (index, field, value) => {
    setNewSequence((prev) => {
      const steps = [...prev.steps];
      steps[index] = { ...steps[index], [field]: value };
      return { ...prev, steps };
    });
  };

  const addStep = () => {
    setNewSequence((prev) => ({
      ...prev,
      steps: [...prev.steps, defaultStep(prev.steps.length + 1)],
    }));
  };

  const removeStep = (index) => {
    setNewSequence((prev) => {
      if (prev.steps.length === 1) return prev;
      const steps = prev.steps.filter((_, i) => i !== index).map((s, i) => ({
        ...s,
        step_number: i + 1,
      }));
      return { ...prev, steps };
    });
  };

  const handleCreateSequence = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await authFetch(`${API_BASE_URL}/api/sequences`, {
        method: "POST",
        body: JSON.stringify({
          name: newSequence.name,
          description: newSequence.description,
          steps: newSequence.steps,
        }),
      });
      await fetchSequences();
      setNewSequence({ name: "", description: "", steps: [defaultStep(1)] });
    } catch (err) {
      console.error(err);
      setError("Sequence konnte nicht angelegt werden.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSequence = async (sequenceId) => {
    if (!window.confirm("Sequenz wirklich löschen?")) return;
    await authFetch(`${API_BASE_URL}/api/sequences/${sequenceId}`, {
      method: "DELETE",
    });
    await fetchSequences();
  };

  const handleEnroll = async () => {
    if (!selectedLeadId || !selectedSequenceId) {
      alert("Bitte Lead und Sequenz wählen.");
      return;
    }
    setEnrolling(true);
    setError(null);
    try {
      await authFetch(`${API_BASE_URL}/api/sequences/enroll`, {
        method: "POST",
        body: JSON.stringify({
          lead_id: selectedLeadId,
          sequence_id: selectedSequenceId,
        }),
      });
      await Promise.all([fetchSequences(), fetchDueActions()]);
      setSelectedLeadId("");
      setSelectedSequenceId("");
    } catch (err) {
      console.error(err);
      setError("Lead konnte nicht eingeschrieben werden.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleAdvance = async (enrollmentId) => {
    setAdvancingId(enrollmentId);
    try {
      await authFetch(`${API_BASE_URL}/api/sequences/advance/${enrollmentId}`, {
        method: "POST",
      });
      await Promise.all([fetchSequences(), fetchDueActions()]);
    } catch (err) {
      console.error(err);
      alert("Konnte Schritt nicht abschließen.");
    } finally {
      setAdvancingId(null);
    }
  };

  const handleSendMessage = async (action) => {
    const text = action.message || "";
    const subject = action.subject || "";

    if (action.channel === "whatsapp") {
      const number = cleanPhoneNumber(action.lead_phone);
      if (number) {
        const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        await navigator.clipboard.writeText(text);
        alert("Telefonnummer fehlt. Nachricht wurde in die Zwischenablage kopiert.");
      }
    } else if (action.channel === "email" && action.lead_email) {
      const mailto = `mailto:${action.lead_email}?subject=${encodeURIComponent(
        subject || "Follow-up",
      )}&body=${encodeURIComponent(text)}`;
      window.location.href = mailto;
    } else {
      await navigator.clipboard.writeText(text);
      alert("Nachricht kopiert. Kanal manuell senden.");
    }

    await handleAdvance(action.enrollment_id);
  };

  const leadDisplay = (lead) =>
    lead?.name || lead?.first_name || "Unbenannter Lead";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-3 text-sm">Lade Sequenzen …</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Follow-up Sequenzen</h1>
          <p className="text-sm text-slate-400">
            Templates definieren, Leads einschreiben und fällige Actions abarbeiten.
          </p>
        </div>
        <button
          onClick={() => {
            fetchSequences();
            fetchDueActions();
          }}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-300">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Create Sequence */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-900/30">
            <div className="mb-4 flex items-center gap-2 text-slate-200">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold">Neue Sequenz</h2>
            </div>
            <form onSubmit={handleCreateSequence} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500">
                    Name
                  </label>
                  <input
                    value={newSequence.name}
                    onChange={(e) =>
                      setNewSequence((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="z.B. Standard 4-Step"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-500">
                    Beschreibung (optional)
                  </label>
                  <input
                    value={newSequence.description}
                    onChange={(e) =>
                      setNewSequence((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="Kurzbeschreibung"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">Steps</h3>
                  <button
                    type="button"
                    onClick={addStep}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 transition hover:border-emerald-500 hover:text-emerald-300"
                  >
                    <Plus className="h-4 w-4" />
                    Step hinzufügen
                  </button>
                </div>

                <div className="space-y-3">
                  {newSequence.steps.map((step, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-800 bg-slate-950/80 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-400">
                          Step {step.step_number}
                        </div>
                        {newSequence.steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-1 md:col-span-1">
                          <label className="text-[11px] text-slate-500">
                            Delay (Tage)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={step.delay_days}
                            onChange={(e) =>
                              updateStep(index, "delay_days", Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-1">
                          <label className="text-[11px] text-slate-500">
                            Kanal
                          </label>
                          <select
                            value={step.channel}
                            onChange={(e) => updateStep(index, "channel", e.target.value)}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                          >
                            <option value="whatsapp">WhatsApp</option>
                            <option value="email">E-Mail</option>
                            <option value="instagram">Instagram</option>
                          </select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[11px] text-slate-500">
                            Betreff (nur E-Mail)
                          </label>
                          <input
                            value={step.subject || ""}
                            onChange={(e) => updateStep(index, "subject", e.target.value)}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <label className="text-[11px] text-slate-500">
                          Nachricht
                        </label>
                        <textarea
                          value={step.message_template}
                          onChange={(e) =>
                            updateStep(index, "message_template", e.target.value)
                          }
                          rows={3}
                          required
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                          placeholder="Template mit {name}, {vorname}, {firma}"
                        />
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Sequenz speichern
                </button>
              </div>
            </form>
          </div>

          {/* Sequence List */}
          <div className="space-y-3">
            {sortedSequences.map((seq) => (
              <div
                key={seq.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-900/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">{seq.name}</h3>
                    <p className="text-sm text-slate-400">{seq.description || "Keine Beschreibung"}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteSequence(seq.id)}
                    className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-red-300 hover:border-red-400 hover:text-red-200"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-slate-500">Steps</div>
                    <div className="space-y-2">
                      {(seq.sequence_steps || []).sort((a, b) => a.step_number - b.step_number).map((step) => (
                        <div
                          key={step.id}
                          className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Step {step.step_number}</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              +{step.delay_days} Tage
                            </span>
                          </div>
                          <div className="mt-1 text-xs uppercase text-slate-500">
                            Kanal: {step.channel}
                          </div>
                          <p className="mt-1 line-clamp-2 text-slate-200">{step.message_template}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      Leads in dieser Sequenz
                    </div>
                    <div className="space-y-2">
                      {(seq.sequence_enrollments || []).length === 0 && (
                        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">
                          Noch keine Leads eingeschrieben.
                        </div>
                      )}
                      {(seq.sequence_enrollments || []).map((enrollment) => (
                        <div
                          key={enrollment.id}
                          className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">
                                {leadDisplay(enrollment.leads)}
                              </div>
                              <div className="text-xs text-slate-400">
                                Step {enrollment.current_step} • Status {enrollment.status}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500">
                              Nächste Aktion: {enrollment.next_action_date || "—"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {sortedSequences.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
                Noch keine Sequenzen angelegt.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enroll Widget */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-900/30">
            <div className="mb-3 flex items-center gap-2 text-slate-200">
              <Users className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-semibold">Lead einschreiben</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-500">
                  Lead
                </label>
                <div className="relative">
                  <select
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Lead auswählen…</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {leadDisplay(lead)} {lead.company ? `(${lead.company})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-500">
                  Sequenz
                </label>
                <div className="relative">
                  <select
                    value={selectedSequenceId}
                    onChange={(e) => setSelectedSequenceId(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Sequenz auswählen…</option>
                    {sortedSequences.map((seq) => (
                      <option key={seq.id} value={seq.id}>
                        {seq.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Einschreiben
              </button>
            </div>
          </div>

          {/* Due today */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-900/30">
            <div className="mb-3 flex items-center justify-between text-slate-200">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-sky-400" />
                <h3 className="text-lg font-semibold">Heute fällig</h3>
              </div>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {dueActions.length}
              </span>
            </div>

            <div className="space-y-3">
              {dueActions.length === 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-400">
                  Keine Aktionen fällig.
                </div>
              )}

              {dueActions.map((action) => (
                <div
                  key={action.enrollment_id}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{action.lead_name || "Lead"}</div>
                      <div className="text-xs text-slate-400">
                        {action.sequence_name} • Step {action.step_number} • {action.channel}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdvance(action.enrollment_id)}
                      disabled={advancingId === action.enrollment_id}
                      className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-emerald-300 hover:border-emerald-500"
                    >
                      {advancingId === action.enrollment_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-slate-200">{action.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSendMessage(action)}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-400"
                    >
                      <Send className="h-4 w-4" />
                      Senden & weiter
                    </button>
                    {action.lead_email && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                        <Mail className="h-3 w-3" />
                        {action.lead_email}
                      </span>
                    )}
                    {action.lead_phone && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                        <MessageCircle className="h-3 w-3" />
                        {action.lead_phone}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

