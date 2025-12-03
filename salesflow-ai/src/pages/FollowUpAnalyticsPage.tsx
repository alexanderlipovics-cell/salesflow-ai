import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Clock, MessageSquare, CheckCircle } from 'lucide-react';

interface ChannelPerformance {
  channel: string;
  total_sent: number;
  opened_count: number;
  responded_count: number;
  open_rate_percent: number;
  response_rate_percent: number;
  avg_response_time_hours: number;
}

interface WeeklyActivity {
  week_start: string;
  message_count: number;
  channel: string;
}

interface ResponseHeatmap {
  channel: string;
  weekday: number;
  hour: number;
  response_count: number;
}

interface Analytics {
  channel_performance: ChannelPerformance[];
  weekly_activity: WeeklyActivity[];
  response_heatmap: ResponseHeatmap[];
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export default function FollowUpAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/followups/analytics?days=30', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }
      
      const result = await response.json();
      setAnalytics(result.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'whatsapp':
        return '📱';
      case 'email':
        return '📧';
      case 'in_app':
        return '💬';
      default:
        return '📤';
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'whatsapp':
        return 'bg-green-500';
      case 'email':
        return 'bg-blue-500';
      case 'in_app':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading || !analytics) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Lade Analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            📊 Follow-up Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Tracking & Performance der letzten 30 Tage
          </p>
        </div>
        <Button 
          onClick={loadAnalytics} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Channel Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {analytics.channel_performance.map((channel, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-2xl">{getChannelIcon(channel.channel)}</span>
                <span className="capitalize">{channel.channel}</span>
              </CardTitle>
              <CardDescription>Performance Übersicht</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total Sent */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Gesamt gesendet</span>
                <span className="text-xl font-bold">{channel.total_sent}</span>
              </div>

              {/* Response Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Response Rate
                  </span>
                  <span className="text-lg font-semibold text-green-600">
                    {channel.response_rate_percent?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getChannelColor(channel.channel)}`}
                    style={{ width: `${Math.min(channel.response_rate_percent || 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Open Rate */}
              {channel.open_rate_percent > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      Open Rate
                    </span>
                    <span className="text-lg font-semibold text-blue-600">
                      {channel.open_rate_percent?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(channel.open_rate_percent || 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Avg Response Time */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Ø Response Zeit
                </span>
                <span className="text-sm font-medium">
                  {channel.avg_response_time_hours?.toFixed(1) || 0}h
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Activity Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Wöchentliche Aktivität
          </CardTitle>
          <CardDescription>Follow-up Messages der letzten Wochen</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.weekly_activity.length > 0 ? (
            <div className="space-y-4">
              {/* Group by week */}
              {Array.from(new Set(analytics.weekly_activity.map(w => w.week_start)))
                .slice(0, 8)
                .map((week, idx) => {
                  const weekData = analytics.weekly_activity.filter(w => w.week_start === week);
                  const total = weekData.reduce((sum, w) => sum + w.message_count, 0);
                  
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          KW {new Date(week).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-gray-500">{total} Messages</span>
                      </div>
                      <div className="flex gap-1 h-8">
                        {weekData.map((data, i) => (
                          <div 
                            key={i}
                            className={`flex-1 rounded ${getChannelColor(data.channel)} opacity-80 hover:opacity-100 transition-opacity`}
                            title={`${data.channel}: ${data.message_count}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Noch keine Aktivitätsdaten vorhanden
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Heatmap Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⏰ Beste Response-Zeiten
          </CardTitle>
          <CardDescription>
            Wann antworten Leads am häufigsten? (Coming Soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.response_heatmap.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Top Response-Zeiten basierend auf historischen Daten:
              </p>
              
              {/* Simple list view for now */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from(new Set(analytics.response_heatmap.map(h => `${h.weekday}-${h.hour}`)))
                  .slice(0, 8)
                  .map((key, idx) => {
                    const [weekday, hour] = key.split('-').map(Number);
                    const data = analytics.response_heatmap.find(h => h.weekday === weekday && h.hour === hour);
                    
                    return (
                      <div key={idx} className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700">
                          {WEEKDAYS[weekday]}
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {hour}:00
                        </div>
                        <div className="text-xs text-gray-500">
                          {data?.response_count || 0} Responses
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Noch keine Heatmap-Daten vorhanden
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {analytics.channel_performance.reduce((sum, c) => sum + c.total_sent, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Messages</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {analytics.channel_performance.reduce((sum, c) => sum + c.responded_count, 0)}
              </div>
              <div className="text-sm text-gray-500">Responses</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">
                {(
                  analytics.channel_performance.reduce((sum, c) => sum + c.response_rate_percent, 0) / 
                  Math.max(analytics.channel_performance.length, 1)
                ).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Ø Response Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">
                {(
                  analytics.channel_performance.reduce((sum, c) => sum + (c.avg_response_time_hours || 0), 0) / 
                  Math.max(analytics.channel_performance.filter(c => c.avg_response_time_hours > 0).length, 1)
                ).toFixed(1)}h
              </div>
              <div className="text-sm text-gray-500">Ø Response Zeit</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

