import { CheckCircle2, Loader2, MessageCircle, Phone, Timer, Zap } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  name: string;
  action?: string;
  dueTime?: string;
  overdue?: boolean;
  leadId?: string;
}

interface Props {
  tasks?: Task[];
  isLoading?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const TodaysTasks: React.FC<Props> = ({ tasks, isLoading: loadingProp }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<Task[]>([]);
  const navigate = useNavigate();

  // Fetch only when no tasks were provided
  useEffect(() => {
    if (tasks) {
      setData(tasks);
      return;
    }
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        console.log('[TodaysTasks] Fetching followups from /api/followups/today');
        const res = await fetch(`${API_BASE_URL}/api/followups/today`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (res.ok) {
          const json = await res.json();
          console.log('[TodaysTasks] Followups result:', json);
          // API gibt { today: [...], count: ... } zurück
          const items = Array.isArray(json.today) ? json.today : (Array.isArray(json.items) ? json.items : []);
          setData(
            items.slice(0, 5).map((item: any) => {
              // Handle nested leads object
              const leadName = item.leads?.name ?? item.lead_name ?? item.title ?? "Follow-up";
              return {
                id: item.id ?? item.followup_id ?? Math.random().toString(),
                name: leadName,
                action: item.reason ?? item.type ?? item.action ?? "Follow-up",
                dueTime: item.due_at ?? item.due,
                overdue: Boolean(item.overdue),
                leadId: item.lead_id ?? item.leadId,
              };
            })
          );
        } else {
          console.error('[TodaysTasks] Failed to fetch followups:', res.status, res.statusText);
          setData([]);
        }
      } catch (error) {
        console.error('[TodaysTasks] Error fetching followups:', error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, [tasks]);

  const rendered = useMemo(() => tasks ?? data, [tasks, data]);
  const loading = loadingProp ?? isLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!rendered.length) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-emerald-100">
        <div className="text-lg font-semibold">Keine Tasks für heute! 🎉</div>
        <p className="text-sm text-emerald-200/80">Du hast alles erledigt. Stark!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rendered.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/70 p-3 transition hover:border-cyan-400/40 hover:bg-gray-900"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
            <Timer className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">{task.name}</div>
            <div className="text-xs text-gray-400">
              {task.action || "Follow-up"} • {task.dueTime ? new Date(task.dueTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "Heute"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => task.leadId && navigate(`/leads/${task.leadId}`)}
              className="rounded-lg border border-white/5 bg-white/5 p-2 text-gray-300 hover:border-cyan-400/50 hover:text-white"
              title="Details"
            >
              <Zap className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/5 bg-white/5 p-2 text-gray-300 hover:border-emerald-400/50 hover:text-white"
              title="Anrufen"
            >
              <Phone className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/5 bg-white/5 p-2 text-gray-300 hover:border-blue-400/50 hover:text-white"
              title="Nachricht"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/5 bg-white/5 p-2 text-gray-300 hover:border-emerald-400/60 hover:text-emerald-200"
              title="Erledigt"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <div className="pt-1 text-right">
        <button
          type="button"
          onClick={() => navigate("/leads")}
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        >
          Alle anzeigen →
        </button>
      </div>
    </div>
  );
};

export default TodaysTasks;

