/**
 * LeadDetailPage - Vollständige Lead-Detailansicht
 * 
 * Features:
 * - Lead-Informationen anzeigen & bearbeiten
 * - P-Score mit Details
 * - Next Best Action (NBA)
 * - Zero-Input CRM Zusammenfassung
 * - Lead bearbeiten/löschen
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLead, useLeadMutations, usePScore, useNextBestAction, useZeroInputCRM } from "@/hooks/useLeads";
import {
  LeadFormData,
  LeadStatus,
  LeadSource,
  getPScoreBadgeColor,
  getPScoreBucketLabel,
  getLeadStatusColor,
  getNBAPriorityColor,
  NBA_ACTION_LABELS,
  NBA_ACTION_ICONS,
} from "@/types/lead";
import { cn } from "@/lib/utils";

const LeadDetailPage = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { lead, loading, error, refetch } = useLead(leadId || null);
  const { updateLead, deleteLead, loading: mutationLoading } = useLeadMutations();
  const { pScore, calculateScore, loading: scoreLoading } = usePScore(leadId || null);
  const { nba, fetchNBA, loading: nbaLoading } = useNextBestAction(leadId || null);
  const { summarize, loading: summaryLoading } = useZeroInputCRM();

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<LeadFormData>>({});
  const [zeroInputSummary, setZeroInputSummary] = useState<string | null>(null);

  useEffect(() => {
    if (lead && !isEditing) {
      setEditFormData({
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        notes: lead.notes || "",
        temperature: lead.temperature,
      });
    }
  }, [lead, isEditing]);

  const handleSave = async () => {
    if (!leadId) return;
    const result = await updateLead(leadId, editFormData);
    if (result) {
      setIsEditing(false);
      refetch();
    }
  };

  const handleDelete = async () => {
    if (!leadId) return;
    if (!window.confirm("Lead wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      return;
    }
    const success = await deleteLead(leadId);
    if (success) {
      navigate("/crm/leads");
    }
  };

  const handleRecalcPScore = async () => {
    await calculateScore();
    refetch();
  };

  const handleZeroInputSummarize = async () => {
    if (!leadId) return;
    const result = await summarize(leadId, false);
    if (result) {
      setZeroInputSummary(result.summary);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Lead wird geladen...</div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-rose-400">{error || "Lead nicht gefunden"}</div>
        <button
          onClick={() => navigate("/crm/leads")}
          className="mt-4 text-sm text-gray-400 hover:text-white"
        >
          ← Zurück zur Liste
        </button>
      </div>
    );
  }

  const statusColors = getLeadStatusColor(lead.status);
  const scoreColors = getPScoreBadgeColor(lead.p_score);
  const scoreBucket = getPScoreBucketLabel(lead.p_score);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/crm/leads")}
            className="text-gray-400 hover:text-white"
          >
            ← Zurück
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">{lead.name}</h1>
            <p className="text-sm text-gray-400">Lead-Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-white/40"
              >
                ✏️ Bearbeiten
              </button>
              <button
                onClick={handleDelete}
                className="rounded-xl border border-rose-500/30 px-4 py-2 text-sm font-medium text-rose-400 hover:border-rose-500"
              >
                🗑️ Löschen
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-white/40"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={mutationLoading}
                className="rounded-xl bg-salesflow-accent px-4 py-2 text-sm font-medium text-white hover:bg-salesflow-accent/90 disabled:opacity-50"
              >
                {mutationLoading ? "Speichere..." : "Speichern"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hauptbereich */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead-Informationen */}
          <div className="rounded-3xl border border-white/5 bg-black/30 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Informationen</h2>
            
            {!isEditing ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">Name</div>
                  <div className="text-white">{lead.name}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">Telefon</div>
                  <div className="text-white">{lead.phone}</div>
                </div>
                {lead.email && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500">E-Mail</div>
                    <div className="text-white">{lead.email}</div>
                  </div>
                )}
                {lead.company && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500">Firma</div>
                    <div className="text-white">{lead.company}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">Status</div>
                  <span
                    className={cn(
                      "mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                      statusColors.bg,
                      statusColors.text
                    )}
                  >
                    {lead.status}
                  </span>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">Quelle</div>
                  <div className="text-white capitalize">{lead.source?.replace("_", " ")}</div>
                </div>
                {lead.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500">Notizen</div>
                    <div className="text-white whitespace-pre-wrap">{lead.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.name || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                    Status
                  </label>
                  <select
                    value={editFormData.status || "NEW"}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        status: e.target.value as LeadStatus,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
                  >
                    <option value="NEW">Neu</option>
                    <option value="CONTACTED">Kontaktiert</option>
                    <option value="INTERESTED">Interessiert</option>
                    <option value="QUALIFIED">Qualifiziert</option>
                    <option value="PROPOSAL">Angebot</option>
                    <option value="NEGOTIATION">Verhandlung</option>
                    <option value="WON">Gewonnen</option>
                    <option value="LOST">Verloren</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                    Notizen
                  </label>
                  <textarea
                    value={editFormData.notes || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, notes: e.target.value })
                    }
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-salesflow-accent/70 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Zero-Input CRM */}
          <div className="rounded-3xl border border-white/5 bg-black/30 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Zero-Input CRM</h2>
              <button
                onClick={handleZeroInputSummarize}
                disabled={summaryLoading}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-white hover:border-white/40 disabled:opacity-50"
              >
                {summaryLoading ? "Erstelle..." : "🤖 Zusammenfassung erstellen"}
              </button>
            </div>
            
            {zeroInputSummary ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="text-sm text-emerald-100 whitespace-pre-wrap">
                  {zeroInputSummary}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                Klicke auf "Zusammenfassung erstellen", um eine automatische KI-Zusammenfassung
                der letzten Gespräche zu generieren.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* P-Score */}
          <div className="rounded-3xl border border-white/5 bg-black/30 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">P-Score</h2>
              <button
                onClick={handleRecalcPScore}
                disabled={scoreLoading}
                className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
              >
                {scoreLoading ? "⏳" : "🔄"}
              </button>
            </div>

            {lead.p_score !== null && lead.p_score !== undefined ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-bold",
                      scoreColors.bg,
                      scoreColors.text
                    )}
                  >
                    {Math.round(lead.p_score)}
                  </div>
                  <div>
                    <div className={cn("text-xl font-bold", scoreColors.text)}>
                      {scoreBucket}
                    </div>
                    {lead.p_score_trend && (
                      <div className="text-xs text-gray-400">
                        Trend: {lead.p_score_trend === "up" ? "↗️" : lead.p_score_trend === "down" ? "↘️" : "→"}
                      </div>
                    )}
                  </div>
                </div>

                {pScore?.factors && (
                  <div className="space-y-2 border-t border-white/10 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Inbound (7d)</span>
                      <span className="text-white">{pScore.factors.inbound_events_7d}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Inbound (14d)</span>
                      <span className="text-white">{pScore.factors.inbound_events_14d}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Outbound (14d)</span>
                      <span className="text-white">{pScore.factors.outbound_events_14d}</span>
                    </div>
                  </div>
                )}

                {lead.last_scored_at && (
                  <div className="text-xs text-gray-500">
                    Berechnet: {new Date(lead.last_scored_at).toLocaleString("de-AT")}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                Noch kein P-Score berechnet. Klicke auf 🔄 zum Berechnen.
              </div>
            )}
          </div>

          {/* Next Best Action */}
          <div className="rounded-3xl border border-white/5 bg-black/30 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Next Best Action</h2>
              <button
                onClick={() => fetchNBA()}
                disabled={nbaLoading}
                className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
              >
                {nbaLoading ? "⏳" : "🔄"}
              </button>
            </div>

            {nba ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{NBA_ACTION_ICONS[nba.action_key]}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      {NBA_ACTION_LABELS[nba.action_key]}
                    </div>
                    <div className="mt-1 text-sm text-gray-400">{nba.reason}</div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/10 pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Kanal</span>
                    <span className="text-white capitalize">{nba.suggested_channel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Priorität</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-semibold",
                        getNBAPriorityColor(nba.priority).bg,
                        getNBAPriorityColor(nba.priority).text
                      )}
                    >
                      {nba.priority}/5
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                NBA wird geladen oder ist nicht verfügbar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPage;

