const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_STYLES = {
  hot: "bg-red-500/10 text-red-200 border-red-500/40",
  warm: "bg-orange-500/10 text-orange-200 border-orange-500/40",
  cold: "bg-blue-500/10 text-blue-200 border-blue-500/40",
  nurture: "bg-purple-500/10 text-purple-200 border-purple-500/40",
  neu: "bg-gray-800/80 text-gray-200 border-white/5",
};

const PROSPECTS = [
  {
    id: "prospect-nexonic",
    name: "Lena Hartmann",
    title: "RevOps Lead",
    company: "Nexonic GmbH",
    status: "hot",
    stage: "Evaluation",
    owner: "Jonas",
    lastSignal: "WhatsApp Reply · 08:41",
    nextAction: "Executive Recap finalisieren",
    nextActionAt: addDays(0, 16),
    dealValue: 54000,
    focus: "Speed-Hunter Batch",
  },
  {
    id: "prospect-helix",
    name: "Marco Di Luca",
    title: "COO",
    company: "Helix Cloud",
    status: "warm",
    stage: "Pilot",
    owner: "Aya",
    lastSignal: "Demo Recording geteilt",
    nextAction: "DSGVO Check abschließen",
    nextActionAt: addDays(1, 10),
    dealValue: 32000,
    focus: "Security Review",
  },
  {
    id: "prospect-altair",
    name: "Sara Nguyen",
    title: "VP Sales",
    company: "Altair Systems",
    status: "hot",
    stage: "Commit",
    owner: "Mira",
    lastSignal: "Champion pingte Slack",
    nextAction: "Executive Alignment Call",
    nextActionAt: addDays(2, 9),
    dealValue: 86000,
    focus: "Multi-Threading",
  },
  {
    id: "prospect-volt",
    name: "Elisa Vogt",
    title: "Growth Lead",
    company: "Voltra Labs",
    status: "warm",
    stage: "Discovery",
    owner: "Finn",
    lastSignal: "Website Spike erkannt",
    nextAction: "Pilot KPIs einsammeln",
    nextActionAt: addDays(3, 11),
    dealValue: 41000,
    focus: "Product Qualified Lead",
  },
  {
    id: "prospect-zenloop",
    name: "Jan Novak",
    title: "Sales Director",
    company: "Zenloop Analytics",
    status: "cold",
    stage: "Nurture",
    owner: "Lena",
    lastSignal: "LinkedIn Besuch · gestern",
    nextAction: "Intro Call bestätigen",
    nextActionAt: addDays(4, 14),
    dealValue: 15000,
    focus: "Phoenix Follow-up",
  },
];

function addDays(daysFromNow, hour) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

const summaryCards = [
  {
    label: "Aktive Interessenten",
    value: PROSPECTS.length,
    helper: "Signals innerhalb 24h",
  },
  {
    label: "Hot Leads",
    value: PROSPECTS.filter((lead) => lead.status === "hot").length,
    helper: "Score ≥ 85",
  },
  {
    label: "Speed-Hunter ready",
    value: PROSPECTS.filter((lead) => lead.stage === "Evaluation").length,
    helper: "Batch vorbereitet",
  },
];

const LeadsProspectsPage = () => {
  return (
    <div className="space-y-8 text-white">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
          Pipeline
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold">Interessenten</h1>
            <p className="mt-3 text-base text-gray-400">
              Echtzeit-Liste aus Demo-Leads. Ideal für Walkthroughs ohne
              Supabase-Anbindung.
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
                <th className="px-4 py-3 font-semibold">Lead</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Letztes Signal</th>
                <th className="px-4 py-3 font-semibold">Nächste Aktion</th>
                <th className="px-4 py-3 font-semibold">Deal Value</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
              </tr>
            </thead>
            <tbody>
              {PROSPECTS.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-t border-white/5 transition hover:bg-white/5"
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-white">{lead.name}</p>
                    <p className="text-xs text-gray-400">
                      {lead.title} · {lead.company}
                    </p>
                    <p className="text-xs text-gray-500">{lead.focus}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[lead.status] ?? STATUS_STYLES.neu}`}
                    >
                      {lead.status.toUpperCase()} · {lead.stage}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-white">{lead.lastSignal}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{lead.nextAction}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(lead.nextActionAt)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {CURRENCY_FORMATTER.format(lead.dealValue)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-white">
                      {lead.owner}
                    </div>
                    <p className="text-xs text-gray-500">Daily Command</p>
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

function formatDate(value) {
  if (!value) {
    return "—";
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "—";
  }
  return DATE_FORMATTER.format(timestamp);
}

export default LeadsProspectsPage;
