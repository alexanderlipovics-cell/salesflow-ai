/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - DAILY FLOW STATUS SCREEN                                 ║
 * ║  Vollständiges Dashboard für Daily Flow Status                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useDailyFlowStatus } from '../../hooks/useDailyFlowStatus';
import {
  STATUS_LEVEL_META,
  ACTIVITY_TYPE_META,
  formatRelativeTime,
} from '../../types/activity';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Daily Flow Status Screen
 * Zeigt den kompletten Daily Flow Status mit Progress, Quick Actions und Historie
 * 
 * @param {Object} props
 * @param {Object} props.route - Navigation Route mit companyId Parameter
 */
const DailyFlowStatusScreen = ({ route }) => {
  const companyId = route?.params?.companyId ?? 'default';
  
  const {
    status,
    summaryMessage,
    tipMessage,
    isLoading,
    error,
    refresh,
    logContact,
    logFollowUp,
    logReactivate,
    recentActivities,
  } = useDailyFlowStatus(companyId);

  const [refreshing, setRefreshing] = useState(false);
  const [loggingType, setLoggingType] = useState(null);

  // Pull-to-Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Quick Action Handlers
  const handleLogContact = async () => {
    setLoggingType('contact');
    try {
      await logContact();
    } finally {
      setLoggingType(null);
    }
  };

  const handleLogFollowUp = async () => {
    setLoggingType('followup');
    try {
      await logFollowUp();
    } finally {
      setLoggingType(null);
    }
  };

  const handleLogReactivate = async () => {
    setLoggingType('reactivation');
    try {
      await logReactivate();
    } finally {
      setLoggingType(null);
    }
  };

  // Loading State
  if (isLoading && !status) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Lade Daily Flow...</Text>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty State (no targets configured)
  if (!status) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>Noch kein Plan</Text>
        <Text style={styles.emptyText}>
          Starte den Firma & Ziel Wizard, um deinen persönlichen Daily Flow zu erstellen.
        </Text>
      </View>
    );
  }

  const statusMeta = STATUS_LEVEL_META[status.status_level] || STATUS_LEVEL_META.behind;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#06b6d4"
          colors={['#06b6d4']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>🎯 Heute auf Kurs bleiben</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bgColor }]}>
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.emoji} {statusMeta.label}
            </Text>
          </View>
        </View>
        <Text style={styles.headerDate}>
          {new Date(status.date).toLocaleDateString('de-DE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {/* Summary Message */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>{summaryMessage}</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>⚡ Schnell erfassen</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonContact]}
            onPress={handleLogContact}
            disabled={loggingType !== null}
          >
            {loggingType === 'contact' ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <>
                <Text style={styles.actionEmoji}>👋</Text>
                <Text style={styles.actionLabel}>Neuer Kontakt</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonFollowup]}
            onPress={handleLogFollowUp}
            disabled={loggingType !== null}
          >
            {loggingType === 'followup' ? (
              <ActivityIndicator size="small" color="#06B6D4" />
            ) : (
              <>
                <Text style={styles.actionEmoji}>📞</Text>
                <Text style={styles.actionLabel}>Follow-up</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonReactivation]}
            onPress={handleLogReactivate}
            disabled={loggingType !== null}
          >
            {loggingType === 'reactivation' ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <>
                <Text style={styles.actionEmoji}>🔄</Text>
                <Text style={styles.actionLabel}>Reaktivierung</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Daily Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Heute zu erledigen</Text>
        
        <ProgressRow
          label="Neue Kontakte"
          done={status.daily.new_contacts?.done || 0}
          target={status.daily.new_contacts?.target || 0}
          ratio={status.daily.new_contacts?.ratio || 0}
          color="#10B981"
        />
        <ProgressRow
          label="Follow-ups"
          done={status.daily.followups?.done || 0}
          target={status.daily.followups?.target || 0}
          ratio={status.daily.followups?.ratio || 0}
          color="#06B6D4"
        />
        <ProgressRow
          label="Reaktivierungen"
          done={status.daily.reactivations?.done || 0}
          target={status.daily.reactivations?.target || 0}
          ratio={status.daily.reactivations?.ratio || 0}
          color="#8B5CF6"
        />
      </View>

      {/* Tip */}
      {tipMessage && (
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>{tipMessage}</Text>
        </View>
      )}

      {/* Weekly Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Diese Woche</Text>
        
        <WeeklyRow
          label="Neue Kontakte"
          done={status.weekly.new_contacts?.done || 0}
          target={status.weekly.new_contacts?.target || 0}
        />
        <WeeklyRow
          label="Follow-ups"
          done={status.weekly.followups?.done || 0}
          target={status.weekly.followups?.target || 0}
        />
        <WeeklyRow
          label="Reaktivierungen"
          done={status.weekly.reactivations?.done || 0}
          target={status.weekly.reactivations?.target || 0}
        />
      </View>

      {/* Recent Activities */}
      {recentActivities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Letzte Aktivitäten</Text>
          {recentActivities.slice(0, 5).map((activity) => {
            const meta = ACTIVITY_TYPE_META[activity.activity_type] || ACTIVITY_TYPE_META.new_contact;
            return (
              <View key={activity.id} style={styles.activityRow}>
                <Text style={styles.activityEmoji}>{meta.emoji}</Text>
                <View style={styles.activityContent}>
                  <Text style={styles.activityLabel}>
                    {meta.label}
                  </Text>
                  {activity.lead_name && (
                    <Text style={styles.activityLead}>{activity.lead_name}</Text>
                  )}
                </View>
                <Text style={styles.activityTime}>
                  {formatRelativeTime(activity.occurred_at)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Bottom Padding */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Progress Row Component
 */
const ProgressRow = ({ label, done, target, ratio, color }) => {
  const percentage = Math.min((ratio || 0) * 100, 100);
  const doneInt = Math.round(done);
  const targetInt = Math.round(target);

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressCount}>
          {doneInt} / {targetInt}
        </Text>
      </View>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      {percentage >= 100 && (
        <Text style={styles.progressComplete}>✓ Erledigt!</Text>
      )}
    </View>
  );
};

/**
 * Weekly Row Component
 */
const WeeklyRow = ({ label, done, target }) => {
  const doneInt = Math.round(done);
  const targetInt = Math.round(target);
  const percentage = target > 0 ? Math.round((done / target) * 100) : 0;

  return (
    <View style={styles.weeklyRow}>
      <Text style={styles.weeklyLabel}>{label}</Text>
      <Text style={styles.weeklyCount}>
        {doneInt} / {targetInt}
        <Text style={styles.weeklyPercent}> ({percentage}%)</Text>
      </Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#f8fafc',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Header
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Summary Card
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  
  // Quick Actions
  quickActions: {
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
    borderWidth: 1,
  },
  actionButtonContact: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionButtonFollowup: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  actionButtonReactivation: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  actionEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 11,
    color: '#f8fafc',
    fontWeight: '500',
  },
  
  // Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  
  // Progress Row
  progressRow: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  progressCount: {
    fontSize: 13,
    color: '#94a3b8',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressComplete: {
    fontSize: 11,
    color: '#22c55e',
    marginTop: 4,
  },
  
  // Weekly Row
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  weeklyLabel: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  weeklyCount: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '500',
  },
  weeklyPercent: {
    color: '#94a3b8',
    fontWeight: '400',
  },
  
  // Tip Card
  tipCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  tipText: {
    fontSize: 13,
    color: '#06b6d4',
    lineHeight: 20,
  },
  
  // Activity Row
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  activityEmoji: {
    fontSize: 18,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 13,
    color: '#f8fafc',
  },
  activityLead: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#64748b',
  },
});

export default DailyFlowStatusScreen;

