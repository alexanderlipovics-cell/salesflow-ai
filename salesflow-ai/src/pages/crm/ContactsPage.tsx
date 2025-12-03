import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ContactListItem,
  ContactStatus,
  ContactsResponse,
  fetchContacts,
} from "@/api/crm";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ label: string; value?: ContactStatus }> = [
  { label: "Alle Status", value: undefined },
  { label: "Lead", value: "lead" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Proposal", value: "proposal" },
  { label: "Negotiation", value: "negotiation" },
  { label: "Customer", value: "customer" },
  { label: "Nurture", value: "nurture" },
  { label: "Lost", value: "lost" },
];

const STATUS_COLORS: Record<ContactStatus, string> = {
  lead: "bg-blue-500/15 text-blue-400",
  contacted: "bg-sky-500/15 text-sky-400",
  qualified: "bg-emerald-500/15 text-emerald-400",
  proposal: "bg-violet-500/15 text-violet-400",
  negotiation: "bg-orange-500/15 text-orange-400",
  customer: "bg-lime-500/15 text-lime-400",
  lost: "bg-rose-500/15 text-rose-400",
  inactive: "bg-gray-500/15 text-gray-400",
  nurture: "bg-teal-500/15 text-teal-400",
};

const PAGE_SIZE = 25;

const ContactsPage = () => {
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [meta, setMeta] = useState<ContactsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchContacts({
      page,
      perPage: PAGE_SIZE,
      search: search.trim() || undefined,
      status: statusFilter ? [statusFilter] : undefined,
    })
      .then((response) => {
        setContacts(response.items);
        setMeta(response);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message ?? "Unbekannter Fehler");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [page, search, statusFilter]);

  const totalPages = useMemo(() => meta?.pages ?? 1, [meta]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as ContactStatus | "";
    setStatusFilter(value ? (value as ContactStatus) : undefined);
    setPage(1);
  };

  const goToPage = (nextPage: number) => {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-gray-500">CRM</p>
          <h1 className="text-2xl font-semibold text-white">Kontakte</h1>
          <p className="text-sm text-gray-400">
            Suche, filtere und öffne Kontakte mit einem Klick.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/crm/pipeline"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-white/40"
          >
            Pipeline öffnen
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <input
          value={search}
          onChange={handleSearchChange}
          placeholder="Suche nach Name, Firma oder E-Mail"
          className="col-span-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-salesflow-accent/70 focus:outline-none"
        />
        <select
          value={statusFilter ?? ""}
          onChange={handleStatusChange}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value ?? ""}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/5 bg-black/30">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.3em] text-gray-500">
              <th className="px-6 py-4 font-medium">Kontakt</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Score</th>
              <th className="px-6 py-4 font-medium">Owner</th>
              <th className="px-6 py-4 font-medium text-right">Nächster Step</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-400">
                  Kontakte werden geladen …
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-rose-400">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-400">
                  Keine Kontakte gefunden. Passe Filter oder Suche an.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              contacts.map((contact) => (
                <tr key={contact.id} className="text-sm text-gray-200">
                  <td className="px-6 py-4">
                    <Link
                      to={`/crm/contacts/${contact.id}`}
                      className="font-semibold text-white hover:text-salesflow-accent"
                    >
                      {contact.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {contact.company ?? contact.email ?? "Direktkontakt"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize",
                        STATUS_COLORS[contact.status]
                      )}
                    >
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{contact.score ?? 0}</td>
                  <td className="px-6 py-4 text-gray-400">
                    {contact.owner_id ? `Owner · ${contact.owner_id.slice(0, 6)}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-gray-400">
                    {contact.next_followup_at
                      ? new Date(contact.next_followup_at).toLocaleDateString("de-AT", {
                          day: "2-digit",
                          month: "2-digit",
                        })
                      : "Kein Follow-up"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-3 text-sm text-gray-400 sm:flex-row sm:justify-between">
        <p>
          Seite {page} von {totalPages} · {meta?.total ?? 0} Kontakte
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            Zurück
          </button>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;

