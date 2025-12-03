import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, MessageSquare, Eye, Reply, Clock } from 'lucide-react';
import { api } from '@/lib/api';

export default function FollowUpAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/followups/analytics?days=${timeRange}`);
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return <div>Keine Daten verfügbar</div>;
  }

  const overall = analytics.overall || {};
  const channelPerformance = analytics.channel_performance || [];
  const weeklyTrend = analytics.weekly_trend || [];
  const playbookPerformance = analytics.playbook_performance || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">📊 Follow-up Analytics</h1>
          <p className="text-gray-500">Komplette Übersicht deiner Follow-up Performance</p>
        </div>
        
        <Tabs value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
          <TabsList>
            <TabsTrigger value="7">7 Tage</TabsTrigger>
            <TabsTrigger value="30">30 Tage</TabsTrigger>
            <TabsTrigger value="90">90 Tage</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Gesendet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overall.total_sent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Zugestellt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overall.total_delivered || 0}</div>
            <div className="text-sm text-green-600">{overall.delivery_rate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Geöffnet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overall.total_opened || 0}</div>
            <div className="text-sm text-blue-600">{overall.open_rate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Reply className="h-4 w-4" />
              Beantwortet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overall.total_responded || 0}</div>
            <div className="text-sm text-purple-600">{overall.response_rate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ø Antwortzeit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overall.avg_response_hours || 0}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
          <CardDescription>Vergleich der verschiedenen Kommunikationskanäle</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="response_rate_percent" fill="#3b82f6" name="Response Rate %" />
              <Bar dataKey="open_rate_percent" fill="#10b981" name="Open Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity Trend</CardTitle>
          <CardDescription>Follow-up Aktivität über die letzten Wochen</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="week_start" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('de-DE')}
              />
              <Legend />
              <Line type="monotone" dataKey="message_count" stroke="#3b82f6" name="Nachrichten" />
              <Line type="monotone" dataKey="responded_count" stroke="#10b981" name="Antworten" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Playbook Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Playbook Performance</CardTitle>
          <CardDescription>Erfolgsrate der verschiedenen Follow-up Playbooks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {playbookPerformance.map((playbook: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold">{playbook.playbook_name}</div>
                  <div className="text-sm text-gray-500">
                    {playbook.category} • {playbook.usage_count} Verwendungen
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {playbook.success_rate_percent || 0}%
                  </div>
                  <div className="text-xs text-gray-500">Success Rate</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* GPT vs Human */}
      <Card>
        <CardHeader>
          <CardTitle>🤖 GPT vs. Human Messages</CardTitle>
          <CardDescription>Vergleich zwischen KI-generierten und manuellen Nachrichten</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-blue-50 rounded-lg text-center">
              <div className="text-sm text-gray-600 mb-2">GPT-generiert</div>
              <div className="text-4xl font-bold text-blue-600">
                {overall.gpt_generated_count || 0}
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <div className="text-sm text-gray-600 mb-2">Manuell erstellt</div>
              <div className="text-4xl font-bold text-gray-600">
                {overall.human_generated_count || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

