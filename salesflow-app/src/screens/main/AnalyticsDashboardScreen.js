/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - ANALYTICS DASHBOARD                                       ║
 * ║  Überblick für Team-Leader: KPIs, Trends, Performance                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG, AnalyticsAPI } from '../../services/apiConfig';
import Card from '../../components/Card';
import { COLORS, SHADOWS, RADIUS, SPACING, TYPOGRAPHY } from '../../components/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AnalyticsDashboardScreen({ navigation }) {
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(30); // 7, 30, 90 Tage
  
  // Data
  const [kpiData, setKpiData] = useState(null);
  const [channelData, setChannelData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [topTemplates, setTopTemplates] = useState([]);
  
  // ═══════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════
  
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - dateRange);
    
    try {
      const [dashboard, channels, templates, timeseries] = await Promise.all([
        AnalyticsAPI.getDashboard(dateRange).catch(() => null),
        AnalyticsAPI.getChannels({
          fromDate: fromDate.toISOString().slice(0, 10),
          toDate: today.toISOString().slice(0, 10),
        }).catch(() => null),
        AnalyticsAPI.getTemplates({
          fromDate: fromDate.toISOString().slice(0, 10),
          toDate: today.toISOString().slice(0, 10),
          limit: 5,
        }).catch(() => null),
        AnalyticsAPI.getTimeSeries({
          fromDate: fromDate.toISOString().slice(0, 10),
          toDate: today.toISOString().slice(0, 10),
          granularity: dateRange <= 7 ? 'day' : 'week',
        }).catch(() => null),
      ]);
      
      // Process Dashboard KPIs
      if (dashboard) {
        setKpiData(dashboard);
      } else {
        // Demo Data
        setKpiData(generateDemoKPIs());
      }
      
      // Process Channel Data
      if (channels?.results) {
        setChannelData(channels.results);
      } else {
        setChannelData(generateDemoChannels());
      }
      
      // Process Templates
      if (templates?.results) {
        setTopTemplates(templates.results.slice(0, 5));
      } else {
        setTopTemplates(generateDemoTemplates());
      }
      
      // Process Trend Data
      if (timeseries?.results) {
        setTrendData(timeseries.results);
      } else {
        setTrendData(generateDemoTrends(dateRange));
      }
      
    } catch (e) {
      console.error('Analytics load error:', e);
      setError('Daten konnten nicht geladen werden');
      // Load demo data
      setKpiData(generateDemoKPIs());
      setChannelData(generateDemoChannels());
      setTopTemplates(generateDemoTemplates());
      setTrendData(generateDemoTrends(dateRange));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  
  if (loading && !kpiData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Lade Analytics...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📊 Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>Team-Performance auf einen Blick</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('TemplateAnalytics')}
        >
          <Text style={styles.headerButtonText}>Details →</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Date Range Selector */}
        <DateRangeSelector
          selected={dateRange}
          onSelect={(days) => setDateRange(days)}
        />
        
        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error} - Demo-Daten werden angezeigt</Text>
          </View>
        )}
        
        {/* KPI Cards */}
        {kpiData && <KPISection data={kpiData} />}
        
        {/* Trend Chart */}
        {trendData && trendData.length > 0 && (
          <TrendChart data={trendData} days={dateRange} />
        )}
        
        {/* Channel Performance */}
        {channelData && channelData.length > 0 && (
          <ChannelSection data={channelData} />
        )}
        
        {/* Top Templates */}
        {topTemplates.length > 0 && (
          <TopTemplatesSection
            templates={topTemplates}
            onViewAll={() => navigation.navigate('TemplateAnalytics')}
          />
        )}
        
        {/* Quick Actions */}
        <QuickActionsSection navigation={navigation} />
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function DateRangeSelector({ selected, onSelect }) {
  const ranges = [
    { days: 7, label: '7 Tage' },
    { days: 30, label: '30 Tage' },
    { days: 90, label: '90 Tage' },
  ];
  
  return (
    <View style={styles.dateRangeContainer}>
      {ranges.map((range) => (
        <TouchableOpacity
          key={range.days}
          style={[
            styles.dateRangeButton,
            selected === range.days && styles.dateRangeButtonActive,
          ]}
          onPress={() => onSelect(range.days)}
        >
          <Text
            style={[
              styles.dateRangeText,
              selected === range.days && styles.dateRangeTextActive,
            ]}
          >
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function KPISection({ data }) {
  const kpis = [
    {
      icon: '📤',
      label: 'Gesendet',
      value: formatNumber(data.total_sent || 0),
      color: COLORS.primary,
    },
    {
      icon: '💬',
      label: 'Reply-Rate',
      value: formatPercent(data.reply_rate),
      subtitle: `${formatNumber(data.total_replied || 0)} Antworten`,
      color: COLORS.success,
      trend: data.reply_rate_trend,
    },
    {
      icon: '🎯',
      label: 'Win-Rate',
      value: formatPercent(data.win_rate),
      subtitle: `${formatNumber(data.total_deals || 0)} Deals`,
      color: '#f59e0b',
      trend: data.win_rate_trend,
    },
    {
      icon: '⚡',
      label: 'Avg. Response',
      value: data.avg_response_time ? `${data.avg_response_time}h` : '-',
      color: COLORS.info,
    },
  ];
  
  return (
    <View style={styles.kpiSection}>
      <Text style={styles.sectionTitle}>📈 Key Metrics</Text>
      <View style={styles.kpiGrid}>
        {kpis.map((kpi, index) => (
          <Card key={index} style={styles.kpiCard}>
            <Text style={styles.kpiIcon}>{kpi.icon}</Text>
            <Text style={[styles.kpiValue, { color: kpi.color }]}>
              {kpi.value}
            </Text>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
            {kpi.subtitle && (
              <Text style={styles.kpiSubtitle}>{kpi.subtitle}</Text>
            )}
            {kpi.trend !== undefined && (
              <View style={styles.trendBadge}>
                <Text style={[
                  styles.trendText,
                  { color: kpi.trend >= 0 ? COLORS.success : COLORS.error }
                ]}>
                  {kpi.trend >= 0 ? '↑' : '↓'} {Math.abs(kpi.trend).toFixed(1)}%
                </Text>
              </View>
            )}
          </Card>
        ))}
      </View>
    </View>
  );
}

function TrendChart({ data, days }) {
  const chartData = {
    labels: data.slice(-7).map(d => {
      const date = new Date(d.period_start);
      return `${date.getDate()}.${date.getMonth() + 1}`;
    }),
    datasets: [
      {
        data: data.slice(-7).map(d => (d.reply_rate || 0) * 100),
        color: () => COLORS.success,
        strokeWidth: 2,
      },
    ],
  };
  
  const chartConfig = {
    backgroundColor: COLORS.card,
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: () => COLORS.textSecondary,
    style: { borderRadius: 16 },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: COLORS.border,
      strokeWidth: 1,
    },
  };
  
  return (
    <View style={styles.chartSection}>
      <Text style={styles.sectionTitle}>📉 Reply-Rate Trend ({days} Tage)</Text>
      <Card style={styles.chartCard}>
        <LineChart
          data={chartData}
          width={CHART_WIDTH}
          height={180}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix="%"
        />
      </Card>
    </View>
  );
}

function ChannelSection({ data }) {
  const CHANNEL_LABELS = {
    instagram_dm: '📸 Instagram',
    whatsapp: '💬 WhatsApp',
    facebook_dm: '👤 Facebook',
    linkedin_dm: '💼 LinkedIn',
    email: '📧 E-Mail',
  };
  
  // Sort by win rate
  const sortedChannels = [...data].sort((a, b) => 
    (b.win_rate || 0) - (a.win_rate || 0)
  );
  
  return (
    <View style={styles.channelSection}>
      <Text style={styles.sectionTitle}>📱 Kanal-Performance</Text>
      
      {sortedChannels.slice(0, 5).map((channel, index) => (
        <Card key={index} style={styles.channelCard}>
          <View style={styles.channelRow}>
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>
                {CHANNEL_LABELS[channel.channel] || channel.channel}
              </Text>
              <Text style={styles.channelSent}>
                {formatNumber(channel.events_sent)} gesendet
              </Text>
            </View>
            
            <View style={styles.channelStats}>
              <View style={styles.channelStat}>
                <Text style={[styles.channelStatValue, { color: COLORS.success }]}>
                  {formatPercent(channel.reply_rate)}
                </Text>
                <Text style={styles.channelStatLabel}>Reply</Text>
              </View>
              <View style={styles.channelStat}>
                <Text style={[styles.channelStatValue, { color: '#f59e0b' }]}>
                  {formatPercent(channel.win_rate)}
                </Text>
                <Text style={styles.channelStatLabel}>Win</Text>
              </View>
            </View>
          </View>
          
          {/* Mini Progress Bar */}
          <View style={styles.channelProgressBar}>
            <View 
              style={[
                styles.channelProgressFill,
                { 
                  width: `${Math.min((channel.win_rate || 0) * 100 * 5, 100)}%`,
                  backgroundColor: getChannelColor(index),
                }
              ]} 
            />
          </View>
        </Card>
      ))}
    </View>
  );
}

function TopTemplatesSection({ templates, onViewAll }) {
  return (
    <View style={styles.templatesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🏆 Top Templates</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllText}>Alle →</Text>
        </TouchableOpacity>
      </View>
      
      {templates.map((template, index) => (
        <Card key={index} style={styles.templateCard}>
          <View style={styles.templateRow}>
            <View style={styles.templateRank}>
              <Text style={styles.templateRankText}>#{index + 1}</Text>
            </View>
            <View style={styles.templateInfo}>
              <Text style={styles.templateName} numberOfLines={1}>
                {template.template_name || 'Ohne Name'}
              </Text>
              <Text style={styles.templateMeta}>
                {formatNumber(template.events_sent)} gesendet
              </Text>
            </View>
            <View style={styles.templateStats}>
              <Text style={[styles.templateStat, { color: COLORS.success }]}>
                {formatPercent(template.reply_rate)}
              </Text>
              <Text style={styles.templateStatLabel}>Reply</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function QuickActionsSection({ navigation }) {
  const actions = [
    { 
      icon: '📊', 
      label: 'Template Details', 
      onPress: () => navigation.navigate('TemplateAnalytics'),
      color: COLORS.primary,
    },
    { 
      icon: '🏆', 
      label: 'Team Ranking', 
      onPress: () => navigation.navigate('TeamPerformance'),
      color: COLORS.success,
    },
    { 
      icon: '🎯', 
      label: 'Daily Flow', 
      onPress: () => navigation.navigate('DailyFlow'),
      color: '#f59e0b',
    },
  ];
  
  return (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickActionButton}
            onPress={action.onPress}
          >
            <Text style={styles.quickActionIcon}>{action.icon}</Text>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatNumber(num) {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString('de-DE');
}

function formatPercent(rate) {
  if (rate === null || rate === undefined) return '-';
  return `${(rate * 100).toFixed(1)}%`;
}

function getChannelColor(index) {
  const colors = [COLORS.primary, COLORS.success, '#f59e0b', '#8b5cf6', '#ec4899'];
  return colors[index % colors.length];
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO DATA GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

function generateDemoKPIs() {
  return {
    total_sent: 847,
    total_replied: 312,
    total_deals: 47,
    reply_rate: 0.368,
    win_rate: 0.055,
    reply_rate_trend: 4.2,
    win_rate_trend: -1.3,
    avg_response_time: 2.4,
  };
}

function generateDemoChannels() {
  return [
    { channel: 'whatsapp', events_sent: 234, reply_rate: 0.45, win_rate: 0.12 },
    { channel: 'instagram_dm', events_sent: 312, reply_rate: 0.38, win_rate: 0.08 },
    { channel: 'linkedin_dm', events_sent: 145, reply_rate: 0.32, win_rate: 0.15 },
    { channel: 'facebook_dm', events_sent: 98, reply_rate: 0.28, win_rate: 0.06 },
    { channel: 'email', events_sent: 58, reply_rate: 0.19, win_rate: 0.04 },
  ];
}

function generateDemoTemplates() {
  return [
    { template_name: 'Erstkontakt Warm', events_sent: 145, reply_rate: 0.42, win_rate: 0.09 },
    { template_name: 'Follow-up Tag 3', events_sent: 98, reply_rate: 0.38, win_rate: 0.12 },
    { template_name: 'Story Reaktion', events_sent: 89, reply_rate: 0.45, win_rate: 0.07 },
    { template_name: 'Einladung Call', events_sent: 67, reply_rate: 0.35, win_rate: 0.15 },
    { template_name: 'Reactivation', events_sent: 45, reply_rate: 0.22, win_rate: 0.05 },
  ];
}

function generateDemoTrends(days) {
  const trends = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    trends.push({
      period_start: date.toISOString().slice(0, 10),
      events_sent: Math.floor(Math.random() * 30) + 20,
      reply_rate: 0.25 + Math.random() * 0.2,
      win_rate: 0.04 + Math.random() * 0.06,
    });
  }
  
  return trends;
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xl,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  headerButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // Date Range
  dateRangeContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
  },
  dateRangeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  dateRangeText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dateRangeTextActive: {
    color: COLORS.white,
  },
  
  // Error
  errorBanner: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  errorText: {
    color: COLORS.text,
    fontSize: 13,
    textAlign: 'center',
  },
  
  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  viewAllText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // KPIs
  kpiSection: {
    padding: SPACING.lg,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2,
    padding: SPACING.md,
    alignItems: 'center',
  },
  kpiIcon: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  kpiSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  trendBadge: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Chart
  chartSection: {
    padding: SPACING.lg,
  },
  chartCard: {
    padding: SPACING.sm,
  },
  chart: {
    borderRadius: RADIUS.lg,
  },
  
  // Channels
  channelSection: {
    padding: SPACING.lg,
  },
  channelCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  channelSent: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  channelStats: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  channelStat: {
    alignItems: 'flex-end',
  },
  channelStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  channelStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  channelProgressBar: {
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  channelProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  
  // Templates
  templatesSection: {
    padding: SPACING.lg,
  },
  templateCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  templateRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  templateMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  templateStats: {
    alignItems: 'flex-end',
  },
  templateStat: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  templateStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  
  // Quick Actions
  quickActionsSection: {
    padding: SPACING.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  quickActionLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  bottomSpacer: {
    height: 100,
  },
});

