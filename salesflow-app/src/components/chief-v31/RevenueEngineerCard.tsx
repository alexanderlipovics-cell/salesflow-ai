/**
 * RevenueEngineerCard Component
 * Zeigt Revenue Engineering Targets und Goal Progress
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import { calculateDailyTargets, DailyTargets } from '../../services/chiefV31Service';

interface RevenueEngineerCardProps {
  monthlyTarget: number;
  currentRevenue: number;
  avgDealSize?: number;
  onPress?: () => void;
  compact?: boolean;
}

const RevenueEngineerCard: React.FC<RevenueEngineerCardProps> = ({
  monthlyTarget,
  currentRevenue,
  avgDealSize = 100,
  onPress,
  compact = false,
}) => {
  const [targets, setTargets] = useState<DailyTargets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTargets();
  }, [monthlyTarget, currentRevenue, avgDealSize]);

  const loadTargets = async () => {
    try {
      setLoading(true);
      const result = await calculateDailyTargets({
        monthlyTarget,
        currentRevenue,
        avgDealSize,
      });
      setTargets(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !targets) {
    return null;
  }

  const progressPercent = Math.round((currentRevenue / monthlyTarget) * 100);
  const statusColor = targets.on_track ? COLORS.success : COLORS.warning;
  const statusEmoji = targets.on_track ? '✅' : '⚠️';

  if (compact) {
    return (
      <TouchableOpacity 
        style={[styles.container, styles.containerCompact]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle}>📊 Tagesziel</Text>
          <Text style={[styles.compactStatus, { color: statusColor }]}>
            {statusEmoji} {targets.on_track ? 'On Track' : 'Behind'}
          </Text>
        </View>
        <View style={styles.compactStats}>
          <View style={styles.compactStat}>
            <Text style={styles.compactNumber}>{targets.daily_outreach_required}</Text>
            <Text style={styles.compactLabel}>Outreaches</Text>
          </View>
          <View style={styles.compactStat}>
            <Text style={styles.compactNumber}>{Math.round(targets.expected_replies)}</Text>
            <Text style={styles.compactLabel}>Replies</Text>
          </View>
          <View style={styles.compactStat}>
            <Text style={styles.compactNumber}>{targets.deals_needed}</Text>
            <Text style={styles.compactLabel}>Deals nötig</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📊 Revenue Engineering</Text>
          <Text style={styles.subtitle}>Dein Weg zum Monatsziel</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusEmoji} {targets.on_track ? 'On Track' : 'Action needed'}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            €{currentRevenue.toLocaleString()} von €{monthlyTarget.toLocaleString()}
          </Text>
          <Text style={styles.progressPercent}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(progressPercent, 100)}%`,
                backgroundColor: statusColor,
              }
            ]} 
          />
        </View>
        <Text style={styles.gapText}>
          Gap: €{targets.revenue_gap.toLocaleString()} ({targets.deals_needed} Deals)
        </Text>
      </View>

      {/* Daily Targets */}
      <View style={styles.targetsSection}>
        <Text style={styles.targetsTitle}>🎯 HEUTE BRAUCHST DU:</Text>
        <View style={styles.targetsGrid}>
          <View style={styles.targetItem}>
            <Text style={styles.targetNumber}>{targets.daily_outreach_required}</Text>
            <Text style={styles.targetLabel}>Outreaches</Text>
          </View>
          <View style={styles.targetDivider} />
          <View style={styles.targetItem}>
            <Text style={styles.targetNumber}>~{Math.round(targets.expected_replies)}</Text>
            <Text style={styles.targetLabel}>Replies</Text>
          </View>
          <View style={styles.targetDivider} />
          <View style={styles.targetItem}>
            <Text style={styles.targetNumber}>~{Math.round(targets.expected_meetings)}</Text>
            <Text style={styles.targetLabel}>Gespräche</Text>
          </View>
          <View style={styles.targetDivider} />
          <View style={styles.targetItem}>
            <Text style={styles.targetNumber}>~{targets.expected_deals.toFixed(1)}</Text>
            <Text style={styles.targetLabel}>Deals</Text>
          </View>
        </View>
      </View>

      {/* Warning if not on track */}
      {!targets.on_track && (
        <View style={styles.warningSection}>
          <Text style={styles.warningText}>
            ⚠️ Du brauchst mehr Aktivität als gewöhnlich. 
            Optionen: Mehr Outreach, bessere Conversion, oder Ziel anpassen.
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  containerCompact: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: SPACING.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  progressLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  progressPercent: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  gapText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  targetsSection: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  targetsTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  targetsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  targetItem: {
    alignItems: 'center',
    flex: 1,
  },
  targetNumber: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
  },
  targetLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  targetDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  warningSection: {
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  warningText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.warning,
  },
  // Compact styles
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  compactTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
  },
  compactStatus: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  compactStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  compactStat: {
    alignItems: 'center',
  },
  compactNumber: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
  },
  compactLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
});

export default RevenueEngineerCard;

