/**
 * SalesFlow AI - Network Marketing Dashboard
 * 
 * Main dashboard with:
 * - Daily Flow Widget
 * - Hot Leads Section  
 * - Goal Progress
 * - Team Duplication UI
 */
import React, { useState, useEffect } from 'react';

// ============= Types =============

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source: string;
  temperature: 'cold' | 'cool' | 'warm' | 'hot' | 'burning';
  score: number;
  category: 'customer' | 'business_builder' | 'hybrid' | 'unknown';
  lastContactedAt?: string;
  nextFollowUp?: string;
  talkingPoints: string[];
}

interface DailyAction {
  id: string;
  type: string;
  description: string;
  targetCount: number;
  completedCount: number;
  points: number;
  isRequired: boolean;
}

interface Goal {
  id: string;
  name: string;
  type: 'weekly' | 'monthly' | 'quarterly';
  target: number;
  current: number;
  unit: string;
  deadline: string;
}

interface TeamMember {
  id: string;
  name: string;
  rank: string;
  personalVolume: number;
  teamVolume: number;
  isActive: boolean;
  joinedDate: string;
  lastActive: string;
  needsSupport: boolean;
}

// ============= Dashboard Component =============

export const NetworkMarketingDashboard: React.FC = () => {
  // State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dailyActions, setDailyActions] = useState<DailyAction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'leads' | 'team'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Load data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // In production, fetch from API
      // Mock data for demonstration
      setLeads(mockHotLeads);
      setDailyActions(mockDailyActions);
      setGoals(mockGoals);
      setTeamMembers(mockTeamMembers);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const totalPoints = dailyActions.reduce((sum, a) => sum + (a.completedCount >= a.targetCount ? a.points : 0), 0);
  const maxPoints = dailyActions.reduce((sum, a) => sum + a.points, 0);
  const hotLeadsCount = leads.filter(l => l.temperature === 'hot' || l.temperature === 'burning').length;
  const activeTeam = teamMembers.filter(m => m.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SalesFlow AI</h1>
            <p className="text-sm text-gray-500">Network Marketing Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              🔥 {hotLeadsCount} Hot Leads
            </span>
            <span className="text-sm text-gray-600">
              👥 {activeTeam} Active Team
            </span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8">
            {(['overview', 'leads', 'team'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`py-4 px-2 font-medium transition-colors ${
                  selectedTab === tab
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Flow Widget */}
            <div className="lg:col-span-2">
              <DailyFlowWidget 
                actions={dailyActions} 
                totalPoints={totalPoints}
                maxPoints={maxPoints}
              />
            </div>

            {/* Goal Progress */}
            <div>
              <GoalProgressWidget goals={goals} />
            </div>

            {/* Hot Leads Section */}
            <div className="lg:col-span-2">
              <HotLeadsSection leads={leads.filter(l => 
                l.temperature === 'hot' || l.temperature === 'burning'
              )} />
            </div>

            {/* Team Needs Support */}
            <div>
              <TeamSupportWidget members={teamMembers.filter(m => m.needsSupport)} />
            </div>
          </div>
        )}

        {selectedTab === 'leads' && (
          <LeadHunterView leads={leads} />
        )}

        {selectedTab === 'team' && (
          <TeamDuplicationView members={teamMembers} />
        )}
      </main>
    </div>
  );
};

// ============= Daily Flow Widget =============

interface DailyFlowWidgetProps {
  actions: DailyAction[];
  totalPoints: number;
  maxPoints: number;
}

const DailyFlowWidget: React.FC<DailyFlowWidgetProps> = ({ actions, totalPoints, maxPoints }) => {
  const progressPercent = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

  const getActionIcon = (type: string) => {
    const icons: Record<string, string> = {
      'reach_out': '📱',
      'follow_up': '🔄',
      'share_content': '📤',
      'post_story': '📸',
      'team_support': '🤝',
      'go_live': '🎥',
      'product_demo': '🎁',
    };
    return icons[type] || '✅';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Daily Flow</h2>
          <p className="text-sm text-gray-500">Complete your daily actions</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-indigo-600">{totalPoints}</div>
          <div className="text-sm text-gray-500">of {maxPoints} points</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Action List */}
      <div className="space-y-3">
        {actions.map(action => {
          const isComplete = action.completedCount >= action.targetCount;
          const progress = Math.min(action.completedCount / action.targetCount * 100, 100);
          
          return (
            <div 
              key={action.id}
              className={`p-4 rounded-lg border transition-colors ${
                isComplete 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{getActionIcon(action.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${isComplete ? 'text-green-700' : 'text-gray-700'}`}>
                      {action.description}
                    </span>
                    <span className={`text-sm font-semibold ${isComplete ? 'text-green-600' : 'text-gray-500'}`}>
                      +{action.points} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          isComplete ? 'bg-green-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 min-w-16 text-right">
                      {action.completedCount}/{action.targetCount}
                    </span>
                  </div>
                </div>
                {action.isRequired && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Required</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-3">
        <button className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Log Activity
        </button>
        <button className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
          Edit Plan
        </button>
      </div>
    </div>
  );
};

// ============= Hot Leads Section =============

interface HotLeadsSectionProps {
  leads: Lead[];
}

const HotLeadsSection: React.FC<HotLeadsSectionProps> = ({ leads }) => {
  const getTemperatureColor = (temp: string) => {
    const colors: Record<string, string> = {
      'burning': 'bg-red-500',
      'hot': 'bg-orange-500',
      'warm': 'bg-yellow-500',
      'cool': 'bg-blue-400',
      'cold': 'bg-gray-400',
    };
    return colors[temp] || 'bg-gray-400';
  };

  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'business_builder': { bg: 'bg-purple-100', text: 'text-purple-700', label: '🚀 Builder' },
      'customer': { bg: 'bg-green-100', text: 'text-green-700', label: '💚 Customer' },
      'hybrid': { bg: 'bg-blue-100', text: 'text-blue-700', label: '⭐ Hybrid' },
      'unknown': { bg: 'bg-gray-100', text: 'text-gray-700', label: '❓ Unknown' },
    };
    return badges[category] || badges['unknown'];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🔥 Hot Leads</h2>
          <p className="text-sm text-gray-500">{leads.length} leads ready to close</p>
        </div>
        <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
          View All →
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🎯</div>
          <p>No hot leads yet. Keep nurturing!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.slice(0, 5).map(lead => {
            const badge = getCategoryBadge(lead.category);
            
            return (
              <div 
                key={lead.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Temperature Indicator */}
                  <div className={`w-2 h-full min-h-16 rounded-full ${getTemperatureColor(lead.temperature)}`} />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            Score: {lead.score}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Next Follow-up</div>
                        <div className="text-sm font-medium text-indigo-600">
                          {lead.nextFollowUp || 'Today'}
                        </div>
                      </div>
                    </div>

                    {/* Talking Points */}
                    {lead.talkingPoints.length > 0 && (
                      <div className="mt-3 p-2 bg-indigo-50 rounded-lg">
                        <div className="text-xs font-medium text-indigo-700 mb-1">💡 Talking Points:</div>
                        <ul className="text-xs text-indigo-600 space-y-1">
                          {lead.talkingPoints.slice(0, 2).map((point, i) => (
                            <li key={i}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-3">
                      <button className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">
                        Message
                      </button>
                      <button className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50">
                        Call
                      </button>
                      <button className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50">
                        Schedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============= Goal Progress Widget =============

interface GoalProgressWidgetProps {
  goals: Goal[];
}

const GoalProgressWidget: React.FC<GoalProgressWidgetProps> = ({ goals }) => {
  const getProgressColor = (current: number, target: number) => {
    const percent = (current / target) * 100;
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 75) return 'bg-indigo-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-400';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">🎯 Goals</h2>
        <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
          + Add Goal
        </button>
      </div>

      <div className="space-y-4">
        {goals.map(goal => {
          const percent = Math.min((goal.current / goal.target) * 100, 100);
          const isComplete = goal.current >= goal.target;
          
          return (
            <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{goal.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isComplete 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {goal.type}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${getProgressColor(goal.current, goal.target)}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 min-w-20 text-right">
                  {goal.current}/{goal.target} {goal.unit}
                </span>
              </div>
              
              {!isComplete && (
                <div className="text-xs text-gray-500 mt-2">
                  Due: {goal.deadline}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============= Team Support Widget =============

interface TeamSupportWidgetProps {
  members: TeamMember[];
}

const TeamSupportWidget: React.FC<TeamSupportWidgetProps> = ({ members }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">⚠️ Needs Support</h2>
        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
          {members.length}
        </span>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <div className="text-3xl mb-2">🎉</div>
          <p className="text-sm">All team members are on track!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.slice(0, 4).map(member => (
            <div 
              key={member.id}
              className="p-3 bg-red-50 border border-red-100 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{member.name}</div>
                  <div className="text-xs text-gray-500">{member.rank}</div>
                </div>
                <button className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">
                  Reach Out
                </button>
              </div>
              <div className="text-xs text-red-600 mt-2">
                Last active: {member.lastActive}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============= Lead Hunter View =============

interface LeadHunterViewProps {
  leads: Lead[];
}

const LeadHunterView: React.FC<LeadHunterViewProps> = ({ leads }) => {
  const [filter, setFilter] = useState<string>('all');
  
  const filteredLeads = filter === 'all' 
    ? leads 
    : leads.filter(l => l.temperature === filter);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          {['all', 'burning', 'hot', 'warm', 'cool', 'cold'].map(temp => (
            <button
              key={temp}
              onClick={() => setFilter(temp)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === temp
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {temp.charAt(0).toUpperCase() + temp.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Lead Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLeads.map(lead => (
          <div key={lead.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {lead.firstName} {lead.lastName}
                </h3>
                <p className="text-sm text-gray-500">{lead.source}</p>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                lead.temperature === 'burning' ? 'bg-red-100 text-red-700' :
                lead.temperature === 'hot' ? 'bg-orange-100 text-orange-700' :
                lead.temperature === 'warm' ? 'bg-yellow-100 text-yellow-700' :
                lead.temperature === 'cool' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {lead.temperature}
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              {lead.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span>📧</span>
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span>📱</span>
                  <span>{lead.phone}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                Contact
              </button>
              <button className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============= Team Duplication View =============

interface TeamDuplicationViewProps {
  members: TeamMember[];
}

const TeamDuplicationView: React.FC<TeamDuplicationViewProps> = ({ members }) => {
  return (
    <div className="space-y-6">
      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-3xl font-bold text-indigo-600">{members.length}</div>
          <div className="text-sm text-gray-500">Total Team</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-3xl font-bold text-green-600">
            {members.filter(m => m.isActive).length}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-3xl font-bold text-purple-600">
            ${members.reduce((sum, m) => sum + m.teamVolume, 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Team Volume</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-3xl font-bold text-orange-600">
            {members.filter(m => m.needsSupport).length}
          </div>
          <div className="text-sm text-gray-500">Need Support</div>
        </div>
      </div>

      {/* Team Tree */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Team Organization</h2>
        
        <div className="space-y-4">
          {members.map(member => (
            <div 
              key={member.id}
              className={`p-4 rounded-lg border ${
                member.isActive 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <div className="font-medium text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.rank}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    ${member.personalVolume.toLocaleString()} PV
                  </div>
                  <div className="text-xs text-gray-500">
                    Team: ${member.teamVolume.toLocaleString()}
                  </div>
                </div>
              </div>
              
              {member.needsSupport && (
                <div className="mt-3 flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <span className="text-xs text-red-600">⚠️ Needs support</span>
                  <button className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                    Support
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============= Mock Data =============

const mockHotLeads: Lead[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.j@email.com',
    phone: '+1 555-123-4567',
    source: 'instagram',
    temperature: 'burning',
    score: 92,
    category: 'business_builder',
    nextFollowUp: 'Today',
    talkingPoints: [
      'Interested in financial freedom',
      'Has leadership experience',
      'Looking for flexible work'
    ]
  },
  {
    id: '2',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'mchen@email.com',
    source: 'linkedin',
    temperature: 'hot',
    score: 85,
    category: 'hybrid',
    nextFollowUp: 'Tomorrow',
    talkingPoints: [
      'Health & fitness enthusiast',
      'Entrepreneur mindset'
    ]
  },
  {
    id: '3',
    firstName: 'Emma',
    lastName: 'Williams',
    source: 'warm_market',
    temperature: 'hot',
    score: 78,
    category: 'customer',
    nextFollowUp: 'This week',
    talkingPoints: [
      'Loves wellness products',
      'Active on social media'
    ]
  }
];

const mockDailyActions: DailyAction[] = [
  {
    id: '1',
    type: 'reach_out',
    description: 'Reach out to 5 new leads',
    targetCount: 5,
    completedCount: 3,
    points: 20,
    isRequired: true
  },
  {
    id: '2',
    type: 'follow_up',
    description: 'Follow up with 10 contacts',
    targetCount: 10,
    completedCount: 10,
    points: 30,
    isRequired: true
  },
  {
    id: '3',
    type: 'share_content',
    description: 'Share 2 value posts',
    targetCount: 2,
    completedCount: 1,
    points: 15,
    isRequired: false
  },
  {
    id: '4',
    type: 'post_story',
    description: 'Post 3 stories',
    targetCount: 3,
    completedCount: 3,
    points: 15,
    isRequired: false
  },
  {
    id: '5',
    type: 'team_support',
    description: 'Support 2 team members',
    targetCount: 2,
    completedCount: 0,
    points: 20,
    isRequired: false
  }
];

const mockGoals: Goal[] = [
  {
    id: '1',
    name: 'New Customers',
    type: 'monthly',
    target: 10,
    current: 7,
    unit: 'customers',
    deadline: 'Dec 31'
  },
  {
    id: '2',
    name: 'Team Volume',
    type: 'monthly',
    target: 5000,
    current: 3200,
    unit: 'PV',
    deadline: 'Dec 31'
  },
  {
    id: '3',
    name: 'New Builders',
    type: 'quarterly',
    target: 5,
    current: 2,
    unit: 'builders',
    deadline: 'Jan 31'
  }
];

const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'John Smith',
    rank: 'Senior Consultant',
    personalVolume: 500,
    teamVolume: 2500,
    isActive: true,
    joinedDate: '2024-01-15',
    lastActive: 'Today',
    needsSupport: false
  },
  {
    id: '2',
    name: 'Lisa Parker',
    rank: 'Distributor',
    personalVolume: 200,
    teamVolume: 0,
    isActive: true,
    joinedDate: '2024-06-01',
    lastActive: 'Yesterday',
    needsSupport: false
  },
  {
    id: '3',
    name: 'David Brown',
    rank: 'Distributor',
    personalVolume: 50,
    teamVolume: 0,
    isActive: false,
    joinedDate: '2024-09-15',
    lastActive: '2 weeks ago',
    needsSupport: true
  },
  {
    id: '4',
    name: 'Amy Wilson',
    rank: 'Success Builder',
    personalVolume: 1000,
    teamVolume: 1500,
    isActive: true,
    joinedDate: '2024-03-01',
    lastActive: 'Today',
    needsSupport: false
  }
];

export default NetworkMarketingDashboard;

