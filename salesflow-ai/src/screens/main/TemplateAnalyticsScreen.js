/**
 * TemplateAnalyticsScreen
 * ========================
 * Analytics Dashboard für Template-Performance
 * Teil 2 des Learning Systems - zeigt Conversion-Daten pro Template & Kanal
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import Card from '../../components/Card';
import { COLORS, SHADOWS, RADIUS, SPACING, TYPOGRAPHY } from '../../components/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

// =============================================================================
// IMPORTS - API CONFIG
// =============================================================================

import { API_CONFIG, AnalyticsAPI } from '../../services/apiConfig';

// =============================================================================
// TYPES & CONFIG
// =============================================================================

const CHANNEL_LABELS = {
  instagram_dm: 'Instagram',
  facebook_dm: 'Facebook',
  whatsapp: 'WhatsApp',
  linkedin_dm: 'LinkedIn',
  email: 'E-Mail',
};

const VERTICAL_LABELS = {
  network_marketing: 'Network Marketing',
  real_estate: 'Immobilien',
  insurance: 'Versicherung',
  coaching: 'Coaching',
};

const CONFIDENCE_COLORS = {
  high: COLORS.success,
  medium: COLORS.warning,
  low: COLORS.textMuted,
};

// =============================================================================
// API FUNCTIONS (using centralized API config)
// =============================================================================

async function fetchTemplateAnalytics({
  fromDate,
  toDate,
  verticalId,
  channel,
  limit = 50,
}) {
  return AnalyticsAPI.getTemplates({ fromDate, toDate, verticalId, channel, limit });
}

async function fetchChannelAnalytics({ fromDate, toDate, verticalId }) {
  return AnalyticsAPI.getChannels({ fromDate, toDate, verticalId });
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TemplateAnalyticsScreen({ navigation }) {
  const { user } = useAuth();
  
  // State
  const [filters, setFilters] = useState({
    fromDate: null,
    toDate: null,
    verticalId: null,
    channel: null,
  });
  const [templateData, setTemplateData] = useState(null);
  const [channelData, setChannelData] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  // Derived State
  const selectedTemplate = useMemo(
    () => templateData?.results?.find((t) => t.template_id === selectedTemplateId) ?? null,
    [templateData, selectedTemplateId]
  );

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [templ, chan] = await Promise.all([
        fetchTemplateAnalytics({
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          verticalId: filters.verticalId,
          channel: filters.channel,
        }),
        fetchChannelAnalytics({
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          verticalId: filters.verticalId,
        }),
      ]);

      setTemplateData(templ);
      setChannelData(chan);

      // Auto-select first template
      if (!selectedTemplateId && templ.results?.length > 0) {
        setSelectedTemplateId(templ.results[0].template_id ?? null);
      }
    } catch (e) {
      console.error('Analytics fetch error:', e);
      setError(e.message ?? 'Fehler beim Laden der Daten');
      // Demo-Daten für Entwicklung
      setTemplateData(generateDemoData());
      setChannelData(generateDemoChannelData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, selectedTemplateId]);

  useEffect(() => {
    // Set default date range (last 30 days)
    if (!filters.fromDate && !filters.toDate) {
      const today = new Date();
      const last30 = new Date();
      last30.setDate(today.getDate() - 30);
      setFilters({
        fromDate: last30.toISOString().slice(0, 10),
        toDate: today.toISOString().slice(0, 10),
        verticalId: null,
        channel: null,
      });
      return;
    }
    loadData();
  }, [filters.fromDate, filters.toDate, filters.verticalId, filters.channel]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📊 Template Analytics</Text>
          <Text style={styles.headerSubtitle}>Performance-Daten deiner Vorlagen</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerButtonText}>← Zurück</Text>
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
        {/* Filter Section */}
        <FilterSection
          filters={filters}
          setFilters={setFilters}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />

        {/* Error Message */}
        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>Demo-Daten werden angezeigt</Text>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Lade Analytics...</Text>
          </View>
        )}

        {/* KPI Overview */}
        {!loading && templateData && (
          <KpiOverview
            templateData={templateData}
            channelData={channelData}
          />
        )}

        {/* Template List */}
        {!loading && templateData && (
          <TemplateList
            templates={templateData.results || []}
            selectedId={selectedTemplateId}
            onSelect={setSelectedTemplateId}
          />
        )}

        {/* Template Detail */}
        {!loading && selectedTemplate && (
          <TemplateDetail template={selectedTemplate} />
        )}

        {/* Channel Comparison Chart */}
        {!loading && channelData?.results?.length > 0 && (
          <ChannelComparisonChart channels={channelData.results} />
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// =============================================================================
// FILTER SECTION
// =============================================================================

function FilterSection({ filters, setFilters, activeFilter, setActiveFilter }) {
  const dateRanges = [
    { label: '7 Tage', days: 7 },
    { label: '30 Tage', days: 30 },
    { label: '90 Tage', days: 90 },
  ];

  const channels = [
    { value: null, label: 'Alle Kanäle' },
    { value: 'instagram_dm', label: '📸 Instagram' },
    { value: 'whatsapp', label: '💬 WhatsApp' },
    { value: 'facebook_dm', label: '👤 Facebook' },
    { value: 'linkedin_dm', label: '💼 LinkedIn' },
    { value: 'email', label: '📧 E-Mail' },
  ];

  const setDateRange = (days) => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - days);
    setFilters({
      ...filters,
      fromDate: from.toISOString().slice(0, 10),
      toDate: today.toISOString().slice(0, 10),
    });
  };

  const getDaysFromFilter = () => {
    if (!filters.fromDate || !filters.toDate) return 30;
    const from = new Date(filters.fromDate);
    const to = new Date(filters.toDate);
    return Math.round((to - from) / (1000 * 60 * 60 * 24));
  };

  return (
    <Card style={styles.filterCard}>
      <Text style={styles.filterTitle}>🎯 Zeitraum</Text>
      <View style={styles.filterRow}>
        {dateRanges.map((range) => {
          const isActive = getDaysFromFilter() === range.days;
          return (
            <TouchableOpacity
              key={range.days}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setDateRange(range.days)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.filterTitle, { marginTop: SPACING.md }]}>📱 Kanal</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {channels.map((ch) => {
            const isActive = filters.channel === ch.value;
            return (
              <TouchableOpacity
                key={ch.value ?? 'all'}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilters({ ...filters, channel: ch.value })}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {ch.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </Card>
  );
}

// =============================================================================
// KPI OVERVIEW
// =============================================================================

function KpiOverview({ templateData, channelData }) {
  const {
    total_sent = 0,
    total_replied = 0,
    total_deals = 0,
    overall_reply_rate,
    overall_win_rate,
  } = templateData;

  // Best performing
  const bestChannel = channelData?.results
    ?.filter((c) => c.events_sent >= 20)
    ?.sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0))[0];

  const bestTemplate = templateData.results
    ?.filter((t) => t.events_sent >= 20)
    ?.sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0))[0];

  const kpis = [
    {
      icon: '📤',
      label: 'Gesendet',
      value: total_sent.toLocaleString('de-DE'),
      color: COLORS.primary,
    },
    {
      icon: '💬',
      label: 'Reply-Rate',
      value: overall_reply_rate != null ? `${(overall_reply_rate * 100).toFixed(1)}%` : '-',
      subtitle: `${total_replied.toLocaleString('de-DE')} Antworten`,
      color: COLORS.success,
    },
    {
      icon: '🎯',
      label: 'Win-Rate',
      value: overall_win_rate != null ? `${(overall_win_rate * 100).toFixed(1)}%` : '-',
      subtitle: `${total_deals.toLocaleString('de-DE')} Deals`,
      color: COLORS.secondary,
    },
  ];

  return (
    <View style={styles.kpiContainer}>
      <Text style={styles.sectionTitle}>📈 Übersicht</Text>
      
      {/* Main KPIs */}
      <View style={styles.kpiGrid}>
        {kpis.map((kpi, index) => (
          <Card key={index} style={styles.kpiCard}>
            <Text style={styles.kpiIcon}>{kpi.icon}</Text>
            <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
            {kpi.subtitle && <Text style={styles.kpiSubtitle}>{kpi.subtitle}</Text>}
          </Card>
        ))}
      </View>

      {/* Best Performers */}
      <View style={styles.bestPerformers}>
        {bestChannel && (
          <Card style={styles.bestCard}>
            <View style={styles.bestHeader}>
              <Text style={styles.bestIcon}>🏆</Text>
              <Text style={styles.bestLabel}>Bester Kanal</Text>
            </View>
            <Text style={styles.bestValue}>
              {CHANNEL_LABELS[bestChannel.channel] ?? bestChannel.channel}
            </Text>
            <Text style={styles.bestStat}>
              Win-Rate: {((bestChannel.win_rate ?? 0) * 100).toFixed(1)}%
            </Text>
          </Card>
        )}
        {bestTemplate && (
          <Card style={styles.bestCard}>
            <View style={styles.bestHeader}>
              <Text style={styles.bestIcon}>⭐</Text>
              <Text style={styles.bestLabel}>Top Template</Text>
            </View>
            <Text style={styles.bestValue} numberOfLines={1}>
              {bestTemplate.template_name?.slice(0, 18) ?? '-'}
            </Text>
            <Text style={styles.bestStat}>
              Win-Rate: {((bestTemplate.win_rate ?? 0) * 100).toFixed(1)}%
            </Text>
          </Card>
        )}
      </View>
    </View>
  );
}

// =============================================================================
// TEMPLATE LIST
// =============================================================================

function TemplateList({ templates, selectedId, onSelect }) {
  if (!templates || templates.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>Keine Daten im gewählten Zeitraum</Text>
      </Card>
    );
  }

  return (
    <View style={styles.templateListContainer}>
      <Text style={styles.sectionTitle}>📋 Template-Übersicht</Text>
      <Text style={styles.sectionSubtitle}>{templates.length} Einträge gefunden</Text>

      {templates.slice(0, 10).map((template, index) => {
        const isSelected = template.template_id === selectedId;
        
        return (
          <TouchableOpacity
            key={template.template_id ?? `${template.channel}-${index}`}
            onPress={() => onSelect(template.template_id)}
          >
            <Card
              style={[
                styles.templateCard,
                isSelected && styles.templateCardSelected,
              ]}
            >
              <View style={styles.templateRow}>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName} numberOfLines={1}>
                    {template.template_name ?? 'Ohne Name'}
                  </Text>
                  <View style={styles.templateMeta}>
                    <Text style={styles.templateChannel}>
                      {CHANNEL_LABELS[template.channel] ?? template.channel ?? '-'}
                    </Text>
                    {!template.has_enough_data && (
                      <View style={styles.lowDataBadge}>
                        <Text style={styles.lowDataText}>wenig Daten</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.templateStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{template.events_sent}</Text>
                    <Text style={styles.statLabel}>Sent</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: COLORS.success }]}>
                      {template.reply_rate != null
                        ? `${(template.reply_rate * 100).toFixed(0)}%`
                        : '-'}
                    </Text>
                    <Text style={styles.statLabel}>Reply</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: COLORS.secondary }]}>
                      {template.win_rate != null
                        ? `${(template.win_rate * 100).toFixed(0)}%`
                        : '-'}
                    </Text>
                    <Text style={styles.statLabel}>Win</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: COLORS.primaryDark }]}>
                      {template.events_deal_won}
                    </Text>
                    <Text style={styles.statLabel}>Deals</Text>
                  </View>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// =============================================================================
// TEMPLATE DETAIL
// =============================================================================

function TemplateDetail({ template }) {
  if (!template) return null;

  const funnelData = [
    { label: 'Vorgeschlagen', value: template.events_suggested, color: COLORS.textMuted },
    { label: 'Gesendet', value: template.events_sent, color: COLORS.primary },
    { label: 'Antworten', value: template.events_replied, color: COLORS.success },
    { label: 'Positive', value: template.events_positive_reply, color: COLORS.successLight },
    { label: 'Deals', value: template.events_deal_won, color: COLORS.secondary },
  ];

  const maxValue = Math.max(...funnelData.map((d) => d.value), 1);

  return (
    <View style={styles.detailContainer}>
      <Text style={styles.sectionTitle}>🔍 Template-Detail</Text>

      <Card style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailName} numberOfLines={2}>
            {template.template_name ?? template.template_id ?? 'Ohne Name'}
          </Text>
          <Text style={styles.detailMeta}>
            {CHANNEL_LABELS[template.channel] ?? template.channel ?? '-'} ·{' '}
            {VERTICAL_LABELS[template.vertical_id] ?? template.vertical_id ?? '-'}
          </Text>
        </View>

        {/* Conversion Funnel */}
        <Text style={styles.funnelTitle}>Conversion Funnel</Text>
        <View style={styles.funnelContainer}>
          {funnelData.map((item, index) => {
            const width = (item.value / maxValue) * 100;
            return (
              <View key={index} style={styles.funnelRow}>
                <Text style={styles.funnelLabel}>{item.label}</Text>
                <View style={styles.funnelBarBg}>
                  <View
                    style={[
                      styles.funnelBar,
                      {
                        width: `${Math.max(width, 2)}%`,
                        backgroundColor: item.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.funnelValue}>{item.value}</Text>
              </View>
            );
          })}
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{template.events_sent}</Text>
            <Text style={styles.quickStatLabel}>Gesendet</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: COLORS.success }]}>
              {template.reply_rate != null
                ? `${(template.reply_rate * 100).toFixed(1)}%`
                : '-'}
            </Text>
            <Text style={styles.quickStatLabel}>Reply-Rate</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: COLORS.secondary }]}>
              {template.win_rate != null
                ? `${(template.win_rate * 100).toFixed(1)}%`
                : '-'}
            </Text>
            <Text style={styles.quickStatLabel}>Win-Rate</Text>
          </View>
        </View>

        {/* Confidence Warning */}
        {!template.has_enough_data && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Noch zu wenig Daten für zuverlässige Statistiken (min. 20 Sends empfohlen)
            </Text>
          </View>
        )}
      </Card>
    </View>
  );
}

// =============================================================================
// CHANNEL COMPARISON CHART
// =============================================================================

function ChannelComparisonChart({ channels }) {
  if (!channels || channels.length === 0) return null;

  const chartData = {
    labels: channels.map((c) => CHANNEL_LABELS[c.channel]?.slice(0, 6) ?? c.channel?.slice(0, 6)),
    datasets: [
      {
        data: channels.map((c) => (c.reply_rate ?? 0) * 100),
        color: () => COLORS.success,
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
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: COLORS.border,
      strokeWidth: 1,
    },
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.sectionTitle}>📊 Kanal-Performance</Text>
      <Text style={styles.sectionSubtitle}>Reply-Rate in % pro Kanal</Text>

      <Card style={styles.chartCard}>
        <BarChart
          data={chartData}
          width={CHART_WIDTH}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          fromZero
          showValuesOnTopOfBars
          yAxisSuffix="%"
        />

        {/* Channel Details */}
        <View style={styles.channelDetails}>
          {channels.map((channel, index) => (
            <View key={index} style={styles.channelDetailRow}>
              <View style={styles.channelInfo}>
                <Text style={styles.channelName}>
                  {CHANNEL_LABELS[channel.channel] ?? channel.channel}
                </Text>
                <Text style={styles.channelSent}>
                  {channel.events_sent.toLocaleString('de-DE')} gesendet
                </Text>
              </View>
              <View style={styles.channelRates}>
                <View style={styles.rateItem}>
                  <Text style={[styles.rateValue, { color: COLORS.success }]}>
                    {channel.reply_rate != null
                      ? `${(channel.reply_rate * 100).toFixed(1)}%`
                      : '-'}
                  </Text>
                  <Text style={styles.rateLabel}>Reply</Text>
                </View>
                <View style={styles.rateItem}>
                  <Text style={[styles.rateValue, { color: COLORS.secondary }]}>
                    {channel.win_rate != null
                      ? `${(channel.win_rate * 100).toFixed(1)}%`
                      : '-'}
                  </Text>
                  <Text style={styles.rateLabel}>Win</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

// =============================================================================
// DEMO DATA GENERATORS
// =============================================================================

function generateDemoData() {
  const templates = [
    { name: 'Erstkontakt Warm', channel: 'instagram_dm', sent: 145, replied: 52, won: 8 },
    { name: 'Follow-up Tag 3', channel: 'whatsapp', sent: 98, replied: 41, won: 12 },
    { name: 'Interesse wecken', channel: 'facebook_dm', sent: 67, replied: 28, won: 5 },
    { name: 'Einladung Call', channel: 'linkedin_dm', sent: 54, replied: 22, won: 7 },
    { name: 'Newsletter Opener', channel: 'email', sent: 234, replied: 45, won: 9 },
    { name: 'Story Reaktion', channel: 'instagram_dm', sent: 89, replied: 38, won: 6 },
    { name: 'Reactivation', channel: 'whatsapp', sent: 45, replied: 18, won: 3 },
  ];

  return {
    from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    to_date: new Date().toISOString().slice(0, 10),
    vertical_id: null,
    channel: null,
    total_sent: templates.reduce((sum, t) => sum + t.sent, 0),
    total_replied: templates.reduce((sum, t) => sum + t.replied, 0),
    total_deals: templates.reduce((sum, t) => sum + t.won, 0),
    overall_reply_rate: 0.34,
    overall_win_rate: 0.072,
    results: templates.map((t, i) => ({
      template_id: `template_${i + 1}`,
      template_name: t.name,
      channel: t.channel,
      vertical_id: 'network_marketing',
      events_suggested: Math.round(t.sent * 1.3),
      events_sent: t.sent,
      events_replied: t.replied,
      events_positive_reply: Math.round(t.replied * 0.7),
      events_negative_reply: Math.round(t.replied * 0.2),
      events_no_reply: t.sent - t.replied,
      events_deal_won: t.won,
      events_deal_lost: Math.round(t.won * 0.3),
      reply_rate: t.replied / t.sent,
      positive_reply_rate: (t.replied * 0.7) / t.sent,
      win_rate: t.won / t.sent,
      has_enough_data: t.sent >= 20,
      confidence: t.sent >= 50 ? 'high' : t.sent >= 20 ? 'medium' : 'low',
    })),
  };
}

function generateDemoChannelData() {
  return {
    from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    to_date: new Date().toISOString().slice(0, 10),
    vertical_id: null,
    results: [
      { channel: 'instagram_dm', events_sent: 234, events_replied: 98, events_positive_reply: 68, events_deal_won: 14, reply_rate: 0.42, positive_reply_rate: 0.29, win_rate: 0.06 },
      { channel: 'whatsapp', events_sent: 143, events_replied: 59, events_positive_reply: 45, events_deal_won: 15, reply_rate: 0.41, positive_reply_rate: 0.31, win_rate: 0.105 },
      { channel: 'facebook_dm', events_sent: 67, events_replied: 28, events_positive_reply: 18, events_deal_won: 5, reply_rate: 0.42, positive_reply_rate: 0.27, win_rate: 0.075 },
      { channel: 'linkedin_dm', events_sent: 54, events_replied: 22, events_positive_reply: 17, events_deal_won: 7, reply_rate: 0.41, positive_reply_rate: 0.31, win_rate: 0.13 },
      { channel: 'email', events_sent: 234, events_replied: 45, events_positive_reply: 32, events_deal_won: 9, reply_rate: 0.19, positive_reply_rate: 0.14, win_rate: 0.038 },
    ],
  };
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.secondary,
    ...SHADOWS.lg,
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

  // Filter Section
  filterCard: {
    margin: SPACING.lg,
    padding: SPACING.lg,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterChip: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },

  // Error Card
  errorCard: {
    margin: SPACING.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  errorIcon: {
    fontSize: 28,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Loading
  loadingContainer: {
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
  },

  // Section Titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },

  // KPI Section
  kpiContainer: {
    padding: SPACING.lg,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
  },
  kpiIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  kpiLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  kpiSubtitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Best Performers
  bestPerformers: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  bestCard: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.infoBg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  bestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  bestIcon: {
    fontSize: 16,
  },
  bestLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  bestValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  bestStat: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 2,
  },

  // Empty State
  emptyCard: {
    margin: SPACING.lg,
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Template List
  templateListContainer: {
    padding: SPACING.lg,
  },
  templateCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  templateCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.infoBg,
  },
  templateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  templateChannel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  lowDataBadge: {
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  lowDataText: {
    fontSize: 10,
    color: COLORS.warning,
    fontWeight: '500',
  },
  templateStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 40,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Template Detail
  detailContainer: {
    padding: SPACING.lg,
  },
  detailCard: {
    padding: SPACING.lg,
  },
  detailHeader: {
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.md,
  },
  detailName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Funnel
  funnelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  funnelContainer: {
    marginBottom: SPACING.lg,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  funnelLabel: {
    width: 80,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  funnelBarBg: {
    flex: 1,
    height: 20,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  funnelBar: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  funnelValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  quickStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Warning Box
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
  },

  // Chart Section
  chartContainer: {
    padding: SPACING.lg,
  },
  chartCard: {
    padding: SPACING.md,
  },
  chart: {
    borderRadius: RADIUS.lg,
    marginVertical: SPACING.sm,
  },
  channelDetails: {
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  channelDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  channelSent: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  channelRates: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  rateItem: {
    alignItems: 'flex-end',
  },
  rateValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  rateLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 100,
  },
});

