/**
 * SALES FLOW AI - DASHBOARD PAGE COMPONENT
 * 
 * Vollständiges Dashboard mit allen Analytics
 * Version: 1.0.0
 */

import React from 'react';
import { useDashboard } from '@/hooks/useDashboardData';
import { 
  TodayOverview, 
  WeekTimeseriesPoint,
  TopTemplate,
  TopNetworker,
  NeedsHelpRep 
} from '@/types/dashboard';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardPageProps {
  workspaceId: string;
}

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// ============================================================================
// ERROR COMPONENT
// ============================================================================

const ErrorMessage: React.FC<{ message: string; onRetry: () => void }> = ({ 
  message, 
  onRetry 
}) => (
  <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
    <div className="text-red-600 text-lg font-medium">⚠️ {message}</div>
    <button 
      onClick={onRetry}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Erneut versuchen
    </button>
  </div>
);

// ============================================================================
// TODAY OVERVIEW CARD
// ============================================================================

const TodayOverviewCard: React.FC<{ data: TodayOverview | null }> = ({ data }) => {
  if (!data) return null;

  const metrics = [
    { 
      label: 'Tasks heute fällig', 
      value: data.tasks_due_today,
      color: 'text-orange-600'
    },
    { 
      label: 'Tasks erledigt', 
      value: data.tasks_done_today,
      color: 'text-green-600'
    },
    { 
      label: 'Neue Leads', 
      value: data.leads_created_today,
      color: 'text-blue-600'
    },
    { 
      label: 'Erste Nachrichten', 
      value: data.first_messages_today,
      color: 'text-purple-600'
    },
    { 
      label: 'Signups', 
      value: data.signups_today,
      color: 'text-green-600'
    },
    { 
      label: 'Revenue', 
      value: `€${data.revenue_today.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`,
      color: 'text-emerald-600'
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">📊 Heute</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric, idx) => (
          <div key={idx} className="text-center">
            <div className={`text-3xl font-bold ${metric.color}`}>
              {metric.value}
            </div>
            <div className="text-sm text-gray-600 mt-1">{metric.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// TODAY TASKS LIST
// ============================================================================

const TodayTasksList: React.FC<{ tasks: any[] }> = ({ tasks }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">✅ Heute fällige Follow-ups</h2>
        <p className="text-gray-500">Keine offenen Tasks für heute 🎉</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">✅ Heute fällige Follow-ups ({tasks.length})</h2>
      <div className="space-y-3">
        {tasks.slice(0, 10).map((task) => (
          <div 
            key={task.task_id} 
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div className="flex-1">
              <div className="font-medium">{task.contact_name || 'Unbekannt'}</div>
              <div className="text-sm text-gray-600">
                {task.task_type} · Lead Score: {task.contact_lead_score}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 text-xs rounded-full ${
                task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {task.priority}
              </span>
              <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                Öffnen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// WEEK CHART (Simple Bar Chart)
// ============================================================================

const WeekChart: React.FC<{ data: WeekTimeseriesPoint[] }> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.flatMap(d => [d.leads, d.signups, d.first_messages]));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">📈 Diese Woche</h2>
      <div className="space-y-4">
        {data.map((point, idx) => (
          <div key={idx} className="flex items-center space-x-4">
            <div className="w-20 text-sm text-gray-600">
              {new Date(point.day).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' })}
            </div>
            <div className="flex-1 flex space-x-2">
              <div 
                className="bg-blue-500 h-8 rounded flex items-center justify-center text-white text-xs"
                style={{ width: `${(point.leads / maxValue) * 100}%`, minWidth: '30px' }}
              >
                {point.leads}L
              </div>
              <div 
                className="bg-purple-500 h-8 rounded flex items-center justify-center text-white text-xs"
                style={{ width: `${(point.first_messages / maxValue) * 100}%`, minWidth: '30px' }}
              >
                {point.first_messages}M
              </div>
              <div 
                className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-xs"
                style={{ width: `${(point.signups / maxValue) * 100}%`, minWidth: '30px' }}
              >
                {point.signups}S
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Leads</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded"></div>
          <span>Nachrichten</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Signups</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TOP TEMPLATES TABLE
// ============================================================================

const TopTemplatesTable: React.FC<{ templates: TopTemplate[] }> = ({ templates }) => {
  if (!templates || templates.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">🏆 Top Templates (30 Tage)</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Template</th>
              <th className="text-center py-2">Kontaktiert</th>
              <th className="text-center py-2">Signups</th>
              <th className="text-center py-2">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {templates.slice(0, 5).map((template, idx) => (
              <tr key={template.template_id} className="border-b hover:bg-gray-50">
                <td className="py-3">
                  <div className="font-medium">{template.title}</div>
                  <div className="text-sm text-gray-600">{template.channel}</div>
                </td>
                <td className="text-center">{template.contacts_contacted}</td>
                <td className="text-center">{template.contacts_signed}</td>
                <td className="text-center">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {template.conversion_rate_percent}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// SQUAD COACH PANEL
// ============================================================================

const SquadCoachPanel: React.FC<{ 
  topNetworkers: TopNetworker[]; 
  needsHelp: NeedsHelpRep[] 
}> = ({ topNetworkers, needsHelp }) => {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Top Networkers */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">⭐ Top Performer</h2>
        <div className="space-y-3">
          {topNetworkers?.map((networker, idx) => (
            <div key={networker.user_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium">{networker.name}</div>
                <div className="text-sm text-gray-600">
                  {networker.contacts_contacted} Kontakte · {networker.contacts_signed} Signups
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  {networker.conversion_rate_percent}%
                </div>
                <div className="text-xs text-gray-600">
                  🔥 {networker.current_streak} Tage Streak
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Needs Help */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">🆘 Brauchen Support</h2>
        <div className="space-y-3">
          {needsHelp?.map((rep) => (
            <div key={rep.user_id} className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg">
              <div>
                <div className="font-medium">{rep.name}</div>
                <div className="text-sm text-gray-600">
                  {rep.contacts_contacted} Kontakte · {rep.contacts_signed} Signups
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-orange-600">
                  {rep.conversion_rate_percent}%
                </div>
                <button className="mt-1 px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700">
                  Coaching
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export const DashboardPage: React.FC<DashboardPageProps> = ({ workspaceId }) => {
  const dashboard = useDashboard(workspaceId);

  if (dashboard.isLoading) {
    return <LoadingSpinner />;
  }

  if (dashboard.hasError) {
    return (
      <ErrorMessage 
        message="Dashboard konnte nicht geladen werden" 
        onRetry={dashboard.refetchAll}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Sales Flow Dashboard</h1>
          <button 
            onClick={dashboard.refetchAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>Aktualisieren</span>
          </button>
        </div>

        {/* Today Overview */}
        <TodayOverviewCard data={dashboard.todayOverview} />

        {/* Today Tasks */}
        <TodayTasksList tasks={dashboard.todayTasks} />

        {/* Week Chart */}
        <WeekChart data={dashboard.weekTimeseries} />

        {/* Top Templates */}
        <TopTemplatesTable templates={dashboard.topTemplates} />

        {/* Squad Coach */}
        <SquadCoachPanel 
          topNetworkers={dashboard.topNetworkers}
          needsHelp={dashboard.needsHelp}
        />

        {/* Funnel Stats Footer */}
        {dashboard.funnelStats && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-3">⏱️ Funnel Statistiken</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboard.funnelStats.avg_days_to_signup.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Ø Tage bis Signup</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {dashboard.funnelStats.median_days_to_signup.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Median</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {dashboard.funnelStats.min_days_to_signup.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Schnellste</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {dashboard.funnelStats.contacts_with_signup}
                </div>
                <div className="text-sm text-gray-600">Total Conversions</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

