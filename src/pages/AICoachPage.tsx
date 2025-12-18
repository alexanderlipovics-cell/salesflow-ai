/**
 * AICoachPage
 * 
 * Standalone Seite für den CHIEF AI Coach.
 * Route: /coach
 */

import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Sparkles, Users } from 'lucide-react';
import { LeadContextChat } from '@/components/chat/LeadContextChat';
import { supabaseClient } from '@/lib/supabaseClient';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface LeadOption {
  id: string;
  name: string | null;
  company: string | null;
  vertical: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export default function AICoachPage() {
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [chatKey, setChatKey] = useState(0); // Key zum Reset des Chats

  // Leads laden
  useEffect(() => {
    const fetchLeads = async () => {
      setLoadingLeads(true);
      try {
        const { data, error } = await supabaseClient
          .from('leads')
          .select('id, name, company, vertical')
          .order('updated_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Leads laden fehlgeschlagen:', error);
          return;
        }

        setLeads((data as LeadOption[]) || []);
      } catch (err) {
        console.error('Leads laden fehlgeschlagen:', err);
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, []);

  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    setChatKey((prev) => prev + 1); // Chat neu laden
  };

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">CHIEF</h1>
            <p className="text-sm text-slate-400">Dein persönlicher Sales Coach</p>
          </div>
        </div>

        {/* Lead Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="h-4 w-4" />
            <span>Lead-Kontext:</span>
          </div>
          <div className="relative">
            <select
              value={selectedLeadId}
              onChange={(e) => handleLeadChange(e.target.value)}
              disabled={loadingLeads}
              className="w-64 appearance-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 pr-10 text-sm text-white focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {loadingLeads ? 'Lade Leads...' : '— Kein Lead (allgemeine Fragen) —'}
              </option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name || 'Unbenannt'}
                  {lead.company ? ` (${lead.company})` : ''}
                  {lead.vertical ? ` • ${lead.vertical}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>
      </header>

      {/* Selected Lead Info */}
      {selectedLead && (
        <div className="border-b border-slate-800 bg-slate-800/30 px-6 py-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-white">{selectedLead.name}</span>
            {selectedLead.company && (
              <span className="text-slate-400">• {selectedLead.company}</span>
            )}
            {selectedLead.vertical && (
              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                {selectedLead.vertical}
              </span>
            )}
            <button
              onClick={() => handleLeadChange('')}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300"
            >
              Kontext entfernen
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        {loadingLeads ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <LeadContextChat
            key={chatKey}
            leadId={selectedLeadId || undefined}
            leadName={selectedLead?.name || undefined}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            💡 Tipp: Wähle einen Lead aus, um kontextbezogene Antworten zu erhalten.
          </span>
          <span>
            CHIEF nutzt GPT-4 für präzise Sales-Beratung
          </span>
        </div>
      </footer>
    </div>
  );
}

