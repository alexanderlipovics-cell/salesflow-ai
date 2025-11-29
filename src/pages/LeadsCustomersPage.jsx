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

const CUSTOMERS = [
  {
    id: "cust-flowmatic",
    name: "Flowmatic AG",
    segment: "Enterprise",
    arr: 126000,
    health: "healthy",
    renewalAt: addDays(32),
    expansionPlay: "AI Seat Upgrade",
    successOwner: "Lara",
    adoption: "82% Seats live",
    lastTouchpoint: "QBR vor 6 Tagen",
  },
  {
    id: "cust-nexonic",
    name: "Nexonic GmbH",
    segment: "Mid-Market",
    arr: 78000,
    health: "watch",
    renewalAt: addDays(58),
    expansionPlay: "RevOps Automation",
    successOwner: "Noah",
    adoption: "2 Playbooks offen",
    lastTouchpoint: "Phoenix Loop gestartet",
  },
  {
    id: "cust-helix",
    name: "Helix Cloud",
    segment: "Enterprise",
    arr: 189000,
    health: "healthy",
    renewalAt: addDays(90),
    expansionPlay: "Speed-Hunter Seats",
    successOwner: "Mira",
    adoption: "95% Usage",
    lastTouchpoint: "Exec Slack Channel",
  },
  {
    id: "cust-volt",
    name: "Voltra Labs",
    segment: "Scale-up",
    arr: 52000,
    health: "risk",
    renewalAt: addDays(21),
    expansionPlay: "Daily Command Coaching",
    successOwner: "Finn",
    adoption: "3 blocked Accounts",
    lastTouchpoint: "Risk Alert · heute",
  },
  {
    id: "cust-aster",
    name: "Aster Mobility",
    segment: "Scale-up",
    arr: 94000,
    health: "healthy",
    renewalAt: addDays(47),
    expansionPlay: "Success Seats",
    successOwner: "Aya",
    adoption: "78% Signals beantwortet",
    lastTouchpoint: "In-App NPS 9",
  },
];

function addDays(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

const summaryCards = [
  {
    label: "ARR verwaltet",
    value: CURRENCY_FORMATTER.format(
      CUSTOMERS.reduce((sum, customer) => sum + customer.arr, 0)
    ),
    helper: "Demo-Werte",
  },
  {
    label: "Renewals < 60 Tage",
    value: CUSTOMERS.filter(
      (customer) => daysUntil(customer.renewalAt) <= 60
    ).length,
    helper: "Aktion nötig",
  },
  {
    label: "Risk Accounts",
    value: CUSTOMERS.filter((customer) => customer.health === "risk").length,
    helper: "Phoenix Watchlist",
  },
];

const LeadsCustomersPage = () => {
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
              Health Scores, Renewals und Upsell-Plays – alles als Mock-Daten
              für die Demo.
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
              </tr>
            </thead>
            <tbody>
              {CUSTOMERS.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-t border-white/5 transition hover:bg-white/5"
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{customer.name}</p>
                    <p className="text-xs text-gray-400">{customer.segment}</p>
                    <p className="text-xs text-gray-500">
                      {customer.lastTouchpoint}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${HEALTH_STYLES[customer.health]}`}
                    >
                      {formatHealth(customer.health)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p>{DATE_FORMATTER.format(Date.parse(customer.renewalAt))}</p>
                    <p className="text-xs text-gray-500">
                      in {daysUntil(customer.renewalAt)} Tagen
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{customer.expansionPlay}</p>
                    <p className="text-xs text-gray-500">{customer.adoption}</p>
                  </td>
                  <td className="px-4 py-4">
                    {CURRENCY_FORMATTER.format(customer.arr)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-white">
                      {customer.successOwner}
                    </div>
                    <p className="text-xs text-gray-500">Customer Success</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

function formatHealth(value) {
  if (value === "healthy") return "Healthy";
  if (value === "watch") return "Watch";
  return "Risk";
}

function daysUntil(value) {
  const target = Date.parse(value);
  if (Number.isNaN(target)) {
    return 0;
  }
  return Math.max(0, Math.round((target - Date.now()) / 86_400_000));
}

export default LeadsCustomersPage;
