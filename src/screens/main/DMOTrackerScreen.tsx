/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  DMO TRACKER SCREEN - Daily Method of Operation                            ║
 * ║  NetworkerOS - Tägliche Vertriebs-Aktivitäten tracken                      ║
 * ║                                                                            ║
 * ║  Features:                                                                 ║
 * ║  - Neue Kontakte tracken                                                   ║
 * ║  - Follow-ups / Check-ins                                                  ║
 * ║  - Reaktivierungen (Ghost-Buster)                                          ║
 * ║  - Calls/Meetings                                                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { AURA_COLORS, AURA_SHADOWS, AURA_SPACING, AURA_RADIUS } from '../../components/aura/theme';
import { API_CONFIG } from '../../services/apiConfig';
import { useAuth } from '../../context/AuthContext';

// API Helper
const getDMOApiUrl = () => `${API_CONFIG.baseUrl.replace('/api/v1', '')}/api/v2/dmo`;

// =============================================================================
// TYPES
// =============================================================================

interface DMOMetric {
  id: string;
  label: string;
  icon: string;
  current: number;
  target: number;
  color: string;
  description: string;
}

interface DailyFlowStatus {
  date: string;
  metrics: DMOMetric[];
  completionRate: number;
  statusLevel: 'ahead' | 'on_track' | 'behind' | 'critical';
  estimatedTimeMinutes: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const METRIC_COLORS = {
  newContacts: AURA_COLORS.neon.green,
  followUps: AURA_COLORS.neon.blue,
  reactivations: AURA_COLORS.neon.amber,
  calls: AURA_COLORS.neon.purple,
};

const STATUS_COLORS = {
  ahead: AURA_COLORS.neon.green,
  on_track: AURA_COLORS.neon.blue,
  behind: AURA_COLORS.neon.amber,
  critical: AURA_COLORS.neon.rose,
};

const DEFAULT_TARGETS = {
  newContacts: 8,
  followUps: 6,
  reactivations: 2,
  calls: 3,
};

// =============================================================================
// MOCK DATA - TODO: Replace with actual API calls
// =============================================================================

const getMockDailyFlowStatus = (): DailyFlowStatus => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  
  const metrics: DMOMetric[] = [
    {
      id: 'newContacts',
      label: 'Neue Kontakte',
      icon: '👤',
      current: 3,
      target: DEFAULT_TARGETS.newContacts,
      color: METRIC_COLORS.newContacts,
      description: 'Erstansprachen heute',
    },
    {
      id: 'followUps',
      label: 'Check-ins',
      icon: '🔄',
      current: 4,
      target: DEFAULT_TARGETS.followUps,
      color: METRIC_COLORS.followUps,
      description: 'Nachfass-Aktionen',
    },
    {
      id: 'reactivations',
      label: 'Reaktivierungen',
      icon: '👻',
      current: 1,
      target: DEFAULT_TARGETS.reactivations,
      color: METRIC_COLORS.reactivations,
      description: 'Ghost-Buster Aktionen',
    },
    {
      id: 'calls',
      label: 'Calls/Meetings',
      icon: '📞',
      current: 2,
      target: DEFAULT_TARGETS.calls,
      color: METRIC_COLORS.calls,
      description: 'Telefonate & Meetings',
    },
  ];

  const totalProgress = metrics.reduce((sum, m) => sum + (m.current / m.target), 0);
  const completionRate = Math.min(100, Math.round((totalProgress / metrics.length) * 100));
  
  return {
    date: dateStr,
    metrics,
    completionRate,
    statusLevel: getStatusLevel(completionRate),
    estimatedTimeMinutes: Math.max(0, Math.round((metrics.reduce((sum, m) => sum + (m.target - m.current), 0)) * 5)),
  };
};

// =============================================================================
// HELPERS
// =============================================================================

const getStatusLevel = (rate: number): DailyFlowStatus['statusLevel'] => {
  if (rate >= 100) return 'ahead';
  if (rate >= 75) return 'on_track';
  if (rate >= 50) return 'behind';
  return 'critical';
};

const getStatusMessage = (level: DailyFlowStatus['statusLevel']): string => {
  switch (level) {
    case 'ahead': return '🔥 Du bist on Fire!';
    case 'on_track': return '✅ Auf Kurs!';
    case 'behind': return '⚠️ Etwas hinterher';
    case 'critical': return '🚨 Achtung! Dran bleiben!';
  }
};

// =============================================================================
// COMPONENTS
// =============================================================================

interface MetricCardProps {
  metric: DMOMetric;
  isExpanded: boolean;
  onPress: () => void;
  onIncrement: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, isExpanded, onPress, onIncrement }) => {
  const progressPercent = Math.min(100, (metric.current / metric.target) * 100);
  
  return (
    <TouchableOpacity
      style={[
        styles.metricCard,
        isExpanded && styles.metricCardExpanded,
      ]}
      onPress={onPress}
      onLongPress={onIncrement}
      delayLongPress={300}
      activeOpacity={0.7}
    >
      <View style={styles.metricHeader}>
        <Text style={styles.metricIcon}>{metric.icon}</Text>
        <Text style={styles.metricLabel}>{metric.label}</Text>
      </View>
      
      <View style={styles.metricProgress}>
        <Text style={[styles.metricCurrent, { color: metric.color }]}>
          {metric.current}
        </Text>
        <Text style={styles.metricSeparator}>/</Text>
        <Text style={styles.metricTarget}>{metric.target}</Text>
      </View>

      {/* Mini Progress Bar */}
      <View style={styles.miniProgressBar}>
        <View
          style={[
            styles.miniProgressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: metric.color,
            },
          ]}
        />
      </View>

      {/* Expanded Info */}
      {isExpanded && (
        <View style={styles.expandedInfo}>
          <Text style={styles.metricDescription}>{metric.description}</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: metric.color }]}
            onPress={onIncrement}
          >
            <Text style={styles.addButtonText}>+ Hinzufügen</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

// =============================================================================
// MAIN SCREEN
// =============================================================================

interface DMOTrackerScreenProps {
  navigation: any;
}

export default function DMOTrackerScreen({ navigation }: DMOTrackerScreenProps) {
  // Auth
  const { user } = useAuth();
  
  // State
  const [status, setStatus] = useState<DailyFlowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  // Animations
  const progressAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchDailyFlowStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      const dateStr = new Date().toISOString().split('T')[0];
      
      // Versuche API zu erreichen
      try {
        const response = await fetch(`${getDMOApiUrl()}/summary?for_date=${dateStr}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': user?.access_token ? `Bearer ${user.access_token}` : '',
          },
        });
        
        if (response.ok) {
          const apiData = await response.json();
          setStatus(transformApiResponse(apiData));
        } else {
          // API Fehler → Fallback auf Mock
          console.log('DMO API not available, using mock data');
          setStatus(getMockDailyFlowStatus());
        }
      } catch (apiErr) {
        // Netzwerk-Fehler → Fallback auf Mock
        console.log('DMO API network error, using mock data:', apiErr);
        setStatus(getMockDailyFlowStatus());
      }
      
      const data = status || getMockDailyFlowStatus();

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: (data?.completionRate || 0) / 100,
        duration: 800,
        useNativeDriver: false,
      }).start();

      // Check if day is complete
      if (data?.completionRate >= 100) {
        startCelebrationAnimation();
      }

    } catch (err) {
      console.error('Failed to fetch daily flow status:', err);
      setStatus(getMockDailyFlowStatus());
    } finally {
      setLoading(false);
    }
  }, [progressAnim, user]);
  
  // Transformiert API Response zu lokalem Format
  const transformApiResponse = (apiData: any): DailyFlowStatus => {
    return {
      date: apiData.date || new Date().toISOString().split('T')[0],
      metrics: apiData.metrics || getMockDailyFlowStatus().metrics,
      completionRate: apiData.completion_rate || apiData.completionRate || 0,
      statusLevel: apiData.status_level || apiData.statusLevel || 'on_track',
      estimatedTimeMinutes: apiData.estimated_time_minutes || apiData.estimatedTimeMinutes || 30,
    };
  };

  useEffect(() => {
    fetchDailyFlowStatus();
  }, [fetchDailyFlowStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDailyFlowStatus();
    setRefreshing(false);
  }, [fetchDailyFlowStatus]);

  // =============================================================================
  // ANIMATIONS
  // =============================================================================

  const startCelebrationAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const incrementMetric = async (metricId: string) => {
    if (!status) return;

    const metric = status.metrics.find(m => m.id === metricId);
    if (!metric) return;

    // Optimistic update
    const updatedMetrics = status.metrics.map(m =>
      m.id === metricId ? { ...m, current: m.current + 1 } : m
    );
    
    const totalProgress = updatedMetrics.reduce((sum, m) => sum + (m.current / m.target), 0);
    const newCompletionRate = Math.min(100, Math.round((totalProgress / updatedMetrics.length) * 100));
    
    setStatus({
      ...status,
      metrics: updatedMetrics,
      completionRate: newCompletionRate,
      statusLevel: getStatusLevel(newCompletionRate),
    });

    // Animate progress
    Animated.timing(progressAnim, {
      toValue: newCompletionRate / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Check for celebration
    if (newCompletionRate >= 100 && status.completionRate < 100) {
      startCelebrationAnimation();
    }

    // API call to log activity
    try {
      await fetch(`${getDMOApiUrl()}/log-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user?.access_token ? `Bearer ${user.access_token}` : '',
        },
        body: JSON.stringify({
          activity_type: metricId,
          count: 1,
          date: new Date().toISOString().split('T')[0],
        }),
      });
    } catch (err) {
      console.log('Failed to log activity to API:', err);
      // Optimistic update bleibt bestehen
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading && !status) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Lade DMO Tracker...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!status) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Keine Daten</Text>
          <TouchableOpacity onPress={fetchDailyFlowStatus} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AURA_COLORS.neon.cyan}
          />
        }
      >
        <Animated.View style={[styles.content, { transform: [{ scale: pulseAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>DMO Tracker</Text>
              <Text style={styles.subtitle}>Daily Method of Operation</Text>
              <Text style={styles.date}>
                {new Date(status.date).toLocaleDateString('de-DE', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status.statusLevel] }]}>
              <Text style={styles.statusText}>{getStatusMessage(status.statusLevel)}</Text>
            </View>
          </View>

          {/* Overall Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Tagesfortschritt</Text>
              <Text style={styles.progressValue}>{Math.round(status.completionRate)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: STATUS_COLORS[status.statusLevel],
                  },
                ]}
              />
            </View>
            {status.estimatedTimeMinutes > 0 && (
              <Text style={styles.estimatedTime}>
                ⏱️ Noch ca. {status.estimatedTimeMinutes} Min. für heute
              </Text>
            )}
          </View>

          {/* Metrics Grid */}
          <Text style={styles.sectionTitle}>📊 Deine Aktivitäten</Text>
          <View style={styles.metricsGrid}>
            {status.metrics.map(metric => (
              <MetricCard
                key={metric.id}
                metric={metric}
                isExpanded={expandedMetric === metric.id}
                onPress={() => setExpandedMetric(
                  expandedMetric === metric.id ? null : metric.id
                )}
                onIncrement={() => incrementMetric(metric.id)}
              />
            ))}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('GuidedDailyFlow')}
            >
              <Text style={styles.quickActionIcon}>🎯</Text>
              <Text style={styles.quickActionText}>Guided Flow</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('DailyFlowSetup')}
            >
              <Text style={styles.quickActionIcon}>⚙️</Text>
              <Text style={styles.quickActionText}>Ziele anpassen</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('AnalyticsDashboard')}
            >
              <Text style={styles.quickActionIcon}>📈</Text>
              <Text style={styles.quickActionText}>Statistiken</Text>
            </TouchableOpacity>
          </View>

          {/* MENTOR Button */}
          <TouchableOpacity 
            style={styles.mentorButton}
            onPress={() => navigation.navigate('Chat', {
              initialMessage: `Wie kann ich meinen DMO verbessern? Aktueller Fortschritt: ${status.completionRate}%`,
            })}
          >
            <Text style={styles.mentorButtonIcon}>🧠</Text>
            <View style={styles.mentorButtonContent}>
              <Text style={styles.mentorButtonTitle}>MENTOR fragen</Text>
              <Text style={styles.mentorButtonSubtitle}>KI-Coach für DMO Optimierung</Text>
            </View>
            <Text style={styles.mentorButtonArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    padding: AURA_SPACING.md,
  },
  
  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: AURA_COLORS.text.muted,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: AURA_COLORS.neon.rose,
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: AURA_COLORS.neon.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: AURA_RADIUS.md,
  },
  retryButtonText: {
    color: AURA_COLORS.text.primary,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: AURA_SPACING.lg,
    paddingTop: AURA_SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: AURA_COLORS.neon.cyan,
    marginTop: 2,
  },
  date: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AURA_RADIUS.xl,
  },
  statusText: {
    color: AURA_COLORS.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Progress Card
  progressCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.xl,
    padding: AURA_SPACING.lg,
    marginBottom: AURA_SPACING.lg,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.glass,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: AURA_SPACING.sm,
  },
  progressLabel: {
    color: AURA_COLORS.text.muted,
    fontSize: 14,
  },
  progressValue: {
    color: AURA_COLORS.text.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 12,
    backgroundColor: AURA_COLORS.bg.tertiary,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  estimatedTime: {
    color: AURA_COLORS.text.muted,
    fontSize: 12,
    marginTop: AURA_SPACING.sm,
    textAlign: 'center',
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: AURA_SPACING.md,
    marginTop: AURA_SPACING.sm,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: AURA_SPACING.lg,
  },
  metricCard: {
    width: (width - 56) / 2,
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: AURA_RADIUS.lg,
    padding: AURA_SPACING.md,
    margin: 6,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  metricCardExpanded: {
    width: width - 44,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AURA_SPACING.sm,
  },
  metricIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  metricLabel: {
    color: AURA_COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  metricProgress: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: AURA_SPACING.sm,
  },
  metricCurrent: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  metricSeparator: {
    color: AURA_COLORS.text.subtle,
    fontSize: 20,
    marginHorizontal: 4,
  },
  metricTarget: {
    color: AURA_COLORS.text.subtle,
    fontSize: 20,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: AURA_COLORS.bg.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  expandedInfo: {
    marginTop: AURA_SPACING.md,
    paddingTop: AURA_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: AURA_COLORS.glass.border,
  },
  metricDescription: {
    color: AURA_COLORS.text.muted,
    fontSize: 13,
    marginBottom: AURA_SPACING.sm,
  },
  addButton: {
    paddingVertical: 10,
    borderRadius: AURA_RADIUS.md,
    alignItems: 'center',
  },
  addButtonText: {
    color: AURA_COLORS.bg.primary,
    fontWeight: '600',
    fontSize: 14,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: AURA_SPACING.lg,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.xl,
    padding: AURA_SPACING.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: AURA_SPACING.sm,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    color: AURA_COLORS.text.muted,
    fontSize: 12,
  },

  // MENTOR Button
  mentorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.neon.cyanSubtle,
    borderRadius: AURA_RADIUS.xl,
    padding: AURA_SPACING.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.neon.cyan,
  },
  mentorButtonIcon: {
    fontSize: 32,
    marginRight: AURA_SPACING.md,
  },
  mentorButtonContent: {
    flex: 1,
  },
  mentorButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  mentorButtonSubtitle: {
    fontSize: 12,
    color: AURA_COLORS.neon.cyan,
    marginTop: 2,
  },
  mentorButtonArrow: {
    fontSize: 20,
    color: AURA_COLORS.neon.cyan,
  },
});

