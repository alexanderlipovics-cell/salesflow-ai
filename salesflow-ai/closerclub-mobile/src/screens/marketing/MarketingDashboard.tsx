/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  MARKETING DASHBOARD - MOBILE FIRST                                       ║
 * ║  Growth metrics & campaign performance overview                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#22C55E',
  primaryDark: '#15803D',
  accent: '#3B82F6',
  background: '#0A0F1A',
  surface: '#111827',
  surfaceHover: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface MarketingMetrics {
  email: {
    sent: number;
    openRate: number;
    clickRate: number;
    conversions: number;
  };
  push: {
    sent: number;
    openRate: number;
    conversions: number;
  };
  referrals: {
    total: number;
    conversions: number;
    revenue: number;
  };
  campaigns: Array<{
    name: string;
    status: string;
    sent: number;
    opens: number;
    clicks: number;
  }>;
}

export default function MarketingDashboard() {
  const [metrics, setMetrics] = useState<MarketingMetrics>({
    email: {
      sent: 0,
      openRate: 0,
      clickRate: 0,
      conversions: 0
    },
    push: {
      sent: 0,
      openRate: 0,
      conversions: 0
    },
    referrals: {
      total: 0,
      conversions: 0,
      revenue: 0
    },
    campaigns: []
  });

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMarketingMetrics();
  }, []);

  const fetchMarketingMetrics = async () => {
    try {
      // TODO: Replace with actual API call
      const mockData: MarketingMetrics = {
        email: {
          sent: 1250,
          openRate: 28.5,
          clickRate: 6.2,
          conversions: 45
        },
        push: {
          sent: 890,
          openRate: 38.7,
          conversions: 67
        },
        referrals: {
          total: 234,
          conversions: 89,
          revenue: 12500
        },
        campaigns: [
          {
            name: "Welcome Sequence",
            status: "active",
            sent: 450,
            opens: 128,
            clicks: 32
          },
          {
            name: "Feature Update",
            status: "completed",
            sent: 320,
            opens: 96,
            clicks: 24
          },
          {
            name: "Re-engagement",
            status: "scheduled",
            sent: 0,
            opens: 0,
            clicks: 0
          }
        ]
      };

      setMetrics(mockData);
    } catch (error) {
      console.error('Failed to fetch marketing metrics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMarketingMetrics();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="analytics" size={32} color={COLORS.primary} />
        <Text style={styles.title}>Growth Engine</Text>
        <Text style={styles.subtitle}>Marketing Performance</Text>
      </View>

      {/* Key Metrics Cards */}
      <View style={styles.metricsGrid}>
        {/* Email Metrics */}
        <View style={styles.metricCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="mail" size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Email</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.metricValue}>{metrics.email.sent}</Text>
            <Text style={styles.metricLabel}>Gesendet</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricSubLabel}>Öffnungen: {formatPercentage(metrics.email.openRate)}</Text>
              <Text style={styles.metricSubLabel}>Klicks: {formatPercentage(metrics.email.clickRate)}</Text>
            </View>
          </View>
        </View>

        {/* Push Notifications */}
        <View style={styles.metricCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="notifications" size={24} color={COLORS.accent} />
            <Text style={styles.cardTitle}>Push</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.metricValue}>{metrics.push.sent}</Text>
            <Text style={styles.metricLabel}>Gesendet</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricSubLabel}>Öffnungen: {formatPercentage(metrics.push.openRate)}</Text>
            </View>
          </View>
        </View>

        {/* Referrals */}
        <View style={styles.metricCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={24} color={COLORS.success} />
            <Text style={styles.cardTitle}>Referrals</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.metricValue}>{metrics.referrals.total}</Text>
            <Text style={styles.metricLabel}>Total</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricSubLabel}>Revenue: {formatCurrency(metrics.referrals.revenue)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Campaign Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kampagnen Performance</Text>

        {metrics.campaigns.map((campaign, index) => (
          <View key={index} style={styles.campaignCard}>
            <View style={styles.campaignHeader}>
              <Text style={styles.campaignName}>{campaign.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(campaign.status) }]}>
                <Text style={styles.statusText}>{campaign.status}</Text>
              </View>
            </View>

            <View style={styles.campaignMetrics}>
              <View style={styles.campaignMetric}>
                <Text style={styles.campaignMetricValue}>{campaign.sent}</Text>
                <Text style={styles.campaignMetricLabel}>Gesendet</Text>
              </View>
              <View style={styles.campaignMetric}>
                <Text style={styles.campaignMetricValue}>{campaign.opens}</Text>
                <Text style={styles.campaignMetricLabel}>Öffnungen</Text>
              </View>
              <View style={styles.campaignMetric}>
                <Text style={styles.campaignMetricValue}>{campaign.clicks}</Text>
                <Text style={styles.campaignMetricLabel}>Klicks</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Performance Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Trend</Text>
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun'],
              datasets: [{
                data: [20, 25, 28, 32, 29, 35],
                color: () => COLORS.primary,
                strokeWidth: 2
              }]
            }}
            width={SCREEN_WIDTH - 40}
            height={200}
            chartConfig={{
              backgroundColor: COLORS.surface,
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              decimalPlaces: 1,
              color: () => COLORS.primary,
              labelColor: () => COLORS.textSecondary,
              style: {
                borderRadius: 16
              },
              propsForLabels: {
                fontSize: 12,
                fill: COLORS.textSecondary
              }
            }}
            style={styles.chart}
          />
        </View>
      </View>

      {/* A/B Tests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>A/B Tests</Text>
        <View style={styles.abTestCard}>
          <Text style={styles.abTestTitle}>Betreffzeilen-Optimierung</Text>
          <View style={styles.abTestResults}>
            <View style={styles.abVariant}>
              <Text style={styles.variantName}>Variante A</Text>
              <Text style={styles.variantResult}>24.5% Öffnungsrate</Text>
            </View>
            <View style={styles.abVariant}>
              <Text style={styles.variantName}>Variante B</Text>
              <Text style={styles.variantResult}>28.3% Öffnungsrate</Text>
              <Text style={styles.winnerBadge}>Gewinner</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return COLORS.success;
    case 'completed': return COLORS.primary;
    case 'scheduled': return COLORS.warning;
    default: return COLORS.textMuted;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  cardContent: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  metricRow: {
    width: '100%',
  },
  metricSubLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  campaignCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  campaignMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  campaignMetric: {
    alignItems: 'center',
  },
  campaignMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  campaignMetricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  abTestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  abTestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  abTestResults: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  abVariant: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  variantName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  variantResult: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  winnerBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 4,
  },
});
