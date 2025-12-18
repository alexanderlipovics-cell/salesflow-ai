/**
 * Strategy Setup Modal - 4-Schritt Onboarding Wizard
 * 
 * Sammelt Business-Profile und Monatsziel vom User
 */

import React, { useState } from "react";
import { X, Users, Home, TrendingUp, Briefcase, ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import type { IndustryType } from "@/hooks/useGoalEngine";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface StrategySetupModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (profile: ProfileData, goal: GoalData) => void;
}

export type ProfileData = {
  industry: IndustryType;
  product_name: string;
  commission_per_deal: number;
  sales_cycle_days: number;
};

export type GoalData = {
  target_revenue: number;
  target_deals: number;
};

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export const StrategySetupModal: React.FC<StrategySetupModalProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState(1);
  
  // Form Data
  const [industry, setIndustry] = useState<IndustryType | null>(null);
  const [productName, setProductName] = useState("");
  const [commission, setCommission] = useState("");
  const [salesCycle, setSalesCycle] = useState(14); // Tage
  const [goalType, setGoalType] = useState<"revenue" | "deals">("revenue");
  const [targetRevenue, setTargetRevenue] = useState("");
  const [targetDeals, setTargetDeals] = useState("");

  if (!open) return null;

  // Branchen-Optionen
  const industries = [
    {
      value: "network" as IndustryType,
      label: "Network Marketing",
      icon: Users,
      color: "emerald",
      example: "Typische Provision: 50-200€, Verkaufsdauer: 1-4 Wochen",
    },
    {
      value: "real_estate" as IndustryType,
      label: "Immobilien",
      icon: Home,
      color: "blue",
      example: "Typische Provision: 2.000-10.000€, Verkaufsdauer: 1-3 Monate",
    },
    {
      value: "finance" as IndustryType,
      label: "Finance",
      icon: TrendingUp,
      color: "purple",
      example: "Typische Provision: 100-1.000€, Verkaufsdauer: 2-8 Wochen",
    },
    {
      value: "coaching" as IndustryType,
      label: "Anderes",
      icon: Briefcase,
      color: "amber",
      example: "Z.B. Coaching, Beratung, Software",
    },
  ];

  // Sales Cycle Optionen
  const salesCycleOptions = [
    { days: 7, label: "1 Woche" },
    { days: 14, label: "2 Wochen" },
    { days: 30, label: "1 Monat" },
    { days: 75, label: "2-3 Monate" },
  ];

  // Berechnungen
  const calculateRequirements = () => {
    const commissionNum = parseFloat(commission) || 0;
    const revenueNum = parseFloat(targetRevenue) || 0;
    const dealsNum = parseInt(targetDeals) || 0;

    let finalDeals = 0;
    let finalRevenue = 0;

    if (goalType === "revenue") {
      finalRevenue = revenueNum;
      finalDeals = commissionNum > 0 ? Math.ceil(revenueNum / commissionNum) : 0;
    } else {
      finalDeals = dealsNum;
      finalRevenue = dealsNum * commissionNum;
    }

    // Grobe Berechnung: 20% Conversion Rate angenommen
    const neededContacts = Math.ceil(finalDeals / 0.2);
    const daysInMonth = 22; // Arbeitstage
    const contactsPerDay = Math.ceil(neededContacts / daysInMonth);

    return { finalDeals, finalRevenue, neededContacts, contactsPerDay };
  };

  const requirements = calculateRequirements();

  // Validation
  const canProceedStep1 = industry !== null;
  const canProceedStep2 = productName.trim() !== "" && parseFloat(commission) > 0;
  const canProceedStep3 =
    (goalType === "revenue" && parseFloat(targetRevenue) > 0) ||
    (goalType === "deals" && parseInt(targetDeals) > 0);

  const handleComplete = () => {
    console.log('StrategySetupModal: handleComplete called');
    console.log('- industry:', industry);
    console.log('- productName:', productName);
    console.log('- commission:', commission);
    console.log('- salesCycle:', salesCycle);
    console.log('- requirements:', requirements);

    const profileData: ProfileData = {
      industry: industry!,
      product_name: productName.trim(),
      commission_per_deal: parseFloat(commission),
      sales_cycle_days: salesCycle,
    };

    const goalData: GoalData = {
      target_revenue: requirements.finalRevenue,
      target_deals: requirements.finalDeals,
    };

    console.log('StrategySetupModal: Calling onComplete with:', { profileData, goalData });

    onComplete(profileData, goalData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress */}
        <div className="flex gap-1 p-6 pb-0">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition ${
                s <= step ? "bg-emerald-500" : "bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1 - Branche */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100">In welcher Branche bist du tätig?</h2>
              <p className="mt-2 text-sm text-slate-400">
                Wir passen deine Zielsetzung an typische Werte deiner Branche an.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {industries.map((ind) => {
                  const Icon = ind.icon;
                  const isSelected = industry === ind.value;
                  return (
                    <button
                      key={ind.value}
                      onClick={() => setIndustry(ind.value)}
                      className={`flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                        isSelected
                          ? `border-${ind.color}-500 bg-${ind.color}-500/10`
                          : "border-slate-700 bg-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-${ind.color}-500/20`}>
                        <Icon className={`h-6 w-6 text-${ind.color}-400`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">{ind.label}</p>
                        <p className="mt-1 text-xs text-slate-400">{ind.example}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2 - Produkt */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Was verkaufst du?</h2>
              <p className="mt-2 text-sm text-slate-400">
                Wir nutzen diese Infos, um realistische Tagesziele zu berechnen.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Produkt / Dienstleistung
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="z.B. Zinzino Balance Oil, Immobilienvermittlung, ..."
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Was verdienst du pro Abschluss? (Euro)
                  </label>
                  <input
                    type="number"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="z.B. 150"
                    min="0"
                    step="10"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Typische Verkaufsdauer
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {salesCycleOptions.map((option) => (
                      <button
                        key={option.days}
                        onClick={() => setSalesCycle(option.days)}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          salesCycle === option.days
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 - Monatsziel */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Was ist dein Ziel für diesen Monat?</h2>
              <p className="mt-2 text-sm text-slate-400">
                Wir rechnen für dich aus, wie viele Kontakte du täglich brauchst.
              </p>

              <div className="mt-6 space-y-4">
                {/* Toggle */}
                <div className="flex gap-2 rounded-lg bg-slate-800 p-1">
                  <button
                    onClick={() => setGoalType("revenue")}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                      goalType === "revenue"
                        ? "bg-emerald-500 text-slate-900"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Nach Umsatz
                  </button>
                  <button
                    onClick={() => setGoalType("deals")}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                      goalType === "deals"
                        ? "bg-emerald-500 text-slate-900"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Nach Abschlüssen
                  </button>
                </div>

                {/* Input */}
                {goalType === "revenue" ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Dein Umsatzziel (Euro)
                    </label>
                    <input
                      type="number"
                      value={targetRevenue}
                      onChange={(e) => setTargetRevenue(e.target.value)}
                      placeholder="z.B. 5000"
                      min="0"
                      step="100"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Anzahl Abschlüsse
                    </label>
                    <input
                      type="number"
                      value={targetDeals}
                      onChange={(e) => setTargetDeals(e.target.value)}
                      placeholder="z.B. 10"
                      min="0"
                      step="1"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Live Berechnung */}
                {requirements.finalDeals > 0 && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-sm font-medium text-emerald-400">Das bedeutet für dich:</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-300">
                      <p>• {requirements.finalDeals} Abschlüsse nötig</p>
                      <p>• ~{requirements.neededContacts} Kontakte insgesamt</p>
                      <p>• ~{requirements.contactsPerDay} Kontakte pro Tag</p>
                    </div>
                    <p className="mt-3 text-xs text-emerald-300/80">
                      Diese Zahlen basieren auf Branchendurchschnitten (20% Conversion Rate)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4 - Bestätigung */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Alles klar! Lass uns starten.</h2>
              <p className="mt-2 text-sm text-slate-400">
                Überprüfe deine Eingaben und starte dann deinen Plan.
              </p>

              <div className="mt-6 space-y-4">
                {/* Summary Card */}
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="font-semibold text-slate-100">Dein Setup</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Branche:</span>
                      <span className="text-slate-200">
                        {industries.find((i) => i.value === industry)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Produkt:</span>
                      <span className="text-slate-200">{productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Provision:</span>
                      <span className="text-slate-200">{commission} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Verkaufsdauer:</span>
                      <span className="text-slate-200">
                        {salesCycleOptions.find((s) => s.days === salesCycle)?.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 p-5">
                  <h3 className="font-semibold text-emerald-400">Dein Monatsziel</h3>
                  <p className="mt-2 text-3xl font-bold text-slate-100">
                    {requirements.finalRevenue.toLocaleString("de-DE")} €
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-slate-300">
                    <p>• {requirements.finalDeals} Abschlüsse</p>
                    <p>• ~{requirements.contactsPerDay} Kontakte pro Tag</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Zurück
              </button>
            )}

            <div className="flex-1" />

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 px-6 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-green-400"
              >
                <Rocket className="h-4 w-4" />
                Los gehts - Plan starten!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

