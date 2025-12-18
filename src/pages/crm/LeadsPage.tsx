import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, List, LayoutGrid, MoreHorizontal, Flame, Phone, Mail, MessageCircle, Upload, Pencil, UserMinus } from "lucide-react";
import toast from "react-hot-toast";
import LeadsKanban from "@/components/leads/LeadsKanban";
import { Button } from "@/components/ui/button";
import { LeadForm } from "@/components/forms/LeadForm";
import ImportLeadsDialog from "@/components/leads/ImportLeadsDialog";
import LeadActionModal from "@/components/leads/LeadActionModal";
import LeadEditModal from "@/components/leads/LeadEditModal";
import { LostLeadsSection } from "@/components/leads/LostLeadsSection";
import { api } from "@/lib/api";

type Lead = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status?: string | null;
  score?: number | null;
  position?: string | null;
  notes?: string | null;
  source?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  whatsapp?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
  website?: string | null;
  tags?: string[] | null;
  lastActivity?: string | null;
  nextAction?: string | null;
  lost_reason?: string | null;
  updated_at?: string | null;
};

const statusTabs = [
  { id: "all", label: "Alle" },
  { id: "new", label: "Neu" },
  { id: "contacted", label: "Im Gespräch" },
  { id: "qualified", label: "Qualifiziert" },
  { id: "customer", label: "Kunden" },
  { id: "lost", label: "Verloren", icon: UserMinus },
];

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300",
  contacted: "bg-yellow-500/20 text-yellow-300",
  qualified: "bg-green-500/20 text-green-300",
  customer: "bg-emerald-600 text-white",
  lost: "bg-red-500/20 text-red-300",
  default: "bg-slate-700 text-slate-200",
};

const getScoreColor = (score?: number | null) => {
  if (!score && score !== 0) return "text-gray-400";
  if (score > 80) return "text-orange-400";
  if (score >= 50) return "text-yellow-300";
  return "text-gray-400";
};

const LeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "board">("table");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{ open: boolean; action: "whatsapp" | "email" | "call" | null }>({
    open: false,
    action: null,
  });
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/leads", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : []).map((l: any) => ({
        id: l.id,
        name: l.name || `${l.first_name || ""} ${l.last_name || ""}`.trim() || "Unbekannt",
        email: l.email,
        phone: l.phone,
        company: l.company,
        status: l.status || "new",
        score: l.score ?? l.temperature ?? null,
        position: l.position || l.title || null,
        notes: l.notes || l.description || null,
        source: l.source || null,
        instagram: l.instagram || l.instagram_handle || null,
        linkedin: l.linkedin || l.linkedin_url || null,
        whatsapp: l.whatsapp || null,
        twitter: l.twitter || null,
        tiktok: l.tiktok || null,
        facebook: l.facebook || null,
        website: l.website || null,
        tags: l.tags || null,
        lastActivity: l.last_activity || l.last_contact,
        nextAction: l.next_action || "Nächster Schritt offen",
        lost_reason: l.lost_reason || null,
        updated_at: l.updated_at || null,
      }));
      setLeads(normalized);
    } catch (err) {
      console.error("Leads laden fehlgeschlagen", err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    const term = search.toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch =
        !term ||
        lead.name.toLowerCase().includes(term) ||
        (lead.email || "").toLowerCase().includes(term) ||
        (lead.company || "").toLowerCase().includes(term);

      // Special logic for status filtering
      let matchesStatus = false;
      if (status === "all") {
        // "All" tab excludes lost leads
        matchesStatus = lead.status !== "lost";
      } else if (status === "lost") {
        // "Lost" tab shows only lost leads
        matchesStatus = lead.status === "lost";
      } else {
        // Other tabs match exactly
        matchesStatus = lead.status === status;
      }

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, status]);

  useEffect(() => {
    fetchLeads();
  }, []);

  // Update selectAll when selectedLeads or filteredLeads change
  useEffect(() => {
    setSelectAll(
      filteredLeads.length > 0 && 
      selectedLeads.size === filteredLeads.length &&
      filteredLeads.every(lead => selectedLeads.has(lead.id))
    );
  }, [selectedLeads, filteredLeads]);

  // Clear selection when status filter changes
  useEffect(() => {
    setSelectedLeads(new Set());
    setSelectAll(false);
  }, [status]);

  const hotLeads = useMemo(() => {
    return [...filteredLeads]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);
  }, [filteredLeads]);

  const handleCreateLead = async (data: any) => {
    setCreatingLead(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: data.fullName,
          email: data.email,
          company: data.company,
          phone: data.phone,
          notes: data.notes,
        }),
      });
      if (!res.ok) throw new Error("Lead konnte nicht erstellt werden");
      await fetchLeads();
      setShowAddLead(false);
    } catch (e) {
      console.error(e);
      alert("Lead konnte nicht erstellt werden");
    } finally {
      setCreatingLead(false);
    }
  };

  const handleUpdateLead = async (data: Partial<Lead>) => {
    if (!editingLead) return;
    const token = localStorage.getItem("access_token");
    const response = await fetch(`/api/leads/${editingLead.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Lead konnte nicht aktualisiert werden");
    }

    await fetchLeads();
    setSelectedLead((prev) => (prev && prev.id === editingLead.id ? { ...prev, ...data } : prev));
  };

  const handleMarkAsLost = async (leadId: string, reason: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: "lost",
          lost_reason: reason,
        }),
      });

      if (res.ok) {
        toast.success("Lead als verloren markiert");
        fetchLeads(); // Refresh the list
      } else {
        toast.error("Fehler beim Markieren als verloren");
      }
    } catch (error) {
      console.error("Error marking lead as lost:", error);
      toast.error("Fehler beim Markieren als verloren");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header / Filter */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-800 p-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatus(tab.id)}
                className={`px-4 py-2 rounded-md text-sm ${
                  status === tab.id ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suche nach Name, Firma..."
                className="w-64 rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-white"
              />
            </div>

            <div className="flex rounded-lg bg-slate-800 p-1">
              <button
                className={`p-2 rounded ${viewMode === "table" ? "bg-slate-700" : ""}`}
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                className={`p-2 rounded ${viewMode === "board" ? "bg-slate-700" : ""}`}
                onClick={() => setViewMode("board")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setImportDialogOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>

            <button
              onClick={() => setShowAddLead(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Neuer Lead
            </button>
          </div>
        </div>

        {/* Hot leads quick row */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {hotLeads.map((lead) => (
            <div key={lead.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{lead.name}</p>
                  <p className="text-xs text-gray-500">{lead.company}</p>
                </div>
                {lead.score && lead.score > 80 && <Flame className="h-4 w-4 text-orange-400" />}
              </div>
              <p className="mt-2 text-sm text-gray-400">{lead.nextAction}</p>
            </div>
          ))}
        </div>

        {/* Main content */}
        {status === "lost" ? (
          <LostLeadsSection
            leads={filteredLeads}
            onReactivate={(leadId) => {
              // Refresh leads after reactivation
              fetchLeads();
            }}
          />
        ) : viewMode === "table" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
                          setSelectAll(true);
                        } else {
                          setSelectedLeads(new Set());
                          setSelectAll(false);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Firma</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Nächster Schritt</th>
                  <th className="px-4 py-3">Letzte Aktivität</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                      Lädt Leads …
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer border-b border-slate-800 hover:bg-slate-800/50"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedLeads);
                            if (e.target.checked) {
                              newSelected.add(lead.id);
                            } else {
                              newSelected.delete(lead.id);
                            }
                            setSelectedLeads(newSelected);
                            setSelectAll(newSelected.size === filteredLeads.length && filteredLeads.length > 0);
                          }}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-medium">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{lead.name}</p>
                            <p className="text-xs text-gray-500">{lead.email || "Keine Email"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-white">{lead.company || "–"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs ${statusColors[lead.status || "default"]}`}>
                          {lead.status || "Unbekannt"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {lead.score && lead.score > 80 && <Flame className="h-4 w-4 text-orange-500" />}
                          <span className={`font-medium ${getScoreColor(lead.score)}`}>{lead.score ?? "–"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-300">{lead.nextAction || "–"}</td>
                      <td className="px-4 py-4 text-gray-400 text-sm">{lead.lastActivity || "–"}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLead(lead);
                            }}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-gray-200"
                          >
                            <Pencil className="h-3 w-3" /> Bearbeiten
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const reason = window.prompt('Grund für Verlust (optional):');
                              if (reason !== null) { // null = cancelled
                                handleMarkAsLost(lead.id, reason || 'Keine Antwort');
                              }
                            }}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs bg-red-900/50 hover:bg-red-800 text-red-300"
                          >
                            <UserMinus className="h-3 w-3" /> Verloren
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {!loading && filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                      Keine Leads gefunden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <LeadsKanban leads={filteredLeads} onLeadClick={(lead) => setSelectedLead(lead)} />
        )}
      </div>

      {/* Sheet */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedLead.name}</h3>
                <p className="text-sm text-gray-500">{selectedLead.company}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p className="text-white">{selectedLead.email || "–"}</p>
              </div>
              <div>
                <p className="text-gray-500">Telefon</p>
                <p className="text-white">{selectedLead.phone || "–"}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className="text-white">{selectedLead.status || "–"}</p>
              </div>
              <div>
                <p className="text-gray-500">Score</p>
                <p className={`font-semibold ${getScoreColor(selectedLead.score)}`}>{selectedLead.score ?? "–"}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setActionModal({ open: true, action: "call" })}
                className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Phone className="h-4 w-4" /> Anrufen
              </button>
              <button
                onClick={() => setActionModal({ open: true, action: "email" })}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4" /> Email
              </button>
              <button
                onClick={() => setActionModal({ open: true, action: "whatsapp" })}
                className="flex-1 rounded-lg bg-pink-600 px-3 py-2 text-sm font-semibold hover:bg-pink-700 flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
              <button
                onClick={() => setEditingLead(selectedLead)}
                className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700 flex items-center justify-center gap-2"
              >
                <Pencil className="h-4 w-4" /> Bearbeiten
              </button>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-500">Notizen</p>
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white"
                rows={4}
                placeholder="Notizen hinzufügen..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Add lead modal */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Neuer Lead</h3>
              <button onClick={() => setShowAddLead(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <LeadForm onSubmit={handleCreateLead} />
            {creatingLead && <p className="mt-2 text-sm text-gray-400">Lead wird erstellt…</p>}
          </div>
        </div>
      )}

      <ImportLeadsDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportComplete={() => {
          fetchLeads();
          setImportDialogOpen(false);
        }}
      />

      <LeadActionModal
        isOpen={actionModal.open}
        onClose={() => setActionModal({ open: false, action: null })}
        lead={selectedLead}
        action={actionModal.action}
      />

      {editingLead && (
        <LeadEditModal
          lead={editingLead}
          isOpen={!!editingLead}
          onClose={() => setEditingLead(null)}
          onSave={async (data) => {
            await handleUpdateLead(data);
            setEditingLead(null);
          }}
        />
      )}

      {/* Bulk Action Bar */}
      {selectedLeads.size > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-4 z-50 border border-gray-700">
          <span className="font-medium">{selectedLeads.size} ausgewählt</span>
          
          <select 
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-white cursor-pointer"
            onChange={async (e) => {
              if (!e.target.value) return;
              const newStatus = e.target.value;
              
              try {
                // API Call für alle ausgewählten
                await Promise.all(
                  Array.from(selectedLeads).map(id =>
                    api.patch(`/leads/${id}`, { status: newStatus })
                  )
                );
                
                toast.success(`${selectedLeads.size} Lead(s) Status aktualisiert`);
                
                // Refresh & Clear
                fetchLeads();
                setSelectedLeads(new Set());
                setSelectAll(false);
                e.target.value = '';
              } catch (error) {
                console.error("Error updating leads:", error);
                toast.error("Fehler beim Aktualisieren der Leads");
              }
            }}
          >
            <option value="">Status ändern...</option>
            <option value="new">🆕 New</option>
            <option value="contacted">📞 Contacted</option>
            <option value="qualified">✅ Qualified</option>
            <option value="proposal">📋 Proposal</option>
            <option value="won">🏆 Won</option>
            <option value="lost">❌ Lost</option>
          </select>
          
          <button 
            onClick={() => {
              setSelectedLeads(new Set());
              setSelectAll(false);
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;

