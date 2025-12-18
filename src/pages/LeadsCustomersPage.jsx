import { useEffect, useMemo, useState } from "react";
import { CONTACT_CUSTOMERS } from "../features/contacts/contactData";
import { FollowUpPanelDialog } from "../features/followups/FollowUpPanelDialog";
import { API_CONFIG } from "../services/apiConfig";
import { differenceInCalendarDays, parseISO } from "date-fns";

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const HEALTH_STYLES = {
  healthy: "bg-emerald-500/10 text-emerald-200 border-emerald-500/40",
  watch: "bg-yellow-500/10 text-yellow-200 border-yellow-500/40",
  risk: "bg-red-500/10 text-red-200 border-red-500/40",
};

const daysUntil = (dateLike) => {
  if (!dateLike) return Number.POSITIVE_INFINITY;
  const dt = typeof dateLike === "string" ? parseISO(dateLike) : new Date(dateLike);
  return differenceInCalendarDays(dt, new Date());
};

const summaryCards = [
  {
    label: "ARR verwaltet",
    value: CURRENCY_FORMATTER.format(
      CONTACT_CUSTOMERS.reduce((sum, customer) => sum + customer.arr, 0)
    ),
    helper: "Demo-Werte",
  },
  {
    label: "Renewals < 60 Tage",
    value: CONTACT_CUSTOMERS.filter(
      (customer) => daysUntil(customer.renewalAt) <= 60
    ).length,
    helper: "Aktion nötig",
  },
  {
    label: "Risk Accounts",
    value: CONTACT_CUSTOMERS.filter((customer) => customer.health === "risk").length,
    helper: "Phoenix Watchlist",
  },
];

const LeadsCustomersPage = () => {
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [followUpConfig, setFollowUpConfig] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleOpenFollowUp = (customer) => {
    setFollowUpConfig(buildCustomerFollowUpConfig(customer));
    setIsFollowUpOpen(true);
  };

  const handleCloseFollowUp = () => {
    setIsFollowUpOpen(false);
    setFollowUpConfig(null);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_CONFIG.baseUrl}/leads?customers=true`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const normalized = list.map((c) => ({
          id: c.id,
          name: c.name || "Unbekannt",
          company: c.company || "–",
          customer_since: c.customer_since,
          customer_value: c.customer_value ?? 0,
          orders_count: c.orders_count ?? 0,
          last_order_at: c.last_order_at,
          customer_type: c.customer_type || "kunde",
        }));
        setCustomers(normalized);
      } catch (err) {
        console.error("Kunden laden fehlgeschlagen", err);
        setError("Kunden konnten nicht geladen werden – zeige Demo-Daten.");
        setCustomers(
          CONTACT_CUSTOMERS.map((c) => ({
            id: c.id,
            name: c.name,
            company: c.segment,
            customer_since: c.renewalAt,
            customer_value: c.arr,
            orders_count: 0,
            last_order_at: c.renewalAt,
            customer_type: "kunde",
          }))
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const data = useMemo(() => customers, [customers]);

  return (
    <div className="space-y-8 text-white">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
          Pipeline
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold">Kunden</h1>
            <p className="mt-3 text-base text-gray-400">
              Bestandskunden-Übersicht (status = won). Health/ARR bleiben Demo,
              falls keine Live-Daten verfügbar sind.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/5 bg-gray-900/40 p-4"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500">{card.helper}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-white/5 bg-gray-950/70 p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-left text-sm text-gray-200">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 font-semibold">Health</th>
                <th className="px-4 py-3 font-semibold">Renewal</th>
                <th className="px-4 py-3 font-semibold">Expansion</th>
                <th className="px-4 py-3 font-semibold">ARR</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {data.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-t border-white/5 transition hover:bg-white/5"
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{customer.name}</p>
                    <p className="text-xs text-gray-400">{customer.company}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-emerald-200">
                      {customer.customer_type === "teampartner" ? "Teampartner" : "Kunde"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {customer.customer_since
                        ? `seit ${new Date(customer.customer_since).toLocaleDateString("de-DE")}`
                        : "seit unbekannt"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-100">
                      {customer.last_order_at
                        ? DATE_FORMATTER.format(Date.parse(customer.last_order_at))
                        : "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Bestellungen: {customer.orders_count ?? 0}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{CURRENCY_FORMATTER.format(customer.customer_value || 0)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenFollowUp(customer)}
                        className="rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500 hover:text-black"
                      >
                        Follow-up
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-700"
                      >
                        Kontaktieren
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200 transition hover:bg-amber-500 hover:text-black"
                      >
                        Upsell
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <FollowUpPanelDialog
        open={isFollowUpOpen}
        onClose={handleCloseFollowUp}
        subtitle={
          followUpConfig?.initialName
            ? `Konto: ${followUpConfig.initialName}`
            : undefined
        }
        initialProps={followUpConfig ?? undefined}
      />
    </div>
  );
};

function buildCustomerFollowUpConfig(customer) {
  const branchSource = customer.segment || customer.expansionPlay;
  const initialBranch = mapVerticalToBranch(branchSource);
  const initialTone = inferCustomerTone(customer.segment);
  const initialChannel = inferCustomerChannel(customer.health);
  const contextParts = [];

  if (customer.lastTouchpoint) {
    contextParts.push(`Letzter Kontakt: ${customer.lastTouchpoint}`);
  }
  if (customer.expansionPlay) {
    contextParts.push(`Expansion: ${customer.expansionPlay}`);
  }
  if (customer.adoption) {
    contextParts.push(`Adoption: ${customer.adoption}`);
  }
  if (typeof customer.arr === "number") {
    contextParts.push(`ARR: ${CURRENCY_FORMATTER.format(customer.arr)}`);
  }
  if (customer.city) {
    contextParts.push(`Standort: ${customer.city}`);
  }

  return {
    initialName: customer.name,
    initialBranch,
    initialStage: "followup2",
    initialChannel,
    initialTone,
    initialContext: contextParts.filter(Boolean).join(" • "),
  };
}

function mapVerticalToBranch(value) {
  if (!value || typeof value !== "string") {
    return "generic";
  }

  const normalized = value.toLowerCase();

  if (normalized.includes("network") || normalized.includes("zinzino")) {
    return "network_marketing";
  }
  if (normalized.includes("immo") || normalized.includes("estate")) {
    return "immo";
  }
  if (
    normalized.includes("finance") ||
    normalized.includes("finanz") ||
    normalized.includes("versicherung") ||
    normalized.includes("bank")
  ) {
    return "finance";
  }
  if (normalized.includes("coach") || normalized.includes("consult")) {
    return "coaching";
  }

  return "generic";
}

function inferCustomerTone(segment) {
  if (!segment || typeof segment !== "string") {
    return "du";
  }
  return segment.toLowerCase().includes("enterprise") ? "sie" : "du";
}

function inferCustomerChannel(health) {
  return health === "risk" ? "whatsapp" : "email";
}

export default LeadsCustomersPage;
