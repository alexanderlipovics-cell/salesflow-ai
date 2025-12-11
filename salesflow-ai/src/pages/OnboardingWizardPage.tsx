import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Network, Home, Shield, Building, Target, Briefcase } from "lucide-react";
import { useSalesPersona } from "@/hooks/useSalesPersona";
import { useCompanyKnowledge } from "@/hooks/useCompanyKnowledge";
import { useAuth } from "@/context/AuthContext";
import { supabaseClient } from "@/lib/supabaseClient";

// Migration Note: Add vertical column to profiles table
// Run in Supabase SQL Editor:
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vertical TEXT DEFAULT 'other';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type OnboardingStep = 1 | 2 | 3 | 4;
type VerticalChoice = "network" | "real_estate" | "finance" | "b2b" | "coaching" | "other";
type TeamSizeChoice = "solo" | "small" | "medium" | "large";

// ─────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────

const verticalOptions: { key: VerticalChoice; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: "network",
    label: "Network Marketing / MLM",
    description: "Teams, Strukturen, Provisionen, Downline Management",
    icon: <Network className="w-6 h-6" />,
  },
  {
    key: "real_estate",
    label: "Immobilien",
    description: "Makler, Leads, Exposés, Besichtigungen",
    icon: <Home className="w-6 h-6" />,
  },
  {
    key: "finance",
    label: "Versicherung & Finanzen",
    description: "Kunden, Verträge, Beratung, Bestandspflege",
    icon: <Shield className="w-6 h-6" />,
  },
  {
    key: "b2b",
    label: "B2B Sales",
    description: "Firmenkunden, Deals, Proposals, CRM",
    icon: <Building className="w-6 h-6" />,
  },
  {
    key: "coaching",
    label: "Coaching & Beratung",
    description: "Klienten, Sessions, Programme, Follow-ups",
    icon: <Target className="w-6 h-6" />,
  },
  {
    key: "other",
    label: "Sonstiger Vertrieb",
    description: "Flexibles CRM für alle Vertriebsarten",
    icon: <Briefcase className="w-6 h-6" />,
  },
];

const teamSizeOptions: { key: TeamSizeChoice; label: string; description: string }[] = [
  { key: "solo", label: "Solo", description: "Du allein oder 1–2 Personen." },
  { key: "small", label: "Kleines Team (3–10)", description: "Kleines Team mit klaren Rollen." },
  { key: "medium", label: "Team (10–30)", description: "Vertriebsteam mit mehreren Rollen." },
  { key: "large", label: "Großes Team (30+)", description: "Skalierte Organisation, mehrere Leader." },
];

const personaDescriptions: Record<
  "speed" | "balanced" | "relationship",
  { title: string; description: string }
> = {
  speed: {
    title: "Speed-Modus",
    description: "Kurz, direkt, hohes Tempo. Ideal bei vielen Leads.",
  },
  balanced: {
    title: "Balanced",
    description: "Mischung aus Effizienz & Beziehung. Standard.",
  },
  relationship: {
    title: "Beziehungs-Modus",
    description: "Mehr Wärme & Kontext. Ideal für High-Ticket & Bestandskunden.",
  },
};

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

const OnboardingWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<OnboardingStep>(1);

  // Only load hooks after authentication is ready
  const { loading: personaLoading, error: personaError, persona, setPersona } = useSalesPersona();
  const {
    saving: knowledgeSaving,
    error: knowledgeError,
    knowledge,
    save: saveKnowledge,
  } = useCompanyKnowledge();

  const [vertical, setVertical] = useState<VerticalChoice>("other");
  const [teamSize, setTeamSize] = useState<TeamSizeChoice>("solo");

  const [companyName, setCompanyName] = useState("");
  const [flagshipOffer, setFlagshipOffer] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "pro">("beginner");
  const [monthlyGoal, setMonthlyGoal] = useState<number>(5);

  // Knowledge-Werte initial übernehmen, falls vorhanden
  useEffect(() => {
    if (knowledge) {
      setCompanyName(knowledge.company_name ?? "");
      setTargetAudience(knowledge.target_audience ?? "");
      // Flagship Offer aus products ableiten, falls vorhanden
      if (knowledge.products && !flagshipOffer) {
        setFlagshipOffer(knowledge.products);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledge]);

  const totalSteps: OnboardingStep = 4;

  // Wait for authentication to be ready
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 px-4 py-8 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-slate-400">Authentifizierung wird überprüft...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    navigate("/login");
    return null;
  }

  const handleNext = async () => {
    // Step-spezifische Saves
    if (step === 3) {
      // Basis-Company-Wissen speichern
      try {
        await saveKnowledge({
          company_name: companyName || knowledge?.company_name || null,
          target_audience: targetAudience || knowledge?.target_audience || null,
          products: flagshipOffer || knowledge?.products || null,
          experience_level: experienceLevel,
          monthly_goal: monthlyGoal ?? null,
        });
      } catch (err) {
        // Fehler wird im Hook gehandhabt, hier nur abfangen
        return;
      }
    }

    if (step < totalSteps) {
      setStep((prev) => (prev + 1) as OnboardingStep);
    } else {
      // Fertig → Vertical in Profile speichern, dann Weiterleitung
      try {
        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;

        const { error } = await supabaseClient
          .from('users')
          .update({
            vertical: vertical,
            company_name: companyName || null,
            experience_level: experienceLevel,
            monthly_goal: monthlyGoal ?? null,
            onboarding_complete: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId || user.id);

        if (error) {
          console.warn('Fehler beim Speichern der Vertical:', error);
        }
      } catch (err) {
        console.warn('Fehler beim Speichern der Vertical:', err);
      }

      navigate("/dashboard");
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

  const StepIndicator = () => (
    <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const current = (i + 1) as OnboardingStep;
        const active = current === step;
        const done = current < step;
        return (
          <div key={current} className="flex items-center gap-1">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition ${
                active
                  ? "bg-emerald-500 text-slate-900"
                  : done
                  ? "bg-emerald-500/40 text-emerald-50"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {done ? <Check className="h-3 w-3" /> : current}
            </div>
            {current < totalSteps && (
              <div className="h-px w-6 bg-slate-700" />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStepTitle = () => {
    switch (step) {
      case 1:
        return "Setup: Branche & Teamgröße";
      case 2:
        return "Wie soll deine KI verkaufen?";
      case 3:
        return "Grundlagen deines Angebots";
      case 4:
        return "Letzter Schritt: Starte in den Alltag";
      default:
        return "";
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">
              Welche Branche passt am besten?
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {verticalOptions.map((opt) => {
                const active = vertical === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setVertical(opt.key)}
                    className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-100">
                      {opt.label}
                    </span>
                    <span className="mt-1 text-xs text-slate-400">
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">
              Wie groß ist dein Vertrieb aktuell?
            </p>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {teamSizeOptions.map((opt) => {
                const active = teamSize === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTeamSize(opt.key)}
                    className={`flex flex-col items-start rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-xs font-semibold text-slate-100">
                      {opt.label}
                    </span>
                    <span className="mt-1 text-[11px] text-slate-400">
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Wähle, wie deine KI standardmäßig für dich spricht & priorisiert.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {(["speed", "balanced", "relationship"] as const).map((key) => {
              const active = persona === key;
              const config = personaDescriptions[key];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPersona(key)}
                  className={`flex flex-col items-start rounded-xl border px-4 py-4 text-left transition ${
                    active
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                  disabled={personaLoading}
                >
                  <span className="mb-1 text-xs uppercase tracking-wider text-slate-500">
                    {key === "speed"
                      ? "Max Output"
                      : key === "relationship"
                      ? "Beziehung"
                      : "Standard"}
                  </span>
                  <span className="text-sm font-semibold text-slate-100">
                    {config.title}
                  </span>
                  <span className="mt-1 text-xs text-slate-400">
                    {config.description}
                  </span>
                  {active && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-slate-900">
                      <Check className="h-3 w-3" />
                      Aktiv
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Kurz & knapp – genug, damit die KI weiß, für wen und was sie verkauft.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Firmenname / Brand
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="z.B. Sales Flow AI GmbH"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Dein Hauptangebot (Flagship Offer)
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              rows={3}
              value={flagshipOffer}
              onChange={(e) => setFlagshipOffer(e.target.value)}
              placeholder="z.B. KI-Vertriebsplattform für Network-, Immo- und Finance-Teams..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Zielkunden (kurz beschreiben)
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              rows={3}
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="z.B. Teamleiter mit 10–50 Vertrieblern, die Follow-ups und Leads besser nutzen wollen."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Erfahrungslevel
              </label>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as any)}
              >
                <option value="beginner">Anfänger</option>
                <option value="intermediate">Fortgeschritten</option>
                <option value="pro">Profi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Monatliches Ziel (Abschlüsse)
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(Number(e.target.value) || 0)}
                placeholder="z.B. 10"
              />
            </div>
          </div>
        </div>
      );
    }

    // Step 4
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Du bist startklar! 🎉 Nächste Schritte – such dir aus, womit du beginnen willst:
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate("/import")}
            className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-4 text-left transition hover:border-slate-600 hover:bg-slate-800"
          >
            <span className="text-sm font-semibold text-slate-100">Bestandskunden importieren</span>
            <span className="mt-2 text-xs text-slate-400">
              Lade eine Liste mit deinen bestehenden Kontakten hoch und lass die KI sie für Follow-ups vorbereiten.
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/daily-command")}
            className="flex flex-col items-start rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-left transition hover:border-emerald-500/50 hover:bg-emerald-500/15"
          >
            <span className="text-sm font-semibold text-emerald-400">Daily Command öffnen</span>
            <span className="mt-2 text-xs text-slate-400">
              Starte mit deiner Power-Hour-Liste – konzentrierter Output in 60 Minuten.
            </span>
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
              <Sparkles className="h-3 w-3" />
              Empfohlen
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/hunter")}
            className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-4 text-left transition hover:border-slate-600 hover:bg-slate-800"
          >
            <span className="text-sm font-semibold text-slate-100">Hunter Board</span>
            <span className="mt-2 text-xs text-slate-400">
              Sieh deine heutigen Leads & Aufgaben auf einen Blick und arbeite sie strukturiert ab.
            </span>
          </button>
        </div>
      </div>
    );
  };

  const isNextDisabled =
    (step === 2 && personaLoading) || (step === 3 && knowledgeSaving);

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-3xl">
        {/* Header Card */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Onboarding</p>
              <h1 className="mt-1 text-xl font-bold text-slate-100">{renderStepTitle()}</h1>
            </div>
            <span className="text-xs text-slate-500">
              Schritt {step} von {totalSteps}
            </span>
          </div>

          <StepIndicator />

          {/* Error Display */}
          {(personaError || knowledgeError) && (
            <div className="mt-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10">
              <p className="text-sm text-red-400">
                {personaError || knowledgeError}
              </p>
            </div>
          )}

          <div className="mt-6">{renderStepContent()}</div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={isNextDisabled}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isNextDisabled ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : step === totalSteps ? (
                <>
                  Los geht's! 🚀
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Weiter
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Du kannst alle Einstellungen jederzeit in den Settings anpassen.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizardPage;

