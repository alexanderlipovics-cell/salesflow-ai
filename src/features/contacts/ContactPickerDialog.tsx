import { Dialog, Transition } from "@headlessui/react";
import { RefreshCw, Search } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONTACT_CUSTOMERS, CONTACT_PROSPECTS } from "./contactData";

const SHOULD_USE_MOCK_CONTACTS =
  (import.meta.env.VITE_USE_MOCK_CONTACTS ?? "true") !== "false";

const NEEDS_ACTION_ENDPOINT = "/api/leads/needs-action";
const DAILY_COMMAND_ENDPOINT = "/api/leads/daily-command";
const DEFAULT_LIMIT = 40;

export interface ContactSummary {
  id: string;
  name: string;
  type: "lead" | "customer" | "other";
  vertical?: string | null;
  status?: string | null;
  city?: string | null;
}

interface ContactPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (contact: ContactSummary) => void;
}

type LeadHunterLead = {
  id?: string | number | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status?: string | null;
  source?: string | null;
};

type LeadHunterApiResponse = {
  leads?: LeadHunterLead[];
};

type DailyCommandItem = {
  id?: string | number;
  name?: string | null;
  company?: string | null;
  status?: string | null;
};

type DailyCommandApiResponse = {
  items?: DailyCommandItem[];
};

export function ContactPickerDialog(props: ContactPickerDialogProps) {
  const { open, onClose, onSelect } = props;
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didInitRef = useRef(false);

  const loadContacts = useCallback(
    async (force = false) => {
      if (loading) {
        return;
      }
      if (!force && contacts.length && !SHOULD_USE_MOCK_CONTACTS) {
        return;
      }

      setLoading(true);
      setError(null);

      if (SHOULD_USE_MOCK_CONTACTS) {
        setContacts(buildDemoContacts());
        setLoading(false);
        return;
      }

      try {
        const liveContacts = await fetchContactsFromApi();
        if (!liveContacts.length) {
          throw new Error("Keine Kontakte gefunden.");
        }
        setContacts(liveContacts);
      } catch (err) {
        const fallback = buildDemoContacts();
        setContacts(fallback);
        setError(
          err instanceof Error
            ? `${err.message} – zeige Demo-Kontakte.`
            : "Kontakte konnten nicht geladen werden – zeige Demo-Daten."
        );
      } finally {
        setLoading(false);
      }
    },
    [contacts.length, loading]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (didInitRef.current) {
      return;
    }
    didInitRef.current = true;
    void loadContacts();
  }, [open, loadContacts]);

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) {
      return contacts;
    }
    const needle = searchTerm.trim().toLowerCase();
    return contacts.filter((contact) => {
      const tokens = [
        contact.name,
        contact.city || "",
        contact.vertical || "",
        contact.status || "",
      ]
        .join(" ")
        .toLowerCase();
      return tokens.includes(needle);
    });
  }, [contacts, searchTerm]);

  const handleSelect = (contact: ContactSummary) => {
    onSelect(contact);
    onClose();
  };

  const typeBadge = (contact: ContactSummary) => {
    if (contact.type === "customer") {
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-100";
    }
    return "border-slate-600 bg-slate-800/60 text-slate-200";
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-white">
                        Kontakt auswählen
                      </Dialog.Title>
                      <p className="text-sm text-slate-400">
                        Suche nach Namen, Stadt oder Branche und übernimm die
                        Daten direkt in deine Vorlage.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadContacts(true)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {loading ? "Aktualisiere…" : "Neu laden"}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      autoFocus
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Nach Namen, Stadt oder Branche suchen"
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                    />
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                      {error}
                    </div>
                  )}

                  <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-white/5">
                    {filteredContacts.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-400">
                        {loading
                          ? "Kontakte werden geladen…"
                          : "Keine Kontakte gefunden. Passe deine Suche an."}
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-white/5 text-sm text-slate-200">
                        <thead className="bg-white/5 text-[11px] uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Name</th>
                            <th className="px-4 py-3 text-left font-semibold">Typ</th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Branche / Vertical
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">Ort</th>
                            <th className="px-4 py-3 text-left font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredContacts.map((contact) => (
                            <tr
                              key={contact.id}
                              onClick={() => handleSelect(contact)}
                              className="cursor-pointer bg-slate-950/60 transition hover:bg-emerald-500/5"
                            >
                              <td className="px-4 py-3">
                                <p className="font-semibold text-white">{contact.name}</p>
                                {contact.status && (
                                  <p className="text-xs text-slate-400">
                                    {contact.type === "lead" ? "Lead" : "Kunde"} ·{" "}
                                    {contact.status}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${typeBadge(
                                    contact
                                  )}`}
                                >
                                  {contact.type === "lead" ? "Lead" : "Kunde"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-200">
                                {contact.vertical || "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-200">
                                {contact.city || "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-200">
                                {contact.status || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function buildDemoContacts(): ContactSummary[] {
  const leads: ContactSummary[] = CONTACT_PROSPECTS.map((prospect) => ({
    id: prospect.id,
    name: prospect.name,
    type: "lead",
    vertical: prospect.focus,
    status: `${prospect.status.toUpperCase()} · ${prospect.stage}`,
    city: prospect.city,
  }));

  const customers: ContactSummary[] = CONTACT_CUSTOMERS.map((customer) => ({
    id: customer.id,
    name: customer.name,
    type: "customer",
    vertical: customer.segment,
    status: customer.health,
    city: customer.city,
  }));

  return [...leads, ...customers].sort((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" })
  );
}

async function fetchContactsFromApi(): Promise<ContactSummary[]> {
  const params = new URLSearchParams({
    limit: String(DEFAULT_LIMIT),
  });

  const leadsRequest = fetch(`${NEEDS_ACTION_ENDPOINT}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  const commandParams = new URLSearchParams({
    limit: String(DEFAULT_LIMIT),
    horizon_days: "7",
  });

  const dailyCommandRequest = fetch(
    `${DAILY_COMMAND_ENDPOINT}?${commandParams.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    }
  );

  const [leadsResponse, dailyCommandResponse] = await Promise.allSettled([
    leadsRequest,
    dailyCommandRequest,
  ]);

  const contactsMap = new Map<string, ContactSummary>();

  if (leadsResponse.status === "fulfilled") {
    if (!leadsResponse.value.ok) {
      throw new Error("Leads konnten nicht geladen werden.");
    }
    const payload = (await leadsResponse.value.json()) as LeadHunterApiResponse;
    (payload.leads ?? []).forEach((lead, index) => {
      const safeId =
        lead?.id != null
          ? String(lead.id)
          : lead?.email?.trim() ||
            lead?.phone?.trim() ||
            `lead-${index + 1}`;
      const type =
        lead?.status?.toLowerCase() === "customer" ? "customer" : "lead";

      contactsMap.set(safeId, {
        id: safeId,
        name: lead?.name?.trim() || "Unbekannter Kontakt",
        type,
        vertical: lead?.company?.trim() || lead?.source?.trim() || null,
        status: lead?.status?.trim() || null,
        city: null,
      });
    });
  } else {
    throw leadsResponse.reason;
  }

  if (dailyCommandResponse.status === "fulfilled" && dailyCommandResponse.value.ok) {
    const payload = (await dailyCommandResponse.value.json()) as DailyCommandApiResponse;
    (payload.items ?? []).forEach((item, index) => {
      const safeId =
        item?.id != null ? String(item.id) : `daily-${index + 1}`;
      const type =
        item?.status?.toLowerCase() === "customer" ? "customer" : "lead";

      if (!contactsMap.has(safeId)) {
        contactsMap.set(safeId, {
          id: safeId,
          name: item?.name?.trim() || "Unbekannter Kontakt",
          type,
          vertical: item?.company?.trim() || null,
          status: item?.status?.trim() || null,
          city: null,
        });
      }
    });
  }

  return Array.from(contactsMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" })
  );
}

