/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - DAILY FLOW STATUS CARD                                   ║
 * ║  Kompakte Dashboard Card für Daily Flow Status                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDailyFlowStatus } from '../../hooks/useDailyFlowStatus';
import { STATUS_LEVEL_META } from '../../types/activity';

/**
 * Kompakte Card für das Dashboard
 * Zeigt nur Status + Summary + Link zum Detail-Screen
 * 
 * @param {Object} props
 * @param {string} [props.companyId='default'] - Company ID
 */
const DailyFlowStatusCard = ({ companyId = 'default' }) => {
  const navigation = useNavigation();
  const { status, summaryMessage, isLoading, error, overallProgress } = useDailyFlowStatus(companyId);

  // Loading State
  if (isLoading && !status) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#06b6d4" />
          <Text style={styles.loadingText}>Lade Status...</Text>
        </View>
      </View>
    );
  }

  // Error or no status
  if (error || !status) {
    return null; // Card nicht anzeigen wenn Fehler oder kein Status
  }

  const statusMeta = STATUS_LEVEL_META[status.status_level] || STATUS_LEVEL_META.behind;

  const handlePress = () => {
    navigation.navigate('DailyFlowStatus', { companyId });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>🎯 Daily Flow</Text>
          <View style={[styles.badge, { backgroundColor: statusMeta.bgColor }]}>
            <Text style={[styles.badgeText, { color: statusMeta.color }]}>
              {statusMeta.emoji} {statusMeta.label}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{overallProgress}% des Tagesziels erreicht</Text>
      </View>

      {/* Mini Progress Bars */}
      <View style={styles.progressRow}>
        <MiniProgress
          label="Kontakte"
          done={status.daily.new_contacts?.done || 0}
          target={status.daily.new_contacts?.target || 0}
          color="#10B981"
        />
        <MiniProgress
          label="Follow-ups"
          done={status.daily.followups?.done || 0}
          target={status.daily.followups?.target || 0}
          color="#06B6D4"
        />
        <MiniProgress
          label="Reaktiv."
          done={status.daily.reactivations?.done || 0}
          target={status.daily.reactivations?.target || 0}
          color="#8B5CF6"
        />
      </View>

      {/* Summary (truncated) */}
      <Text style={styles.summary} numberOfLines={2}>
        {summaryMessage}
      </Text>

      <Text style={styles.viewMore}>Details ansehen →</Text>
    </TouchableOpacity>
  );
};

/**
 * Mini Progress Component
 */
const MiniProgress = ({ label, done, target, color }) => {
  const ratio = target > 0 ? Math.min(done / target, 1) : 0;

  return (
    <View style={styles.miniItem}>
      <Text style={styles.miniLabel}>{label}</Text>
      <View style={styles.miniBarBg}>
        <View
          style={[styles.miniBarFill, { width: `${ratio * 100}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={styles.miniCount}>
        {Math.round(done)}/{Math.round(target)}
      </Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#94a3b8',
    marginLeft: 8,
    fontSize: 13,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  miniItem: {
    flex: 1,
  },
  miniLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  miniBarBg: {
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    marginBottom: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  miniCount: {
    fontSize: 10,
    color: '#94a3b8',
  },
  summary: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 8,
  },
  viewMore: {
    fontSize: 12,
    color: '#06b6d4',
    fontWeight: '500',
  },
});

export default DailyFlowStatusCard;

