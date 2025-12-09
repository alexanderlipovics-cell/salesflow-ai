import { Plus, MessageCircle, Upload, Wand2 } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

const actions = [
  { label: "+ Neuer Lead", to: "/leads?action=new", icon: <Plus className="h-4 w-4" /> },
  { label: "+ Follow-up", to: "/follow-ups?action=new", icon: <Plus className="h-4 w-4" /> },
  { label: "AI Copilot", to: "/chat", icon: <Wand2 className="h-4 w-4" /> },
  { label: "Import", to: "/import", icon: <Upload className="h-4 w-4" /> },
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => navigate(action.to)}
          className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.15)] transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:bg-cyan-500/15"
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickActions;

