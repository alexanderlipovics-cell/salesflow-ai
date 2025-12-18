/**
 * Sales AI Settings Page
 * 
 * Ermöglicht dem User, seine bevorzugte KI-Persona/Sales-Modus zu wählen:
 * - Speed: Kurz, direkt, max Output
 * - Balanced: Standard-Mischung
 * - Relationship: Wärmer, mehr Kontext
 */

import { AlertTriangle, Loader2, Sparkles, Zap, Heart, Scale } from 'lucide-react';
import { useSalesPersona } from '@/hooks/useSalesPersona';
import type { PersonaKey } from '@/services/salesPersonaService';

// ─────────────────────────────────────────────────────────────────
// Persona Descriptions
// ─────────────────────────────────────────────────────────────────

const personaDescriptions: Record<
  PersonaKey,
  {
    title: string;
    description: string;
    icon: typeof Zap;
    tagline: string;
  }
> = {
  speed: {
    title: 'Speed-Modus',
    description:
      'Kurze, direkte Nachrichten. Fokus auf Output und Tempo. Ideal, wenn du viele Leads schnell bewegen willst.',
    icon: Zap,
    tagline: 'Max Output',
  },
  balanced: {
    title: 'Balanced',
    description:
      'Ausgewogene Mischung aus Effizienz und Beziehung. Standard-Einstellung für die meisten Vertriebler.',
    icon: Scale,
    tagline: 'Standard',
  },
  relationship: {
    title: 'Beziehungs-Modus',
    description:
      'Mehr Kontext, wärmerer Ton, stärkere Beziehungsebene. Ideal für High-Ticket-Deals und lang laufende Kundenbeziehungen.',
    icon: Heart,
    tagline: 'Beziehung',
  },
};

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function SalesAiSettingsPage() {
  const { loading, error, persona, setPersona } = useSalesPersona();

  const handleClick = async (key: PersonaKey) => {
    await setPersona(key);
  };

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 pb-24 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* Header */}
        {/* ───────────────────────────────────────────────────────────── */}

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">KI-Einstellungen</h1>
            <p className="text-sm text-slate-400">
              Bestimme, wie deine Sales-KI für dich spricht und priorisiert.
            </p>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Info Banner */}
        {/* ───────────────────────────────────────────────────────────── */}

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-400">
            💡 <strong>Deine Persona:</strong> Beeinflusst alle KI-Features – von Einwand-Antworten
            bis zur Task-Priorisierung. Wähle den Stil, der zu deinem Verkaufsansatz passt.
          </p>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Error State */}
        {/* ───────────────────────────────────────────────────────────── */}

        {error && (
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
        {/* Persona Selection */}
        {/* ───────────────────────────────────────────────────────────── */}

        <section>
          <h2 className="mb-4 text-lg font-bold text-slate-100">Sales-Modus</h2>
          
          {loading && (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
              <p className="text-sm text-slate-400">Lade deine aktuellen Einstellungen …</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {(['speed', 'balanced', 'relationship'] as const).map((key) => {
              const active = persona === key;
              const config = personaDescriptions[key];
              const Icon = config.icon;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleClick(key)}
                  className={`group flex flex-col items-start rounded-2xl border p-6 text-left transition ${
                    active
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-800/80'
                  }`}
                  disabled={loading}
                >
                  {/* Icon */}
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                      active
                        ? 'bg-emerald-500 text-slate-900'
                        : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Tagline */}
                  <span className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {config.tagline}
                  </span>

                  {/* Title */}
                  <span className="mb-2 text-base font-bold text-slate-100">
                    {config.title}
                  </span>

                  {/* Description */}
                  <span className="text-sm leading-relaxed text-slate-400">
                    {config.description}
                  </span>

                  {/* Active Badge */}
                  {active && (
                    <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-900">
                      ✓ Aktiv
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Explanation Section */}
        {/* ───────────────────────────────────────────────────────────── */}

        <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h3 className="mb-3 text-base font-bold text-slate-100">
            Wie wirkt sich deine Persona aus?
          </h3>
          <div className="space-y-3 text-sm text-slate-400">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                1
              </span>
              <div>
                <p className="font-medium text-slate-300">Objection Brain</p>
                <p className="text-xs">
                  Einwand-Antworten werden im gewählten Stil formuliert (kürzer bei Speed, wärmer bei Relationship).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                2
              </span>
              <div>
                <p className="font-medium text-slate-300">Next Best Actions</p>
                <p className="text-xs">
                  Task-Priorisierung passt sich an (Speed: mehr Aktivität, Relationship: mehr Qualität/Potenzial).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                3
              </span>
              <div>
                <p className="font-medium text-slate-300">Zukünftige Features</p>
                <p className="text-xs">
                  Chat-Assistent, Follow-up-Refinements und mehr werden deine Persona berücksichtigen.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

