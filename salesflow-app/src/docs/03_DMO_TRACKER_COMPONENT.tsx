/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  DMO TRACKER COMPONENT - Daily Method of Operation                         ║
 * ║  Referenz-Implementation für Frontend-Entwickler                           ║
 * ║                                                                            ║
 * ║  Dieses Component trackt die täglichen Vertriebs-Aktivitäten:             ║
 * ║  - Neue Kontakte                                                          ║
 * ║  - Follow-ups                                                             ║
 * ║  - Reaktivierungen                                                        ║
 * ║  - Calls/Meetings                                                         ║
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
} from 'react-native';

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

interface DMOTrackerProps {
  userId: string;
  date?: Date;
  onMetricUpdate?: (metric: DMOMetric) => void;
  onDayComplete?: () => void;
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
  newContacts: '#10B981',    // Emerald
  followUps: '#3B82F6',      // Blue
  reactivations: '#F59E0B',  // Amber
  calls: '#8B5CF6',          // Purple
};

const STATUS_COLORS = {
  ahead: '#10B981',
  on_track: '#3B82F6',
  behind: '#F59E0B',
  critical: '#EF4444',
};

const DEFAULT_TARGETS = {
  newContacts: 8,
  followUps: 6,
  reactivations: 2,
  calls: 3,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const DMOTracker: React.FC<DMOTrackerProps> = ({
  userId,
  date = new Date(),
  onMetricUpdate,
  onDayComplete,
}) => {
  // State
  const [status, setStatus] = useState<DailyFlowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const dateStr = date.toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/daily-flow/summary?for_date=${dateStr}`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch daily flow');

      const data = await response.json();
      
      // Transform API response to DMOMetric format
      const metrics: DMOMetric[] = [
        {
          id: 'newContacts',
          label: 'Neue Kontakte',
          icon: '👤',
          current: data.new_contacts || 0,
          target: DEFAULT_TARGETS.newContacts,
          color: METRIC_COLORS.newContacts,
          description: 'Erstansprachen heute',
        },
        {
          id: 'followUps',
          label: 'Follow-ups',
          icon: '🔄',
          current: data.follow_ups || 0,
          target: DEFAULT_TARGETS.followUps,
          color: METRIC_COLORS.followUps,
          description: 'Nachfass-Aktionen',
        },
        {
          id: 'reactivations',
          label: 'Reaktivierungen',
          icon: '👻',
          current: data.reactivations || 0,
          target: DEFAULT_TARGETS.reactivations,
          color: METRIC_COLORS.reactivations,
          description: 'Ghost-Buster Aktionen',
        },
        {
          id: 'calls',
          label: 'Calls/Meetings',
          icon: '📞',
          current: data.calls || 0,
          target: DEFAULT_TARGETS.calls,
          color: METRIC_COLORS.calls,
          description: 'Telefonate & Meetings',
        },
      ];

      const completionRate = data.completion_rate || 0;
      
      setStatus({
        date: dateStr,
        metrics,
        completionRate,
        statusLevel: getStatusLevel(completionRate),
        estimatedTimeMinutes: data.estimated_time_minutes || 0,
      });

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: completionRate / 100,
        duration: 800,
        useNativeDriver: false,
      }).start();

      // Check if day is complete
      if (completionRate >= 100 && onDayComplete) {
        onDayComplete();
        startCelebrationAnimation();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    fetchDailyFlowStatus();
  }, [fetchDailyFlowStatus]);

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

  const startCelebrationAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 200, useNativeDriver: true }),
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
    
    const newCompletionRate = calculateCompletionRate(updatedMetrics);
    
    setStatus({
      ...status,
      metrics: updatedMetrics,
      completionRate: newCompletionRate,
      statusLevel: getStatusLevel(newCompletionRate),
    });

    // API call
    try {
      await fetch('/api/daily-flow/log-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          activity_type: metricId,
          date: status.date,
        }),
      });

      if (onMetricUpdate) {
        onMetricUpdate({ ...metric, current: metric.current + 1 });
      }
    } catch (err) {
      // Rollback on error
      fetchDailyFlowStatus();
    }
  };

  const calculateCompletionRate = (metrics: DMOMetric[]): number => {
    const total = metrics.reduce((sum, m) => sum + (m.current / m.target), 0);
    return Math.min(100, Math.round((total / metrics.length) * 100));
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingPlaceholder}>
          <Text style={styles.loadingText}>Lade DMO Tracker...</Text>
        </View>
      </View>
    );
  }

  if (error || !status) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error || 'Keine Daten'}</Text>
          <TouchableOpacity onPress={fetchDailyFlowStatus} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Daily Flow</Text>
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

      {/* Overall Progress */}
      <View style={styles.progressSection}>
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
      <View style={styles.metricsGrid}>
        {status.metrics.map(metric => (
          <TouchableOpacity
            key={metric.id}
            style={[
              styles.metricCard,
              expandedMetric === metric.id && styles.metricCardExpanded,
            ]}
            onPress={() => setExpandedMetric(
              expandedMetric === metric.id ? null : metric.id
            )}
            onLongPress={() => incrementMetric(metric.id)}
            delayLongPress={300}
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
                    width: `${Math.min(100, (metric.current / metric.target) * 100)}%`,
                    backgroundColor: metric.color,
                  },
                ]}
              />
            </View>

            {/* Expanded Info */}
            {expandedMetric === metric.id && (
              <View style={styles.expandedInfo}>
                <Text style={styles.metricDescription}>{metric.description}</Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: metric.color }]}
                  onPress={() => incrementMetric(metric.id)}
                >
                  <Text style={styles.addButtonText}>+ Hinzufügen</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton}>
          <Text style={styles.quickActionIcon}>📝</Text>
          <Text style={styles.quickActionText}>Aktion loggen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <Text style={styles.quickActionIcon}>🎯</Text>
          <Text style={styles.quickActionText}>Ziele anpassen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <Text style={styles.quickActionIcon}>📊</Text>
          <Text style={styles.quickActionText}>Statistiken</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Loading & Error
  loadingPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  date: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Progress Section
  progressSection: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  progressValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  estimatedTime: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  metricCard: {
    width: (width - 80) / 2,
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 16,
    margin: 6,
  },
  metricCardExpanded: {
    width: width - 68,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  metricLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  metricProgress: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  metricCurrent: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  metricSeparator: {
    color: '#6B7280',
    fontSize: 20,
    marginHorizontal: 4,
  },
  metricTarget: {
    color: '#6B7280',
    fontSize: 20,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  expandedInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  metricDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 12,
  },
  addButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 8,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getAuthToken(): string {
  // In production: Get from AuthContext or AsyncStorage
  return 'mock-token';
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DMOTracker;

/**
 * USAGE EXAMPLE:
 * 
 * import { DMOTracker } from '@/components/dmo-tracker';
 * 
 * function DashboardScreen() {
 *   return (
 *     <ScrollView>
 *       <DMOTracker
 *         userId={user.id}
 *         onMetricUpdate={(metric) => {
 *           console.log('Metric updated:', metric);
 *         }}
 *         onDayComplete={() => {
 *           showCelebration();
 *         }}
 *       />
 *     </ScrollView>
 *   );
 * }
 */

