/**
 * Follow-up Template Manager Page
 * 
 * Manager-Seite zum Verwalten von Follow-up-Template-Overrides.
 * Ermöglicht die Zuordnung von gespeicherten Templates (aus objection_templates)
 * zu bestimmten Follow-up-Steps und Branchen/Verticals.
 * 
 * Pro Step+Vertical kann nur EIN aktives Template gesetzt werden.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Settings, RefreshCw } from 'lucide-react';
import {
  STANDARD_FOLLOW_UP_SEQUENCE,
  type FollowUpStepKey,
  type FollowUpTemplate,
} from '@/config/followupSequence';
import {
  listAllObjectionTemplates,
  setActiveTemplateForStepAndVertical,
  clearActiveTemplateForStepAndVertical,
  type ObjectionTemplate,
} from '@/services/objectionTemplatesService';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type VerticalOption = {
  value: string | null;
  label: string;
};

const VERTICAL_OPTIONS: VerticalOption[] = [
  { value: null, label: 'Allgemein' },
  { value: 'network', label: 'Network Marketing' },
  { value: 'real_estate', label: 'Immobilien' },
  { value: 'finance', label: 'Finance' },
];

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function mapVerticalLabel(vertical: string | null): string {
  if (!vertical || vertical === 'generic') return 'Allgemein';
  if (vertical === 'network') return 'Network Marketing';
  if (vertical === 'real_estate') return 'Immobilien';
  if (vertical === 'finance') return 'Finance';
  return vertical;
}

function normalizeVertical(v: string | null): string | null {
  if (!v || v === 'generic' || v === '') return null;
  return v;
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function FollowUpTemplateManagerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ObjectionTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lade alle Templates aus der DB
  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAllObjectionTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error('Fehler beim Laden der Templates:', err);
      setError(err?.message || 'Templates konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Finde das aktuell aktive Template für einen Step + Vertical
  const findActiveTemplate = (
    stepKey: FollowUpStepKey,
    vertical: string | null
  ): ObjectionTemplate | null => {
    const normalizedVertical = normalizeVertical(vertical);
    
    return templates.find(
      (t) =>
        t.status === 'active' &&
        t.key === stepKey &&
        normalizeVertical(t.vertical) === normalizedVertical
    ) ?? null;
  };

  // Finde alle Templates, die als Kandidaten in Frage kommen
  const listCandidateTemplates = (
    _stepKey: FollowUpStepKey, // Underscore: Parameter wird aktuell nicht verwendet, aber für konsistente Signatur beibehalten
    vertical: string | null
  ): ObjectionTemplate[] => {
    const normalizedVertical = normalizeVertical(vertical);
    
    return templates.filter((t) => {
      // Keine archivierten Templates
      if (t.status === 'archived') return false;
      
      // Kandidaten: Templates mit passendem Vertical oder generisch (null/generic)
      const templateVertical = normalizeVertical(t.vertical);
      
      // Generische Templates passen immer
      if (templateVertical === null) return true;
      
      // Templates mit gleichem Vertical
      if (normalizedVertical && templateVertical === normalizedVertical) return true;
      
      return false;
    });
  };

  // Handler: Template für Step + Vertical setzen
  const handleSetTemplate = async (
    stepKey: FollowUpStepKey,
    vertical: string | null,
    templateId: string | null
  ) => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!templateId) {
        // Standard-Konfiguration verwenden (alle Overrides für diesen Step+Vertical löschen)
        await clearActiveTemplateForStepAndVertical(stepKey, normalizeVertical(vertical));
        setSuccessMessage('Standard-Konfiguration wiederhergestellt.');
      } else {
        // Template als aktiv setzen
        await setActiveTemplateForStepAndVertical(
          templateId,
          stepKey,
          normalizeVertical(vertical)
        );
        setSuccessMessage('Template erfolgreich als aktiv gesetzt.');
      }

      // Templates neu laden
      await loadTemplates();

      // Success-Message nach 3 Sekunden ausblenden
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Fehler beim Setzen des aktiven Templates:', err);
      setError(
        err?.message || 'Aktives Template konnte nicht gesetzt werden.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 pb-24 text-slate-50">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* Header */}
        {/* ───────────────────────────────────────────────────────────── */}

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Follow-up Templates</h1>
                <p className="text-sm text-slate-400">
                  Lege fest, welche KI-Templates pro Step & Branche verwendet werden
                </p>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadTemplates}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium transition hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Neu laden
          </button>
        </div>

        {/* Info Banner */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-400">
            💡 <strong>Hinweis:</strong> Aktuelle Überschreibungen werden automatisch
            in den Follow-ups verwendet. Änderungen gelten für alle Nutzer.
          </p>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Loading State */}
        {/* ───────────────────────────────────────────────────────────── */}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
            <p className="mt-4 text-sm text-slate-400">Lade Templates …</p>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Error State */}
        {/* ───────────────────────────────────────────────────────────── */}

        {error && !loading && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Fehler</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Success Message */}
        {/* ───────────────────────────────────────────────────────────── */}

        {successMessage && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-400">✓ {successMessage}</p>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Template Configuration Grid */}
        {/* ───────────────────────────────────────────────────────────── */}

        {!loading && (
          <div className="space-y-8">
            {STANDARD_FOLLOW_UP_SEQUENCE.map((step) => (
              <StepConfigSection
                key={step.key}
                step={step}
                verticals={VERTICAL_OPTIONS}
                findActiveTemplate={findActiveTemplate}
                listCandidateTemplates={listCandidateTemplates}
                onSetTemplate={handleSetTemplate}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────

interface StepConfigSectionProps {
  step: FollowUpTemplate;
  verticals: VerticalOption[];
  findActiveTemplate: (stepKey: FollowUpStepKey, vertical: string | null) => ObjectionTemplate | null;
  listCandidateTemplates: (stepKey: FollowUpStepKey, vertical: string | null) => ObjectionTemplate[];
  onSetTemplate: (stepKey: FollowUpStepKey, vertical: string | null, templateId: string | null) => Promise<void>;
  saving: boolean;
}

function StepConfigSection({
  step,
  verticals,
  findActiveTemplate,
  listCandidateTemplates,
  onSetTemplate,
  saving,
}: StepConfigSectionProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
      {/* Step Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-50">{step.label}</h2>
        <p className="mt-1 text-sm text-slate-400">{step.description}</p>
      </div>

      {/* Vertical Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {verticals.map((vertical) => {
          const activeTemplate = findActiveTemplate(step.key, vertical.value);
          const candidates = listCandidateTemplates(step.key, vertical.value);

          return (
            <VerticalConfigCard
              key={`${step.key}-${vertical.value ?? 'generic'}`}
              stepKey={step.key}
              vertical={vertical}
              activeTemplate={activeTemplate}
              candidates={candidates}
              onSetTemplate={onSetTemplate}
              saving={saving}
            />
          );
        })}
      </div>
    </div>
  );
}

interface VerticalConfigCardProps {
  stepKey: FollowUpStepKey;
  vertical: VerticalOption;
  activeTemplate: ObjectionTemplate | null;
  candidates: ObjectionTemplate[];
  onSetTemplate: (stepKey: FollowUpStepKey, vertical: string | null, templateId: string | null) => Promise<void>;
  saving: boolean;
}

function VerticalConfigCard({
  stepKey,
  vertical,
  activeTemplate,
  candidates,
  onSetTemplate,
  saving,
}: VerticalConfigCardProps) {
  const [selectedValue, setSelectedValue] = useState<string>('');

  // Sync selectedValue mit activeTemplate
  useEffect(() => {
    setSelectedValue(activeTemplate?.id ?? '');
  }, [activeTemplate]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setSelectedValue(newValue);
    await onSetTemplate(stepKey, vertical.value, newValue || null);
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      {/* Vertical Label */}
      <div className="mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {vertical.label}
        </span>
      </div>

      {/* Current Active Template */}
      <div className="mb-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
          Aktuell aktiv
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-300">
          {activeTemplate ? activeTemplate.title : 'Standard-Konfiguration'}
        </p>
      </div>

      {/* Template Selector */}
      <div>
        <label className="mb-2 block text-xs font-medium text-slate-400">
          Template auswählen
        </label>
        <select
          value={selectedValue}
          onChange={handleChange}
          disabled={saving}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
        >
          <option value="">Standard-Konfiguration verwenden</option>
          {candidates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title} ({mapVerticalLabel(template.vertical)})
            </option>
          ))}
        </select>

        {/* Kandidaten-Count */}
        <p className="mt-2 text-xs text-slate-500">
          {candidates.length === 0
            ? 'Keine Templates verfügbar'
            : `${candidates.length} Template(s) verfügbar`}
        </p>
      </div>
    </div>
  );
}
