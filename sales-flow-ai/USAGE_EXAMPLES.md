# 📚 Sales Flow AI - Dashboard Analytics Usage Examples

## Übersicht

Praktische Code-Beispiele für die Verwendung der Dashboard Analytics in deiner React/Next.js App.

---

## 🎯 1. Basic Usage: Complete Dashboard

### Next.js App Router (Recommended)

```tsx
// app/dashboard/page.tsx
'use client';

import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user, workspace } = useAuth();
  
  if (!workspace?.id) {
    return <div>Loading workspace...</div>;
  }
  
  return <DashboardPage workspaceId={workspace.id} />;
}
```

---

## 📊 2. Individual Hooks Usage

### Nur Today Overview anzeigen

```tsx
// components/TodayWidget.tsx
import { useTodayOverview } from '@/hooks/useDashboardData';

export function TodayWidget({ workspaceId }: { workspaceId: string }) {
  const { data, state, error, refetch } = useTodayOverview(workspaceId);
  
  if (state === 'loading') return <div>Loading...</div>;
  if (state === 'error') return <div>Error: {error?.message}</div>;
  if (!data) return null;
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <h3>Tasks Heute</h3>
        <p className="text-2xl font-bold">{data.tasks_due_today}</p>
      </div>
      <div>
        <h3>Leads</h3>
        <p className="text-2xl font-bold">{data.leads_created_today}</p>
      </div>
      <div>
        <h3>Signups</h3>
        <p className="text-2xl font-bold">{data.signups_today}</p>
      </div>
    </div>
  );
}
```

---

## 📈 3. Auto-Refresh Dashboard

```tsx
// components/AutoRefreshDashboard.tsx
import { useDashboardRefresh } from '@/hooks/useDashboardData';

export function AutoRefreshDashboard({ workspaceId }: { workspaceId: string }) {
  // Auto-refresh every 60 seconds
  const dashboard = useDashboardRefresh(workspaceId, 60000);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Dashboard (Auto-Refresh)</h1>
        <button 
          onClick={dashboard.refetchAll}
          disabled={dashboard.isLoading}
        >
          {dashboard.isLoading ? 'Refreshing...' : 'Refresh Now'}
        </button>
      </div>
      
      {/* Your dashboard UI */}
      <TodayOverview data={dashboard.todayOverview} />
      <WeekChart data={dashboard.weekTimeseries} />
    </div>
  );
}
```

---

## 🎨 4. Custom KPI Cards

```tsx
// components/KPICard.tsx
interface KPICardProps {
  title: string;
  value: number | string;
  change?: number;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function KPICard({ title, value, change, icon, trend }: KPICardProps) {
  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  }[trend || 'neutral'];
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      {change !== undefined && (
        <div className={`mt-2 text-sm ${trendColor}`}>
          {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}

// Usage:
function Dashboard() {
  const { data } = useTodayOverview(workspaceId);
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <KPICard 
        title="Leads Heute"
        value={data?.leads_created_today || 0}
        icon="👥"
        trend="up"
        change={12}
      />
      <KPICard 
        title="Signups"
        value={data?.signups_today || 0}
        icon="✅"
        trend="up"
        change={8}
      />
    </div>
  );
}
```

---

## 📅 5. Week Chart mit Recharts

```tsx
// components/WeekChart.tsx
import { useWeekTimeseries } from '@/hooks/useDashboardData';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function WeekChart({ workspaceId }: { workspaceId: string }) {
  const { data, state } = useWeekTimeseries(workspaceId);
  
  if (state === 'loading') return <div>Loading chart...</div>;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Diese Woche</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis 
            dataKey="day" 
            tickFormatter={(date) => new Date(date).toLocaleDateString('de-DE', { weekday: 'short' })}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="leads" stroke="#3b82f6" name="Leads" />
          <Line type="monotone" dataKey="first_messages" stroke="#8b5cf6" name="Nachrichten" />
          <Line type="monotone" dataKey="signups" stroke="#10b981" name="Signups" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 🏆 6. Top Templates Leaderboard

```tsx
// components/TopTemplatesLeaderboard.tsx
import { useTopTemplates } from '@/hooks/useDashboardData';

export function TopTemplatesLeaderboard({ workspaceId }: { workspaceId: string }) {
  const { data, state } = useTopTemplates(workspaceId, 30, 10);
  
  if (state === 'loading') return <div>Loading...</div>;
  if (!data || data.length === 0) return <div>No templates yet</div>;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">🏆 Top Templates (30 Tage)</h2>
      <div className="space-y-3">
        {data.map((template, index) => (
          <div 
            key={template.template_id} 
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-gray-400">
                #{index + 1}
              </div>
              <div>
                <div className="font-medium">{template.title}</div>
                <div className="text-sm text-gray-600">
                  {template.contacts_contacted} Kontakte · {template.channel}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600">
                {template.conversion_rate_percent}%
              </div>
              <div className="text-sm text-gray-600">
                {template.contacts_signed} Signups
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 👥 7. Squad Coach Panel

```tsx
// components/SquadCoachPanel.tsx
import { useTopNetworkers, useNeedsHelp } from '@/hooks/useDashboardData';

export function SquadCoachPanel({ workspaceId }: { workspaceId: string }) {
  const topNetworkers = useTopNetworkers(workspaceId, 30, 5);
  const needsHelp = useNeedsHelp(workspaceId, 30, 10, 5);
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Top Performers */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="mr-2">⭐</span> Top Performer
        </h2>
        {topNetworkers.data?.map((rep) => (
          <div key={rep.user_id} className="flex items-center justify-between p-3 border-b">
            <div>
              <div className="font-medium">{rep.name}</div>
              <div className="text-sm text-gray-600">
                🔥 {rep.current_streak} Tage Streak · {rep.active_days} aktive Tage
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">
                {rep.conversion_rate_percent}%
              </div>
              <div className="text-sm text-gray-600">
                {rep.contacts_signed}/{rep.contacts_contacted}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Needs Help */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="mr-2">🆘</span> Brauchen Support
        </h2>
        {needsHelp.data?.map((rep) => (
          <div key={rep.user_id} className="flex items-center justify-between p-3 border-b">
            <div>
              <div className="font-medium">{rep.name}</div>
              <div className="text-sm text-gray-600">
                {rep.contacts_contacted} Kontakte · {rep.active_days} aktive Tage
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-orange-600">
                {rep.conversion_rate_percent}%
              </div>
              <button className="mt-1 px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700">
                Coaching starten
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ⚡ 8. Performance Optimization: React Query

Falls du React Query verwenden möchtest für besseres Caching:

```tsx
// hooks/useDashboardWithReactQuery.ts
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useTodayOverviewQuery(workspaceId: string) {
  return useQuery({
    queryKey: ['today-overview', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('dashboard_today_overview', { p_workspace_id: workspaceId })
        .single();
      
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

// Usage:
function Dashboard({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, error } = useTodayOverviewQuery(workspaceId);
  
  // ...
}
```

---

## 🔒 9. Access Control

```tsx
// components/ProtectedDashboard.tsx
import { useAuth } from '@/hooks/useAuth';
import { DashboardPage } from '@/components/dashboard/DashboardPage';

export function ProtectedDashboard() {
  const { user, workspace, role } = useAuth();
  
  // Check permissions
  if (!user) {
    return <div>Please login first</div>;
  }
  
  if (!workspace) {
    return <div>No workspace selected</div>;
  }
  
  // Role-based rendering
  const canViewSquadCoach = ['admin', 'manager'].includes(role);
  
  return (
    <DashboardPage 
      workspaceId={workspace.id}
      enableSquadCoach={canViewSquadCoach}
    />
  );
}
```

---

## 📱 10. Mobile Responsive Dashboard

```tsx
// components/ResponsiveDashboard.tsx
import { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboardData';

export function ResponsiveDashboard({ workspaceId }: { workspaceId: string }) {
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'team'>('today');
  const dashboard = useDashboard(workspaceId);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Tabs */}
      <div className="md:hidden bg-white border-b">
        <div className="flex">
          <TabButton 
            active={activeTab === 'today'} 
            onClick={() => setActiveTab('today')}
          >
            Heute
          </TabButton>
          <TabButton 
            active={activeTab === 'week'} 
            onClick={() => setActiveTab('week')}
          >
            Woche
          </TabButton>
          <TabButton 
            active={activeTab === 'team'} 
            onClick={() => setActiveTab('team')}
          >
            Team
          </TabButton>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {activeTab === 'today' && <TodayView data={dashboard} />}
        {activeTab === 'week' && <WeekView data={dashboard} />}
        {activeTab === 'team' && <TeamView data={dashboard} />}
      </div>
    </div>
  );
}
```

---

## 🎉 11. Export Functionality

```tsx
// utils/exportDashboard.ts
export function exportToCSV(data: any[], filename: string) {
  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
}

// Usage in component:
function DashboardWithExport() {
  const { todayTasks } = useDashboard(workspaceId);
  
  return (
    <button onClick={() => exportToCSV(todayTasks, 'today-tasks')}>
      Export CSV
    </button>
  );
}
```

---

## 🚀 Next Steps

- ✅ Implementiere Error Boundaries
- ✅ Füge Skeleton Loading States hinzu
- ✅ Implementiere Real-time Updates mit Supabase Realtime
- ✅ Füge Push Notifications hinzu
- ✅ Erstelle PDF Reports
- ✅ Implementiere Advanced Filtering

---

## 📚 Weitere Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Recharts Docs](https://recharts.org/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

