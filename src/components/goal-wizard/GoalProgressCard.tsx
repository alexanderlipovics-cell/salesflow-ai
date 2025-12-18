/**
 * GOAL PROGRESS CARD
 * 
 * Dashboard Widget das den Fortschritt zum Ziel anzeigt.
 * Kann auf dem Dashboard oder in anderen Screens eingebettet werden.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface GoalProgressCardProps {
  // Ziel-Informationen
  companyName: string;
  companyLogo?: string;
  targetRankName: string;
  targetIncome?: number;
  
  // Fortschritt
  daysRemaining: number;
  progressPercent: number;
  
  // Tägliche Ziele
  dailyContacts: number;
  dailyFollowups: number;
  dailyReactivations: number;
  
  // Optionen
  onPress?: () => void;
  compact?: boolean;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  companyName,
  companyLogo = '🎯',
  targetRankName,
  targetIncome,
  daysRemaining,
  progressPercent,
  dailyContacts,
  dailyFollowups,
  dailyReactivations,
  onPress,
  compact = false,
}) => {
  const Wrapper = onPress ? TouchableOpacity : View;

  if (compact) {
    return (
      <Wrapper style={styles.containerCompact} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactLogo}>{companyLogo}</Text>
          <View style={styles.compactInfo}>
            <Text style={styles.compactTitle}>{targetRankName}</Text>
            <Text style={styles.compactDays}>{daysRemaining} Tage übrig</Text>
          </View>
          <View style={styles.compactProgress}>
            <Text style={styles.compactPercent}>{Math.round(progressPercent)}%</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(100, progressPercent)}%` }]} />
        </View>
      </Wrapper>
    );
  }

  return (
    <Wrapper style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>{companyLogo}</Text>
          <View>
            <Text style={styles.company}>{companyName}</Text>
            <Text style={styles.rank}>{targetRankName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.daysNumber}>{daysRemaining}</Text>
          <Text style={styles.daysLabel}>Tage</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(100, progressPercent)}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progressPercent)}% Zeitfortschritt</Text>
      </View>

      {/* Daily Targets */}
      <View style={styles.dailySection}>
        <Text style={styles.dailyTitle}>Heute:</Text>
        <View style={styles.dailyGrid}>
          <View style={styles.dailyItem}>
            <Text style={styles.dailyValue}>{dailyContacts}</Text>
            <Text style={styles.dailyLabel}>Kontakte</Text>
          </View>
          <View style={styles.dailyDivider} />
          <View style={styles.dailyItem}>
            <Text style={styles.dailyValue}>{dailyFollowups}</Text>
            <Text style={styles.dailyLabel}>Follow-ups</Text>
          </View>
          <View style={styles.dailyDivider} />
          <View style={styles.dailyItem}>
            <Text style={styles.dailyValue}>{dailyReactivations}</Text>
            <Text style={styles.dailyLabel}>Reaktiv.</Text>
          </View>
        </View>
      </View>

      {/* Target Income */}
      {targetIncome && (
        <View style={styles.incomeSection}>
          <Text style={styles.incomeLabel}>Ziel-Einkommen:</Text>
          <Text style={styles.incomeValue}>{targetIncome.toLocaleString('de-DE')} €/Monat</Text>
        </View>
      )}
    </Wrapper>
  );
};

/**
 * Leere Karte für wenn kein Ziel gesetzt ist
 */
export const GoalProgressCardEmpty: React.FC<{ onSetGoal?: () => void }> = ({ onSetGoal }) => (
  <TouchableOpacity style={styles.emptyContainer} onPress={onSetGoal} activeOpacity={0.7}>
    <Text style={styles.emptyIcon}>🎯</Text>
    <Text style={styles.emptyTitle}>Kein Ziel gesetzt</Text>
    <Text style={styles.emptySubtitle}>
      Tippe hier, um dein Einkommensziel festzulegen und tägliche Aktivitäten zu berechnen.
    </Text>
    <View style={styles.emptyButton}>
      <Text style={styles.emptyButtonText}>Ziel festlegen →</Text>
    </View>
  </TouchableOpacity>
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Main Container
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    marginRight: 12,
  },
  company: {
    fontSize: 13,
    color: '#94a3b8',
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  daysNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#06b6d4',
  },
  daysLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  
  // Progress
  progressSection: {
    marginBottom: 18,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#06b6d4',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'right',
  },
  
  // Daily Section
  dailySection: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderRadius: 14,
    padding: 14,
  },
  dailyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 10,
  },
  dailyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dailyItem: {
    alignItems: 'center',
    flex: 1,
  },
  dailyValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#06b6d4',
  },
  dailyLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  dailyDivider: {
    width: 1,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    marginHorizontal: 8,
  },
  
  // Income Section
  incomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  incomeLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  incomeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22d3ee',
  },
  
  // Compact Version
  containerCompact: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  compactLogo: {
    fontSize: 24,
    marginRight: 10,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
  compactDays: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  compactProgress: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06b6d4',
  },
  
  // Empty State
  emptyContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06b6d4',
  },
});

export default GoalProgressCard;

