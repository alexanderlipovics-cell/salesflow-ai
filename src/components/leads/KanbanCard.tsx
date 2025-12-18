import React from "react";
import { Flame, MessageCircle } from "lucide-react";

export interface KanbanLead {
  id: string;
  name: string;
  company?: string | null;
  score?: number | null;
  nextAction?: string | null;
  lastActivity?: string | null;
}

interface Props {
  lead: KanbanLead;
  onClick?: () => void;
}

export default function KanbanCard({ lead, onClick }: Props) {
  const initial = (lead.name || "N").charAt(0).toUpperCase();
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-slate-500"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-medium text-white">
            {initial}
          </div>
          <div>
            <p className="font-medium text-white">{lead.name}</p>
            <p className="text-xs text-gray-500">{lead.company}</p>
          </div>
        </div>

        {lead.score && lead.score > 80 && (
          <span className="flex items-center gap-1 rounded px-2 py-1 text-xs text-orange-400 bg-orange-500/20">
            <Flame className="h-3 w-3" /> Hot
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>{lead.nextAction || "Kein nächster Schritt"}</span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          {lead.lastActivity || "–"}
        </span>
      </div>
    </div>
  );
}

