import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Target,
  Trophy,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Sparkles,
  UserPlus,
  CheckSquare,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

type TeamMember = {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  deals?: number;
  tasks?: number;
  revenue?: number;
  activities?: number;
};

type Priority = {
  title: string;
  description?: string;
  urgency?: 'high' | 'medium' | 'low';
};

type LeaderboardEntry = {
  id: string;
  name: string;
  avatar?: string;
  deals?: number;
  revenue?: number;
  activities?: number;
};

type TeamStats = {
  activeDeals: number;
  weeklyRevenue: number;
};

type PerformancePoint = {
  label: string;
  value: number;
};

export default function TeamCoachPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats>({ activeDeals: 0, weeklyRevenue: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
  const [coachQuery, setCoachQuery] = useState('');
  const [coachResponse, setCoachResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, []);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', activeTab);
      return next;
    });
  }, [activeTab, setSearchParams]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [membersRes, prioritiesRes, statsRes] = await Promise.all([
        fetch('/api/team/members', { headers }),
        fetch('/api/team/priorities', { headers }),
        fetch('/api/team/stats', { headers }).catch(() => null),
      ]);

      if (membersRes.ok) {
        setTeamMembers(await membersRes.json());
      }
      if (prioritiesRes.ok) {
        setPriorities(await prioritiesRes.json());
      }
      if (statsRes && statsRes.ok) {
        const stats = await statsRes.json();
        setTeamStats({
          activeDeals: stats.active_deals ?? 0,
          weeklyRevenue: stats.weekly_revenue ?? 0,
        });
        setLeaderboard(stats.leaderboard ?? []);
        setPerformanceData(stats.performance ?? []);
      } else {
        // Fallback demo data
        setLeaderboard([
          { id: '1', name: 'Alex', deals: 5, revenue: 12000, activities: 42 },
          { id: '2', name: 'Sam', deals: 4, revenue: 9800, activities: 36 },
          { id: '3', name: 'Jamie', deals: 3, revenue: 7500, activities: 30 },
        ]);
        setPerformanceData([
          { label: 'Mo', value: 10 },
          { label: 'Di', value: 14 },
          { label: 'Mi', value: 12 },
          { label: 'Do', value: 16 },
          { label: 'Fr', value: 18 },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPriorities = async () => {
    const token = localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch('/api/team/priorities', { headers });
      if (res.ok) setPriorities(await res.json());
    } catch (error) {
      console.error('Priorities refresh failed', error);
    }
  };

  const handleAssign = (priority: Priority) => {
    console.log('Assign priority', priority);
  };

  const handleComplete = (priority: Priority) => {
    console.log('Complete priority', priority);
  };

  const handleCoachMember = (member: TeamMember) => {
    setCoachQuery(`Wie coache ich ${member.name} diese Woche am besten?`);
    setActiveTab('coaching');
  };

  const handleMessage = (member: TeamMember) => {
    alert(`Nachricht an ${member.name} senden (Platzhalter).`);
  };

  const handleAskCoach = async () => {
    if (!coachQuery.trim()) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/team/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: coachQuery }),
      });
      const data = await res.json();
      setCoachResponse(data?.response || 'Keine Antwort erhalten.');
    } catch (error) {
      console.error('Coach Anfrage fehlgeschlagen', error);
      setCoachResponse('Fehler bei der Coach-Anfrage.');
    }
  };

  const handleQuickCoach = async (topic: string) => {
    setCoachQuery(topic);
    await handleAskCoach();
  };

  const derivedTeamStats = useMemo(() => {
    const activeDeals = teamStats.activeDeals ?? 0;
    const weeklyRevenue = teamStats.weeklyRevenue ?? 0;
    return { activeDeals, weeklyRevenue };
  }, [teamStats]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Team Coach
          </h1>
          <p className="text-gray-500">Coache und manage dein Team</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddMember(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Mitglied hinzufügen
          </Button>
          <Button onClick={() => setShowChallenge(true)}>
            <Trophy className="w-4 h-4 mr-2" />
            Challenge starten
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Team-Größe" value={teamMembers.length} icon={Users} />
        <StatCard label="Aktive Deals" value={derivedTeamStats.activeDeals} icon={Target} trend="+12%" />
        <StatCard label="Diese Woche" value={`€${derivedTeamStats.weeklyRevenue}`} icon={TrendingUp} trend="+8%" />
        <StatCard label="Offene Tasks" value={priorities.length} icon={CheckSquare} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="priorities" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Prioritäten
          </TabsTrigger>
          <TabsTrigger value="coaching" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            AI Coaching
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Team Overview */}
        <TabsContent value="overview">
          {loading ? (
            <div className="text-sm text-gray-500">Lade Teamdaten …</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onCoach={() => handleCoachMember(member)}
                  onMessage={() => handleMessage(member)}
                />
              ))}
              {teamMembers.length === 0 && <div className="text-sm text-gray-500">Keine Team-Mitglieder.</div>}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Priorities */}
        <TabsContent value="priorities">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Team-Prioritäten heute</h3>
              <Button size="sm" variant="outline" onClick={handleRefreshPriorities}>
                <RefreshCw className="w-4 h-4 mr-2" />
                AI Refresh
              </Button>
            </div>

            {priorities.map((priority, i) => (
              <PriorityCard
                key={i}
                priority={priority}
                onAssign={() => handleAssign(priority)}
                onComplete={() => handleComplete(priority)}
              />
            ))}

            {priorities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Keine offenen Prioritäten - Team ist on track! 🎉</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: AI Coaching */}
        <TabsContent value="coaching">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Team AI Coach
              </h3>
              <div className="space-y-4">
                <textarea
                  placeholder="Frag den AI Coach... z.B. 'Wie motiviere ich Max diese Woche?'"
                  className="w-full h-24 p-3 border rounded-lg resize-none"
                  value={coachQuery}
                  onChange={(e) => setCoachQuery(e.target.value)}
                />
                <Button onClick={handleAskCoach} className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Coach fragen
                </Button>
              </div>

              {coachResponse && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{coachResponse}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Schnell-Aktionen</h3>

              <button
                onClick={() => handleQuickCoach('Motivations-Boost für das Team')}
                className="w-full p-4 text-left bg-white dark:bg-gray-800 rounded-xl border hover:border-blue-300 transition"
              >
                <div className="font-medium">🔥 Motivations-Boost</div>
                <div className="text-sm text-gray-500">AI generiert motivierende Nachricht fürs Team</div>
              </button>

              <button
                onClick={() => handleQuickCoach('Wochen-Summary für das Team erstellen')}
                className="w-full p-4 text-left bg-white dark:bg-gray-800 rounded-xl border hover:border-blue-300 transition"
              >
                <div className="font-medium">📊 Wochen-Summary</div>
                <div className="text-sm text-gray-500">Zusammenfassung der Team-Performance</div>
              </button>

              <button
                onClick={() => handleQuickCoach('Wer braucht Hilfe? Team-Risiken identifizieren')}
                className="w-full p-4 text-left bg-white dark:bg-gray-800 rounded-xl border hover:border-blue-300 transition"
              >
                <div className="font-medium">🆘 Wer braucht Hilfe?</div>
                <div className="text-sm text-gray-500">AI identifiziert Team-Mitglieder die strugglen</div>
              </button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Performance */}
        <TabsContent value="performance">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Leaderboard diese Woche
              </h3>
              <div className="space-y-3">
                {leaderboard.map((member, i) => (
                  <div key={member.id} className="flex items-center gap-4">
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                        i === 0
                          ? 'bg-yellow-100 text-yellow-600'
                          : i === 1
                            ? 'bg-gray-100 text-gray-600'
                            : i === 2
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      {i + 1}
                    </span>
                    {member.avatar && <img src={member.avatar} className="w-10 h-10 rounded-full" />}
                    <div className="flex-1">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.deals ?? 0} Deals</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">€{member.revenue ?? 0}</div>
                      <div className="text-xs text-gray-400">{member.activities ?? 0} Aktivitäten</div>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && <div className="text-sm text-gray-500">Keine Leaderboard-Daten.</div>}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Team-Trend</h3>
              <TeamPerformanceChart data={performanceData} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components
const StatCard = ({ label, value, icon: Icon, trend }: { label: string; value: number | string; icon: any; trend?: string }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <Icon className="w-5 h-5 text-gray-400" />
      {trend && <span className="text-xs text-green-500">{trend}</span>}
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm text-gray-500">{label}</div>
  </div>
);

const TeamMemberCard = ({
  member,
  onCoach,
  onMessage,
}: {
  member: TeamMember;
  onCoach: () => void;
  onMessage: () => void;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      {member.avatar && <img src={member.avatar} className="w-12 h-12 rounded-full" />}
      <div>
        <div className="font-medium">{member.name}</div>
        <div className="text-sm text-gray-500">{member.role}</div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
      <div>
        <span className="text-gray-500">Deals:</span> {member.deals ?? 0}
      </div>
      <div>
        <span className="text-gray-500">Tasks:</span> {member.tasks ?? 0}
      </div>
    </div>
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={onCoach} className="flex-1">
        <Sparkles className="w-3 h-3 mr-1" />
        Coachen
      </Button>
      <Button size="sm" variant="ghost" onClick={onMessage}>
        <MessageSquare className="w-3 h-3" />
      </Button>
    </div>
  </div>
);

const PriorityCard = ({
  priority,
  onAssign,
  onComplete,
}: {
  priority: Priority;
  onAssign: () => void;
  onComplete: () => void;
}) => (
  <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
    <div
      className={`w-2 h-12 rounded-full ${
        priority.urgency === 'high' ? 'bg-red-500' : priority.urgency === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
      }`}
    />
    <div className="flex-1">
      <div className="font-medium">{priority.title}</div>
      <div className="text-sm text-gray-500">{priority.description}</div>
    </div>
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={onAssign}>
        Zuweisen
      </Button>
      <Button size="sm" variant="ghost" onClick={onComplete}>
        ✓
      </Button>
    </div>
  </div>
);

const TeamPerformanceChart = ({ data }: { data: PerformancePoint[] }) => (
  <div className="h-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-sm text-gray-500">
    {data?.length ? 'Performance Chart Placeholder' : 'Keine Performance-Daten'}
  </div>
);

