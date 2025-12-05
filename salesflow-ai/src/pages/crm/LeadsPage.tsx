/**
 * LeadsPage - Lead-Liste mit Suche, Filter und CRUD
 * 
 * Features:
 * - Vollständige Lead-Liste
 * - P-Score Badges
 * - Status Filter
 * - Suche
 * - Neue Leads erstellen
 * - Navigation zu Lead-Details
 */

import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLeads, useLeadMutations } from "@/hooks/useLeads";
import {
  LeadStatus,
  LeadSource,
  LeadFormData,
  getPScoreBadgeColor,
  getPScoreBucketLabel,
  getLeadStatusColor,
} from "@/types/lead";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ label: string; value?: LeadStatus }> = [
  { label: "Alle Status", value: undefined },
  { label: "Neu", value: "NEW" },
  { label: "Kontaktiert", value: "CONTACTED" },
  { label: "Interessiert", value: "INTERESTED" },
  { label: "Qualifiziert", value: "QUALIFIED" },
  { label: "Angebot", value: "PROPOSAL" },
  { label: "Verhandlung", value: "NEGOTIATION" },
  { label: "Gewonnen", value: "WON" },
  { label: "Verloren", value: "LOST" },
];

const SOURCE_OPTIONS: Array<{ label: string; value: LeadSource }> = [
  { label: "Manuell", value: "manual" },
  { label: "Import", value: "import" },
  { label: "Website", value: "website" },
  { label: "Empfehlung", value: "referral" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Instagram", value: "instagram" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Cold Call", value: "cold_call" },
  { label: "Event", value: "event" },
  { label: "Sonstiges", value: "other" },
];

const LeadsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | undefined>();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { leads, loading, error, refetch } = useLeads({
    search: search.trim() || undefined,
    status: statusFilter,
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          lead.name.toLowerCase().includes(searchLower) ||
          lead.email?.toLowerCase().includes(searchLower) ||
          lead.phone?.includes(searchLower) ||
          lead.company?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [leads, search]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as LeadStatus | "";
    setStatusFilter(value ? (value as LeadStatus) : undefined);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-gray-500">CRM</p>
          <h1 className="text-2xl font-semibold text-white">Leads</h1>
          <p className="text-sm text-gray-400">
            Lead-Management mit P-Score, NBA und Zero-Input CRM.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-salesflow-accent px-4 py-2 text-sm font-medium text-white hover:bg-salesflow-accent/90"
          >
            + Neuer Lead
          </button>
          <button
            onClick={() => refetch()}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-white/40"
          >
            🔄 Aktualisieren
          </button>
        </div>
      </div>

      {/* Filter & Suche */}
      <div className="grid gap-4 md:grid-cols-3">
        <input
          value={search}
          onChange={handleSearchChange}
          placeholder="Suche nach Name, Telefon, E-Mail oder Firma"
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

      {/* Lead-Tabelle */}
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-black/30">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.3em] text-gray-500">
              <th className="px-6 py-4 font-medium">Lead</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">P-Score</th>
              <th className="px-6 py-4 font-medium">Quelle</th>
              <th className="px-6 py-4 font-medium text-right">Follow-up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-400">
                  Leads werden geladen …
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

            {!loading && !error && filteredLeads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-400">
                  Keine Leads gefunden. Passe Filter oder Suche an.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              filteredLeads.map((lead) => {
                const statusColors = getLeadStatusColor(lead.status);
                const scoreColors = getPScoreBadgeColor(lead.p_score);
                const scoreBucket = getPScoreBucketLabel(lead.p_score);

                return (
                  <tr
                    key={lead.id}
                    className="cursor-pointer text-sm text-gray-200 hover:bg-white/5"
                    onClick={() => navigate(`/crm/leads/${lead.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{lead.name}</div>
                      <div className="text-xs text-gray-500">
                        {lead.phone}
                        {lead.email && ` · ${lead.email}`}
                      </div>
                      {lead.company && (
                        <div className="text-xs text-gray-400">{lead.company}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize",
                          statusColors.bg,
                          statusColors.text
                        )}
                      >
                        {lead.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lead.p_score !== null && lead.p_score !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                              scoreColors.bg,
                              scoreColors.text
                            )}
                          >
                            {Math.round(lead.p_score)}
                          </span>
                          <span className="text-xs text-gray-400">{scoreBucket}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 capitalize">
                      {lead.source?.replace("_", " ") || "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400">
                      {lead.next_follow_up
                        ? new Date(lead.next_follow_up).toLocaleDateString("de-AT", {
                            day: "2-digit",
                            month: "2-digit",
                          })
                        : "Kein Follow-up"}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <p>{filteredLeads.length} Leads angezeigt</p>
      </div>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default LeadsPage;

// ============================================================================
// CREATE LEAD MODAL
// ============================================================================

interface CreateLeadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateLeadModal({ onClose, onSuccess }: CreateLeadModalProps) {
  const { createLead, loading, error } = useLeadMutations();
  const [formData, setFormData] = useState<LeadFormData>({
    name: "",
    phone: "",
    email: "",
    status: "NEW",
    source: "manual",
    notes: "",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Name ist erforderlich";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Telefon ist erforderlich";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Ungültige E-Mail-Adresse";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const result = await createLead(formData);
    if (result) {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-gray-900 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Neuer Lead</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={cn(
                "w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white focus:outline-none",
                validationErrors.name
                  ? "border-rose-500"
                  : "border-white/10 focus:border-salesflow-accent/70"
              )}
              placeholder="Max Mustermann"
            />
            {validationErrors.name && (
              <p className="mt-1 text-xs text-rose-400">{validationErrors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Telefon *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={cn(
                "w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white focus:outline-none",
                validationErrors.phone
                  ? "border-rose-500"
                  : "border-white/10 focus:border-salesflow-accent/70"
              )}
              placeholder="+43 123 456789"
            />
            {validationErrors.phone && (
              <p className="mt-1 text-xs text-rose-400">{validationErrors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              E-Mail
            </label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={cn(
                "w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white focus:outline-none",
                validationErrors.email
                  ? "border-rose-500"
                  : "border-white/10 focus:border-salesflow-accent/70"
              )}
              placeholder="max@example.com"
            />
            {validationErrors.email && (
              <p className="mt-1 text-xs text-rose-400">{validationErrors.email}</p>
            )}
          </div>

          {/* Source */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Quelle
            </label>
            <select
              value={formData.source}
              onChange={(e) =>
                setFormData({ ...formData, source: e.target.value as LeadSource })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Notizen
            </label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
              placeholder="Zusätzliche Informationen..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white hover:border-white/40"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-salesflow-accent px-4 py-3 text-sm font-medium text-white hover:bg-salesflow-accent/90 disabled:opacity-50"
            >
              {loading ? "Erstelle..." : "Lead erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

