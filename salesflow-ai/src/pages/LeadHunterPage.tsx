import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  DollarSign,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  Search,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";

type Trend = "up" | "down" | "stable";
type NextActionType = "call" | "email" | "linkedin" | "meeting" | "follow_up";
type Urgency = "high" | "medium" | "low";
type QuickActionPlatform = "whatsapp" | "email" | "instagram" | "linkedin";

type LeadIntelligence = {
  id: string;
  name: string;
  first_name?: string | null;
  company?: string | null;
  position?: string | null;
  ai_score: number;
  score_trend: Trend;
  health_status: "hot" | "warm" | "cold";
  deal_size?: number | null;
  win_probability: number;
  last_activity: string;
  days_since_contact: number;
  next_action: string;
  next_action_type: NextActionType;
  urgency: Urgency;
  tags: string[];
  ai_insight?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  whatsapp?: string | null;
};

type BoardStats = {
  total_leads: number;
  pipeline_value: number;
  hot_leads: number;
  tasks_due_today: number;
  avg_response_days: number;
};

type HunterBoardResponse = {
  stats: BoardStats;
  leads: LeadIntelligence[];
};

const ScoreRing: React.FC<{ score: number; trend: Trend }> = ({ score, trend }) => {
  const getColor = (s: number) =>
    s > 70 ? "text-green-400" : s > 40 ? "text-yellow-400" : "text-gray-500";
  const getStrokeColor = (s: number) =>
    s > 70 ? "#4ade80" : s > 40 ? "#facc15" : "#6b7280";

  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (circumference * score) / 100;

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="28" cy="28" r="20" stroke="#1f2937" strokeWidth="4" fill="transparent" />
        <circle
          cx="28"
          cy="28"
          r="20"
          stroke={getStrokeColor(score)}
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${getColor(score)}`}>{score}</span>
      </div>
      {trend === "up" && (
        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
          <ArrowUpRight className="w-3 h-3 text-white" />
        </div>
      )}
      {trend === "down" && (
        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
          <ArrowDownRight className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
};

const LeadCard: React.FC<{
  lead: LeadIntelligence;
  onAction?: (lead: LeadIntelligence, platform: QuickActionPlatform) => void;
  onOpenLead?: (id: string) => void;
}> = ({ lead, onAction, onOpenLead }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getUrgencyColor = (urgency: Urgency) => {
    if (urgency === "high") return "text-red-400 bg-red-500/10";
    if (urgency === "medium") return "text-yellow-400 bg-yellow-500/10";
    return "text-gray-400 bg-gray-500/10";
  };

  const getActionIcon = (type: NextActionType) => {
    switch (type) {
      case "call":
        return <Phone className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      case "linkedin":
        return <Linkedin className="w-4 h-4" />;
      case "meeting":
        return <Target className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const handleQuickAction = (platform: QuickActionPlatform, e: React.MouseEvent) => {
    e.stopPropagation();
    onAction?.(lead, platform);
  };

  return (
    <div
      className="group relative bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/50 rounded-xl p-4 mb-3 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-blue-500/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenLead?.(lead.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center w-1/3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mr-4 border border-gray-700 font-bold text-gray-300 text-lg">
            {lead.first_name?.[0] || lead.name?.[0] || "?"}
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight group-hover:text-blue-400 transition-colors">
              {lead.name}
            </h3>
            <p className="text-gray-400 text-sm flex items-center">
              {lead.position && <span>{lead.position}</span>}
              {lead.position && lead.company && <span className="mx-1">•</span>}
              {lead.company && <span>{lead.company}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-8 w-1/3 justify-center">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Deal Size</p>
            <p className="text-white font-mono font-medium">
              {lead.deal_size ? `€${(lead.deal_size / 1000).toFixed(0)}k` : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Win %</p>
            <p
              className={`font-mono font-medium ${
                lead.win_probability > 60 ? "text-green-400" : "text-gray-400"
              }`}
            >
              {lead.win_probability}%
            </p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">AI Score</p>
            <ScoreRing score={lead.ai_score} trend={lead.score_trend} />
          </div>
        </div>

        <div className="flex items-center justify-end w-1/3 space-x-3">
          <div className="text-right mr-4 hidden xl:block">
            <div
              className={`flex items-center justify-end text-sm mb-1 px-2 py-0.5 rounded-full ${getUrgencyColor(
                lead.urgency
              )}`}
            >
              {getActionIcon(lead.next_action_type)}
              <span className="ml-1">{lead.next_action}</span>
            </div>
            <p className="text-xs text-gray-500 italic max-w-[180px] truncate">
              {lead.last_activity}
            </p>
          </div>

          {lead.phone && (
            <button
              onClick={(e) => handleQuickAction("whatsapp", e)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-green-600 text-gray-400 hover:text-white transition-colors border border-gray-700"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}
          {lead.email && (
            <button
              onClick={(e) => handleQuickAction("email", e)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-purple-600 text-gray-400 hover:text-white transition-colors border border-gray-700"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}
          {lead.instagram && (
            <button
              onClick={(e) => handleQuickAction("instagram", e)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-pink-600 text-gray-400 hover:text-white transition-colors border border-gray-700"
            >
              <Instagram className="w-4 h-4" />
            </button>
          )}
          {lead.linkedin && (
            <button
              onClick={(e) => handleQuickAction("linkedin", e)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-blue-700 text-gray-400 hover:text-white transition-colors border border-gray-700"
            >
              <Linkedin className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isHovered ? "max-h-20 opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {lead.tags?.map((tag, i) => (
              <span
                key={tag + i.toString()}
                className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-xs border border-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
          {lead.ai_insight && (
            <span className="text-cyan-400 flex items-center text-xs">
              <Activity className="w-4 h-4 mr-1" />
              {lead.ai_insight}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const StatsCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}> = ({ label, value, icon, change, changeType }) => (
  <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl hover:border-gray-700 transition-colors">
    <div className="flex justify-between items-start mb-2">
      <span className="text-gray-500 text-xs uppercase font-medium tracking-wide">{label}</span>
      {icon}
    </div>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold text-white">{value}</span>
      {change && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            changeType === "positive"
              ? "bg-green-500/10 text-green-400"
              : changeType === "negative"
              ? "bg-red-500/10 text-red-400"
              : "bg-blue-500/10 text-blue-400"
          }`}
        >
          {change}
        </span>
      )}
    </div>
  </div>
);

const LeadHunterPage: React.FC = () => {
  const [data, setData] = useState<HunterBoardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("ai_score");
  const [searchQuery, setSearchQuery] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sortBy]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/hunter-board/data?filter_status=${filter}&sort_by=${sortBy}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = (await res.json()) as HunterBoardResponse;
      setData(result);
    } catch (err) {
      console.error("Error fetching hunter board:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (lead: LeadIntelligence, platform: QuickActionPlatform) => {
    const message = `Hey ${lead.first_name || lead.name}! 👋`;

    let deepLink: string | null = null;

    if (platform === "whatsapp" && lead.phone) {
      const phone = lead.phone.replace(/\s+/g, "").replace("+", "");
      deepLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    } else if (platform === "email" && lead.email) {
      deepLink = `mailto:${lead.email}?body=${encodeURIComponent(message)}`;
    } else if (platform === "instagram" && lead.instagram) {
      const handle = lead.instagram.replace("@", "");
      deepLink = `https://instagram.com/${handle}`;
    } else if (platform === "linkedin" && lead.linkedin) {
      deepLink = lead.linkedin.startsWith("http")
        ? lead.linkedin
        : `https://linkedin.com/in/${lead.linkedin}`;
    }

    if (deepLink) {
      window.open(deepLink, "_blank");
    }
  };

  const handleOpenLead = (leadId: string) => {
    window.location.href = `/leads/${leadId}`;
  };

  const filteredLeads =
    data?.leads?.filter(
      (lead) =>
        !searchQuery ||
        lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}k`;
    return `€${value}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8">
        <div>
          <p className="text-blue-500 font-medium text-sm tracking-wider uppercase mb-1">
            Sales Flow AI
          </p>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Hunter Board
            <span className="text-sm bg-gray-800 text-gray-400 px-3 py-1 rounded-lg border border-gray-700">
              {data?.stats?.total_leads || 0} Leads
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3 mt-4 lg:mt-0 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche Leads, Firmen..."
              className="bg-gray-900 border border-gray-800 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 w-64 transition-colors"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Alle Status</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">🌡️ Warm</option>
            <option value="cold">❄️ Cold</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="ai_score">AI Score</option>
            <option value="deal_size">Deal Size</option>
            <option value="days_since_contact">Letzter Kontakt</option>
          </select>

          <button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
            <Zap className="w-4 h-4" /> AI Auto-Connect
          </button>
        </div>
      </div>

      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            label="Pipeline Value"
            value={formatCurrency(data.stats.pipeline_value)}
            icon={<DollarSign className="w-5 h-5 text-green-400" />}
            change="+12%"
            changeType="positive"
          />
          <StatsCard
            label="Hot Leads (Score >70)"
            value={data.stats.hot_leads}
            icon={<Activity className="w-5 h-5 text-orange-400" />}
            change={`${data.stats.hot_leads} aktiv`}
            changeType="neutral"
          />
          <StatsCard
            label="Tasks Due Today"
            value={data.stats.tasks_due_today}
            icon={<Clock className="w-5 h-5 text-blue-400" />}
            change={data.stats.tasks_due_today > 0 ? "Urgent" : "✓"}
            changeType={data.stats.tasks_due_today > 0 ? "negative" : "positive"}
          />
          <StatsCard
            label="Ø Tage seit Kontakt"
            value={`${data.stats.avg_response_days}d`}
            icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
            change={data.stats.avg_response_days < 5 ? "Gut" : "Verbessern"}
            changeType={data.stats.avg_response_days < 5 ? "positive" : "negative"}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center px-4 pb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span className="w-1/3">Lead Details</span>
            <span className="w-1/3 text-center">AI Intelligence</span>
            <span className="w-1/3 text-right pr-16">Next Action</span>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Leads gefunden</p>
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onAction={handleQuickAction}
                onOpenLead={handleOpenLead}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LeadHunterPage;
