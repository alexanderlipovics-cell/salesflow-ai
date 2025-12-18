import { useState } from "react";
import { CONTACT_PROSPECTS } from "../features/contacts/contactData";
import { FollowUpPanelDialog } from "../features/followups/FollowUpPanelDialog";

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

const summaryCards = [
  {
    label: "Aktive Interessenten",
    value: CONTACT_PROSPECTS.length,
    helper: "Signals innerhalb 24h",
  },
  {
    label: "Hot Leads",
    value: CONTACT_PROSPECTS.filter((lead) => lead.status === "hot").length,
    helper: "Score ≥ 85",
  },
  {
    label: "Speed-Hunter ready",
    value: CONTACT_PROSPECTS.filter((lead) => lead.stage === "Evaluation").length,
    helper: "Batch vorbereitet",
  },
];

const LeadsProspectsPage = () => {
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [followUpConfig, setFollowUpConfig] = useState(null);

  const handleOpenFollowUp = (lead) => {
    setFollowUpConfig(buildLeadFollowUpConfig(lead));
    setIsFollowUpOpen(true);
  };

  const handleCloseFollowUp = () => {
    setIsFollowUpOpen(false);
    setFollowUpConfig(null);
  };

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
                <th className="px-4 py-3 font-semibold text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {CONTACT_PROSPECTS.map((lead) => (
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
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenFollowUp(lead)}
                      className="rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500 hover:text-black"
                    >
                      Follow-up
                    </button>
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
            ? `Kontakt: ${followUpConfig.initialName}`
            : undefined
        }
        initialProps={followUpConfig ?? undefined}
      />
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

function buildLeadFollowUpConfig(lead) {
  const branchSource = lead.focus || lead.stage || lead.status;
  const initialBranch = mapVerticalToBranch(branchSource);
  const initialTone = inferLeadTone(lead.stage);
  const initialChannel = inferLeadChannel(lead.status, lead.stage);
  const contextParts = [];

  if (lead.lastSignal) {
    contextParts.push(`Letztes Signal: ${lead.lastSignal}`);
  }
  if (lead.nextAction) {
    contextParts.push(`Nächste Aktion: ${lead.nextAction}`);
  }
  if (lead.focus) {
    contextParts.push(`Play: ${lead.focus}`);
  }
  if (lead.city) {
    contextParts.push(`Region: ${lead.city}`);
  }

  return {
    initialName: lead.name,
    initialBranch,
    initialStage: "followup1",
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

function inferLeadTone(stage) {
  if (!stage || typeof stage !== "string") {
    return "du";
  }
  const normalized = stage.toLowerCase();
  if (normalized.includes("commit") || normalized.includes("pilot")) {
    return "sie";
  }
  return "du";
}

function inferLeadChannel(status, stage) {
  if (status === "cold" || (stage && stage.toLowerCase().includes("nurture"))) {
    return "email";
  }
  return "whatsapp";
}

export default LeadsProspectsPage;
