import React from "react";
import { Activity as ActivityType } from "../../hooks/useDashboardData";
import { Activity, DollarSign, MessageSquare, TrendingUp, UserPlus } from "lucide-react";

interface ActivityFeedProps {
  activities?: ActivityType[];
}

const formatRelative = (ts?: string) => {
  if (!ts) return "gerade eben";
  const date = new Date(ts).getTime();
  if (Number.isNaN(date)) return ts;
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return `${diff}s`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

const iconFor = (type: string) => {
  switch (type) {
    case "message":
      return <MessageSquare size={16} className="text-blue-400" />;
    case "lead":
      return <UserPlus size={16} className="text-green-400" />;
    case "sale":
    case "deal_won":
      return <DollarSign size={16} className="text-amber-400" />;
    case "ai":
      return <TrendingUp size={16} className="text-purple-400" />;
    default:
      return <Activity size={16} className="text-gray-400" />;
  }
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const items = activities && activities.length ? activities : [];

  return (
    <div className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Letzte Aktivitäten</h3>
        <p className="text-sm text-gray-400">Echtzeit Updates</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">
          Noch keine Aktivitäten.{" "}
          <a
            href="/leads"
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            Erstelle deinen ersten Lead!
          </a>
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="group flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 p-3 transition-all hover:border-white/10 hover:bg-white/10"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="mt-0.5 rounded-md bg-white/10 p-2">{iconFor(item.type)}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white transition-colors group-hover:text-emerald-400">
                  {item.message}
                </p>
                {item.user && <p className="mt-1 text-xs text-gray-500">{item.user}</p>}
              </div>
              <span className="text-xs text-gray-500">{formatRelative(item.timestamp)}</span>
            </div>
          ))}
        </div>
      )}

      <a
        href="/leads"
        className="mt-4 block w-full rounded-lg border border-white/10 bg-white/5 py-2 text-center text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        Alle anzeigen
      </a>
    </div>
  );
};

export default ActivityFeed;

