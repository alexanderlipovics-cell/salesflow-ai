import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";
import { useUser } from "../context/UserContext";
import { usePricingModal } from "../context/PricingModalContext";
import { createPortalSession } from "../lib/stripeClient";
import FeatureGateButton from "../components/FeatureGateButton";
import { formatCurrency, getBillingPrice } from "../lib/plans";

const SettingsPage = () => {
  const location = useLocation();
  const user = useUser();
  const { plan, status, interval, nextCharge, limits, refresh, loading } =
    useSubscription();
  const { openPricing } = usePricingModal();

  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location.search.includes("success=true")) {
      setMessage("Zahlung erfolgreich! Dein Plan ist jetzt aktiv.");
      refresh();
    }
  }, [location.search, refresh]);

  const statusBadge = useMemo(() => mapStatus(status), [status]);
  const nextChargeDate = nextCharge ? new Date(nextCharge) : null;
  const pricePerInterval = formatCurrency(getBillingPrice(plan, interval));

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const { portalUrl } = await createPortalSession({ userId: user.id });
      if (portalUrl) {
        window.location.assign(portalUrl);
      }
    } catch (portalError) {
      console.error(portalError);
      setError(portalError.message || "Portal konnte nicht geöffnet werden.");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-white">
      {message && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="glass-panel p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              Abonnement
            </p>
            <h2 className="text-3xl font-semibold">Dein SalesFlow Plan</h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </header>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
            <p className="text-sm text-gray-400">Aktiver Plan</p>
            <p className="mt-2 text-2xl font-semibold uppercase">{plan}</p>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-400">
              <SpanPill icon={<CreditCard className="h-4 w-4" />}>
                {pricePerInterval} / {interval === "year" ? "Jahr" : "Monat"}
              </SpanPill>
              <SpanPill icon={<ShieldCheck className="h-4 w-4" />}>
                Nächste Abbuchung{" "}
                {nextChargeDate
                  ? nextChargeDate.toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "–"}
              </SpanPill>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => openPricing()}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white hover:border-salesflow-accent/40"
              >
                Plan ändern
              </button>
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong px-4 py-2 text-sm font-semibold text-black shadow-glow hover:scale-[1.01]"
              >
                {portalLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Öffne Portal ...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Abo verwalten
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm text-gray-300">
            <p className="font-semibold text-white">Limits</p>
            <ul className="mt-4 space-y-3">
              <LimitLine label="Leads" value={formatLimit(limits.maxLeads)} />
              <LimitLine
                label="KI-Anfragen"
                value={formatLimit(limits.maxAiRequests)}
              />
              <LimitLine
                label="Team-Mitglieder"
                value={formatLimit(limits.maxTeamMembers)}
              />
            </ul>
          </div>
        </div>
      </section>

      <section className="glass-panel p-6">
        <h3 className="text-xl font-semibold">Feature-Verfügbarkeit</h3>
        <p className="mt-2 text-sm text-gray-400">
          Gesperrte Features sind mit einem Schloss markiert. Klick für Details
          zum Upgrade-Pfad.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <FeatureGateButton
            featureKey="email"
            label="E-Mail Playbooks"
            description="Vorlagenbibliothek und KI-Optimierung"
          />
          <FeatureGateButton
            featureKey="whatsapp"
            label="WhatsApp Outreach"
            description="Native WhatsApp Sequences"
          />
          <FeatureGateButton
            featureKey="sequences"
            label="Sequenzen"
            description="Multi-Touch Cadence Builder"
          />
          <FeatureGateButton
            featureKey="webhooks"
            label="Webhooks & API Access"
            description="Realtime Events & Integrationen"
          />
          <FeatureGateButton
            featureKey="whiteLabel"
            label="White-Label"
            description="Eigenes Branding & Domains"
          />
          <FeatureGateButton
            featureKey="prioritySupport"
            label="Priority Support"
            description="SLAs & persönlicher CSM"
          />
        </div>
      </section>
    </div>
  );
};

const mapStatus = (status) => {
  switch (status) {
    case "active":
      return { label: "Aktiv", className: "bg-emerald-500/20 text-emerald-200" };
    case "canceled":
      return { label: "Gekündigt", className: "bg-gray-500/20 text-gray-200" };
    case "past_due":
    case "overdue":
      return { label: "Überfällig", className: "bg-red-500/20 text-red-200" };
    default:
      return { label: "Unbekannt", className: "bg-white/10 text-white" };
  }
};

const SpanPill = ({ icon, children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
    {icon}
    {children}
  </span>
);

const LimitLine = ({ label, value }) => (
  <li className="flex items-center justify-between border-b border-white/5 pb-2 last:border-none">
    <span>{label}</span>
    <span className="font-semibold text-white">{value}</span>
  </li>
);

const formatLimit = (value) => {
  if (!Number.isFinite(value)) return "Unlimitiert";
  return value.toLocaleString("de-DE");
};

export default SettingsPage;
