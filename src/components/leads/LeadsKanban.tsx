import React from "react";
import KanbanCard, { KanbanLead } from "./KanbanCard";

interface Column {
  id: string;
  title: string;
  color: string;
}

const columns: Column[] = [
  { id: "new", title: "Neu", color: "blue" },
  { id: "contacted", title: "Im Gespräch", color: "yellow" },
  { id: "qualified", title: "Qualifiziert", color: "green" },
  { id: "customer", title: "Kunde", color: "emerald" },
];

interface Props {
  leads: (KanbanLead & { status?: string | null })[];
  onLeadClick?: (lead: KanbanLead) => void;
}

export default function LeadsKanban({ leads, onLeadClick }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => (
        <div key={column.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-medium text-white">
              <span className={`h-2 w-2 rounded-full bg-${column.color}-500`} />
              {column.title}
            </h3>
            <span className="text-sm text-gray-500">
              {leads.filter((l) => (l.status || "new") === column.id).length}
            </span>
          </div>
          <div className="space-y-3">
            {leads
              .filter((lead) => (lead.status || "new") === column.id)
              .map((lead) => (
                <KanbanCard key={lead.id} lead={lead} onClick={() => onLeadClick?.(lead)} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

