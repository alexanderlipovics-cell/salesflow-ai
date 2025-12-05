/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SEQUENCE ANALYTICS SCREEN                                                ║
 * ║  Performance-Dashboard für Outreach Sequences                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

interface SequenceStats {
  sequence_id: string;
  sequence_name: string;
  status: string;
  enrolled: number;
  active: number;
  completed: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  reply_rate: number;
  bounce_rate: number;
  avg_time_to_reply: number | null;
}

interface OverallStats {
  total_sequences: number;
  active_sequences: number;
  total_enrolled: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  total_bounced: number;
  overall_open_rate: number;
  overall_click_rate: number;
  overall_reply_rate: number;
  overall_bounce_rate: number;
}

interface DailyMetric {
  date: string;
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
}

// ============================================================================
// API
// ============================================================================

import { API_CONFIG } from '../../services/apiConfig';

const API_BASE = API_CONFIG.baseUrl;

async function fetchOverallStats(token: string): Promise<OverallStats> {
  // Simulate API call - in production this would call the real endpoint
  const res = await fetch(`${API_BASE}/sequences`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) throw new Error('Failed to fetch stats');
  const data = await res.json();
  const sequences = data.sequences || [];
  
  // Calculate overall stats from sequences
  let total_enrolled = 0, total_sent = 0, total_replied = 0, total_bounced = 0;
  
  sequences.forEach((seq: any) => {
    total_enrolled += seq.stats?.enrolled || 0;
    total_sent += seq.stats?.sent || 0;
    total_replied += seq.stats?.replied || 0;
    total_bounced += seq.stats?.bounced || 0;
  });
  
  return {
    total_sequences: sequences.length,
    active_sequences: sequences.filter((s: any) => s.status === 'active').length,
    total_enrolled,
    total_sent: total_sent || total_enrolled, // Fallback
    total_opened: Math.round(total_sent * 0.45), // Mock
    total_clicked: Math.round(total_sent * 0.15), // Mock
    total_replied,
    total_bounced,
    overall_open_rate: 0.45,
    overall_click_rate: 0.15,
    overall_reply_rate: total_sent > 0 ? total_replied / total_sent : 0,
    overall_bounce_rate: total_sent > 0 ? total_bounced / total_sent : 0,
  };
}

async function fetchSequenceStats(token: string): Promise<SequenceStats[]> {
  const res = await fetch(`${API_BASE}/sequences`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) throw new Error('Failed to fetch sequences');
  const data = await res.json();
  
  return (data.sequences || []).map((seq: any) => ({
    sequence_id: seq.id,
    sequence_name: seq.name,
    status: seq.status,
    enrolled: seq.stats?.enrolled || 0,
    active: seq.stats?.active || 0,
    completed: seq.stats?.completed || 0,
    replied: seq.stats?.replied || 0,
    bounced: seq.stats?.bounced || 0,
    unsubscribed: seq.stats?.unsubscribed || 0,
    reply_rate: seq.stats?.enrolled > 0 ? (seq.stats.replied / seq.stats.enrolled) : 0,
    bounce_rate: seq.stats?.enrolled > 0 ? (seq.stats.bounced / seq.stats.enrolled) : 0,
    avg_time_to_reply: null,
  }));
}

// Mock daily data
function generateMockDailyData(): DailyMetric[] {
  const days: DailyMetric[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    days.push({
      date: date.toISOString().split('T')[0],
      sent: Math.floor(Math.random() * 50) + 10,
      opened: Math.floor(Math.random() * 30) + 5,
      replied: Math.floor(Math.random() * 10) + 1,
      bounced: Math.floor(Math.random() * 5),
    });
  }
  
  return days;
}

// ============================================================================
// CHART COMPONENT
// ============================================================================

interface SimpleBarChartProps {
  data: DailyMetric[];
  metric: 'sent' | 'opened' | 'replied' | 'bounced';
  color: string;
}

function SimpleBarChart({ data, metric, color }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d[metric]), 1);
  
  return (
    <View style={styles.chartContainer}>
      <View style={styles.barsContainer}>
        {data.map((d, i) => (
          <View key={i} style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                {
                  height: `${(d[metric] / maxValue) * 100}%`,
                  backgroundColor: color,
                },
              ]}
            />
            <Text style={styles.barLabel}>
              {new Date(d.date).toLocaleDateString('de-DE', { weekday: 'short' })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ label, value, subValue, icon, color, trend }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <Text style={styles.statCardIcon}>{icon}</Text>
        {trend && (
          <Ionicons
            name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
            size={16}
            color={trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#888'}
          />
        )}
      </View>
      <Text style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
      {subValue && <Text style={styles.statCardSubValue}>{subValue}</Text>}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SequenceAnalyticsScreen({ navigation }: any) {
  const { session } = useAuth();
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [sequenceStats, setSequenceStats] = useState<SequenceStats[]>([]);
  const [dailyData, setDailyData] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'sent' | 'opened' | 'replied'>('sent');

  const loadData = useCallback(async () => {
    if (!session?.access_token) return;
    
    try {
      const [overall, sequences] = await Promise.all([
        fetchOverallStats(session.access_token),
        fetchSequenceStats(session.access_token),
      ]);
      
      setOverallStats(overall);
      setSequenceStats(sequences);
      setDailyData(generateMockDailyData());
    } catch (e) {
      console.error('Error loading analytics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Lade Analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1e293b', '#334155']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📊 Sequence Analytics</Text>
          <Text style={styles.headerSubtitle}>
            {overallStats?.total_sequences || 0} Sequences • {overallStats?.total_enrolled || 0} Kontakte
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#667eea" />
        }
      >
        {/* Overall Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Gesendet"
            value={overallStats?.total_sent || 0}
            icon="📤"
            color="#3b82f6"
            trend="up"
          />
          <StatCard
            label="Geöffnet"
            value={`${Math.round((overallStats?.overall_open_rate || 0) * 100)}%`}
            subValue={`${overallStats?.total_opened || 0} total`}
            icon="👀"
            color="#22c55e"
            trend="up"
          />
          <StatCard
            label="Geantwortet"
            value={`${Math.round((overallStats?.overall_reply_rate || 0) * 100)}%`}
            subValue={`${overallStats?.total_replied || 0} total`}
            icon="💬"
            color="#8b5cf6"
            trend="neutral"
          />
          <StatCard
            label="Bounced"
            value={`${Math.round((overallStats?.overall_bounce_rate || 0) * 100)}%`}
            subValue={`${overallStats?.total_bounced || 0} total`}
            icon="⚠️"
            color="#ef4444"
            trend="down"
          />
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>📈 7-Tage Übersicht</Text>
            <View style={styles.metricTabs}>
              {(['sent', 'opened', 'replied'] as const).map((metric) => (
                <TouchableOpacity
                  key={metric}
                  style={[styles.metricTab, selectedMetric === metric && styles.metricTabActive]}
                  onPress={() => setSelectedMetric(metric)}
                >
                  <Text
                    style={[
                      styles.metricTabText,
                      selectedMetric === metric && styles.metricTabTextActive,
                    ]}
                  >
                    {metric === 'sent' ? 'Gesendet' : metric === 'opened' ? 'Geöffnet' : 'Replied'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <SimpleBarChart
            data={dailyData}
            metric={selectedMetric}
            color={
              selectedMetric === 'sent' ? '#3b82f6' : selectedMetric === 'opened' ? '#22c55e' : '#8b5cf6'
            }
          />
        </View>

        {/* Sequence Performance */}
        <View style={styles.sequenceSection}>
          <Text style={styles.sectionTitle}>🏆 Sequence Performance</Text>
          
          {sequenceStats.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Keine Sequences vorhanden</Text>
            </View>
          ) : (
            sequenceStats.map((seq) => (
              <TouchableOpacity
                key={seq.sequence_id}
                style={styles.sequenceRow}
                onPress={() => navigation.navigate('SequenceBuilder', { sequenceId: seq.sequence_id })}
              >
                <View style={styles.sequenceInfo}>
                  <View style={styles.sequenceNameRow}>
                    <Text style={styles.sequenceName}>{seq.sequence_name}</Text>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: seq.status === 'active' ? '#22c55e' : '#888' },
                      ]}
                    />
                  </View>
                  <Text style={styles.sequenceEnrolled}>{seq.enrolled} enrolled</Text>
                </View>
                
                <View style={styles.sequenceMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>{Math.round(seq.reply_rate * 100)}%</Text>
                    <Text style={styles.metricLabel}>Reply</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: '#ef4444' }]}>
                      {Math.round(seq.bounce_rate * 100)}%
                    </Text>
                    <Text style={styles.metricLabel}>Bounce</Text>
                  </View>
                </View>
                
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Pro Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>💡 Pro Tips</Text>
          
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={20} color="#f59e0b" />
            <Text style={styles.tipText}>
              <Text style={styles.tipHighlight}>Open Rate unter 30%?</Text>{' '}
              Teste andere Betreffzeilen und sende zu optimalen Zeiten (Di-Do, 10-11 Uhr).
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <Ionicons name="trending-up" size={20} color="#22c55e" />
            <Text style={styles.tipText}>
              <Text style={styles.tipHighlight}>Reply Rate steigern:</Text>{' '}
              Personalisiere die erste Zeile und stelle eine konkrete Frage am Ende.
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
            <Text style={styles.tipText}>
              <Text style={styles.tipHighlight}>Bounce Rate hoch?</Text>{' '}
              Verifiziere Email-Adressen vor dem Senden und bereinige deine Liste.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardIcon: {
    fontSize: 24,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  statCardLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  statCardSubValue: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  chartSection: {
    margin: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  metricTabs: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 2,
  },
  metricTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  metricTabActive: {
    backgroundColor: '#334155',
  },
  metricTabText: {
    fontSize: 12,
    color: '#64748b',
  },
  metricTabTextActive: {
    color: '#fff',
  },
  chartContainer: {
    height: 150,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 24,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 24,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 8,
    position: 'absolute',
    bottom: 0,
  },
  sequenceSection: {
    margin: 16,
  },
  emptyState: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  sequenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  sequenceInfo: {
    flex: 1,
  },
  sequenceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sequenceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sequenceEnrolled: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  sequenceMetrics: {
    flexDirection: 'row',
    gap: 16,
    marginRight: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  tipsSection: {
    margin: 16,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  tipHighlight: {
    color: '#fff',
    fontWeight: '600',
  },
});

