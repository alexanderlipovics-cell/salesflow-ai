import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const LEAD_HUNTER_ENDPOINT = "/api/leads/needs-action";
const DEFAULT_SOURCE = "lead_hunter" as const;
const skeletonItems = Array.from({ length: 3 });

export type LeadHunterLead = {
  id?: string | number | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  last_contact?: string | null;
  status?: string | null;
};

type LeadHunterTasksCardProps = {
  limit?: number;
};

type LeadHunterApiResponse = {
  leads?: LeadHunterLead[];
};

const LeadHunterTasksCard = ({ limit = 5 }: LeadHunterTasksCardProps) => {
  const [leads, setLeads] = useState<LeadHunterLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadLeads() {
      setLoading(true);
      setError(null);

      const safeLimit = Math.max(1, Math.min(limit, 10));
      const params = new URLSearchParams({
        source: DEFAULT_SOURCE,
        needs_action: "true",
        limit: String(safeLimit),
      });

      try {
        const response = await fetch(`${LEAD_HUNTER_ENDPOINT}?${params.toString()}`, {
          headers: {
            Accept: "application/json",
          },
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(
            detail || `Lead-Hunter Anfrage fehlgeschlagen (${response.status}).`
          );
        }

        const payload = (await response.json()) as LeadHunterApiResponse;
        const nextLeads = Array.isArray(payload?.leads) ? payload.leads : [];

        if (!active) {
          return;
        }

        setLeads(nextLeads);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        if (!active) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Lead-Hunter Aufgaben konnten nicht geladen werden.";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLeads();

    return () => {
      active = false;
      controller.abort();
    };
  }, [limit]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {skeletonItems.map((_, index) => (
            <div
              key={`lead-hunter-skeleton-${index}`}
              className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="h-4 w-1/3 rounded bg-slate-800" />
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-800" />
              <div className="mt-4 h-3 w-1/2 rounded bg-slate-800" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      );
    }

    if (!leads.length) {
      return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-300">
          Aktuell keine offenen Lead-Hunter Aufgaben 🎉
        </div>
      );
    }

    return (
      <ul className="space-y-3">
        {leads.map((lead, index) => {
          const displayName = lead.name?.trim() || "Unbekannter Kontakt";
          const company = lead.company?.trim() || "Ohne Firma";
          const statusLabel = lead.status?.trim() ?? "Status offen";
          const badge = getLeadBadge(lead.status);
          const contactChannel = formatContactChannel(lead);
          const lastTouch = formatLastContact(lead.last_contact);
          const key = String(lead.id ?? lead.email ?? `lead-${index}`);

          return (
            <li key={key}>
              <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-50">{displayName}</p>
                    <p className="text-sm text-slate-400">
                      {company}
                      {statusLabel ? ` · ${statusLabel}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badge.classes}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                  <span>{lastTouch}</span>
                  <span className="text-slate-500">{contactChannel}</span>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className="card-surface p-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Lead-Hunter Aufgaben
        </p>
        <h2 className="text-lg font-semibold text-slate-50">Neue Kontakte, die warten</h2>
        <p className="text-sm text-slate-400">
          Neue Kontakte aus dem Lead-Hunter, die deine Aufmerksamkeit brauchen.
        </p>
      </div>
      <div className="mt-5 space-y-4">
        {renderContent()}
        <div className="flex justify-end text-sm">
          <Link to="/leads/prospects" className="font-medium text-emerald-400 hover:text-emerald-300">
            Alle Leads anzeigen →
          </Link>
        </div>
      </div>
    </section>
  );
};

const formatLastContact = (timestamp?: string | null) => {
  if (!timestamp) {
    return "Letzter Kontakt unbekannt";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Letzter Kontakt unbekannt";
  }

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / 3_600_000));

  if (diffHours < 24) {
    return `Zuletzt vor ${diffHours}h`;
  }

  const diffDays = Math.max(1, Math.round(diffHours / 24));
  return `Zuletzt vor ${diffDays} ${diffDays === 1 ? "Tag" : "Tagen"}`;
};

const getLeadBadge = (status?: string | null) => {
  const normalized = status?.trim().toLowerCase();

  if (normalized && ["neu", "new", "unqualifiziert"].includes(normalized)) {
    return {
      label: "Neu",
      classes: "border-slate-700 bg-slate-900/60 text-slate-200",
    };
  }

  return {
    label: "Follow-up fällig",
    classes: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  };
};

const formatContactChannel = (lead: LeadHunterLead) => {
  if (lead.phone) {
    return lead.phone;
  }
  if (lead.email) {
    return lead.email;
  }
  return "Kein Kontaktkanal hinterlegt";
};

export default LeadHunterTasksCard;
