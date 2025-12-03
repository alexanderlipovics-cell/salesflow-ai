/**
 * Company Knowledge Settings Page
 * 
 * Zentrale Seite zum Verwalten des Vertriebs-Wissens.
 * Tabs für verschiedene Bereiche: Unternehmen, Produkte, Preise, Rechtliches, Kommunikation.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Check, Loader2 } from "lucide-react";
import { useCompanyKnowledge } from "@/hooks/useCompanyKnowledge";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type TabKey =
  | "company"
  | "products"
  | "pricing"
  | "legal"
  | "communication";

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function CompanyKnowledgeSettingsPage() {
  const { loading, saving, error, knowledge, save } = useCompanyKnowledge();
  const [activeTab, setActiveTab] = useState<TabKey>("company");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    company_name: "",
    vision: "",
    target_audience: "",
    products: "",
    pricing: "",
    usps: "",
    legal_disclaimers: "",
    communication_style: "",
    no_go_phrases: "",
    notes: "",
  });

  // Werte aus Knowledge initial einlesen
  useEffect(() => {
    if (knowledge) {
      setForm({
        company_name: knowledge.company_name ?? "",
        vision: knowledge.vision ?? "",
        target_audience: knowledge.target_audience ?? "",
        products: knowledge.products ?? "",
        pricing: knowledge.pricing ?? "",
        usps: knowledge.usps ?? "",
        legal_disclaimers: knowledge.legal_disclaimers ?? "",
        communication_style: knowledge.communication_style ?? "",
        no_go_phrases: knowledge.no_go_phrases ?? "",
        notes: knowledge.notes ?? "",
      });
    }
  }, [knowledge]);

  const handleChange = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSuccessMessage(null);
    try {
      await save({
        company_name: form.company_name || null,
        vision: form.vision || null,
        target_audience: form.target_audience || null,
        products: form.products || null,
        pricing: form.pricing || null,
        usps: form.usps || null,
        legal_disclaimers: form.legal_disclaimers || null,
        communication_style: form.communication_style || null,
        no_go_phrases: form.no_go_phrases || null,
        notes: form.notes || null,
      });
      
      setSuccessMessage("Vertriebs-Wissen erfolgreich gespeichert!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error wird bereits vom Hook gesetzt
      console.error("Speichern fehlgeschlagen:", err);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // Tab Button Component
  // ─────────────────────────────────────────────────────────────────

  const TabButton = ({
    tab,
    label,
  }: {
    tab: TabKey;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
        activeTab === tab
          ? "bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-900/20"
          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-6 pb-24 text-slate-50">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Vertriebs-Wissen</h1>
            <p className="mt-1 text-sm text-slate-400">
              Hier hinterlegst du alles, was deine KI über euer Angebot wissen muss.
            </p>
          </div>
        </div>
      </header>

      {/* Info Banner */}
      <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
        <p>
          💡 <strong>Tipp:</strong> Je genauer du hier bist, desto weniger muss die KI raten.
          Alle Angaben sind optional – fülle nur aus, was für dich relevant ist.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400">
          <Check className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton tab="company" label="Unternehmen & Vision" />
        <TabButton tab="products" label="Produkte & Angebote" />
        <TabButton tab="pricing" label="Preise & Konditionen" />
        <TabButton tab="legal" label="Rechtliches" />
        <TabButton tab="communication" label="Kommunikationsstil" />
      </div>

      {/* Content Section */}
      <section className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="mt-4 text-sm">Lade dein Vertriebs-Wissen …</p>
          </div>
        ) : (
          <>
            {/* Tab Content */}
            <div className="space-y-4">
              {activeTab === "company" && (
                <div className="space-y-4">
                  <FormField
                    label="Firmenname"
                    type="input"
                    value={form.company_name}
                    onChange={(value) => handleChange("company_name", value)}
                    placeholder="z.B. Sales Flow AI"
                  />
                  <FormField
                    label="Vision / Mission"
                    type="textarea"
                    rows={4}
                    value={form.vision}
                    onChange={(value) => handleChange("vision", value)}
                    placeholder="Was ist eure Mission? Wofür steht ihr?"
                  />
                  <FormField
                    label="Zielgruppe (wer soll abgeschlossen werden?)"
                    type="textarea"
                    rows={3}
                    value={form.target_audience}
                    onChange={(value) => handleChange("target_audience", value)}
                    placeholder="z.B. Vertriebsteams, Network Marketer, Immobilienmakler"
                  />
                </div>
              )}

              {activeTab === "products" && (
                <div className="space-y-4">
                  <FormField
                    label="Produkte & Pakete"
                    type="textarea"
                    rows={6}
                    value={form.products}
                    onChange={(value) => handleChange("products", value)}
                    placeholder="- Produkt A: Kurzbeschreibung&#10;- Produkt B: Kurzbeschreibung&#10;- Paket C: Was ist inkludiert?"
                  />
                  <FormField
                    label="USPs (Warum ihr?)"
                    type="textarea"
                    rows={4}
                    value={form.usps}
                    onChange={(value) => handleChange("usps", value)}
                    placeholder="Was macht euch einzigartig? Warum sollten Kunden bei euch kaufen?"
                  />
                </div>
              )}

              {activeTab === "pricing" && (
                <div className="space-y-4">
                  <FormField
                    label="Preismodell & Konditionen"
                    type="textarea"
                    rows={6}
                    value={form.pricing}
                    onChange={(value) => handleChange("pricing", value)}
                    placeholder="z.B. Setup-Gebühr, Monatspreise, Laufzeiten, Rabatte, Staffelpreise"
                  />
                  <FormField
                    label="Interne Notizen (nur für dich)"
                    type="textarea"
                    rows={3}
                    value={form.notes}
                    onChange={(value) => handleChange("notes", value)}
                    placeholder="Private Notizen, die nicht in KI-Prompts einfließen"
                  />
                </div>
              )}

              {activeTab === "legal" && (
                <div className="space-y-4">
                  <FormField
                    label="Rechtliche Hinweise / Disclaimer"
                    type="textarea"
                    rows={6}
                    value={form.legal_disclaimers}
                    onChange={(value) => handleChange("legal_disclaimers", value)}
                    placeholder="z.B. keine Renditeversprechen, rechtlich notwendige Sätze, Compliance-Vorgaben"
                  />
                </div>
              )}

              {activeTab === "communication" && (
                <div className="space-y-4">
                  <FormField
                    label="Kommunikationsstil (Ton, du/Sie, Emojis, etc.)"
                    type="textarea"
                    rows={4}
                    value={form.communication_style}
                    onChange={(value) => handleChange("communication_style", value)}
                    placeholder="z.B. locker & persönlich, Du-Form, Emojis sparsam nutzen, professionell aber nahbar"
                  />
                  <FormField
                    label="No-Gos / Tabu-Sätze"
                    type="textarea"
                    rows={4}
                    value={form.no_go_phrases}
                    onChange={(value) => handleChange("no_go_phrases", value)}
                    placeholder="z.B. keine Renditeversprechen, keine Gesundheitsversprechen, keine Vergleiche mit Konkurrent XY"
                  />
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-slate-900 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Speichere …
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Speichern
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  type: "input" | "textarea";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

function FormField({
  label,
  type,
  value,
  onChange,
  placeholder,
  rows,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400">
        {label}
      </label>
      {type === "input" ? (
        <input
          className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <textarea
          className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          rows={rows || 4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

