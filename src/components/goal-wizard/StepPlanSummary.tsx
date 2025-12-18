/**
 * STEP 3: PLAN SUMMARY
 * 
 * Dritte Seite des Goal Wizards.
 * Zeigt die berechneten Ziele und Daily Flow Targets.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  CompensationPlan,
  GoalCalculationResult,
  GoalType,
  DISCLAIMER_TEXT,
} from '../../types/compensation';

interface StepPlanSummaryProps {
  plan: CompensationPlan;
  result: GoalCalculationResult;
  goalType: GoalType;
  targetIncome: number;
  timeframeMonths: number;
}

export const StepPlanSummary: React.FC<StepPlanSummaryProps> = ({
  plan,
  result,
  goalType,
  targetIncome,
  timeframeMonths,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyLogo}>{plan.company_logo}</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>Dein Plan mit {plan.company_name}</Text>
          <Text style={styles.subtitle}>
            {goalType === 'income'
              ? `Ziel: ${targetIncome.toLocaleString('de-DE')} €/Monat`
              : `Ziel: ${result.target_rank.name}`}
            {' • '}{timeframeMonths} Monate
          </Text>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.cards}>
        {/* Target Rank */}
        <SummaryCard
          icon="🎯"
          label="Ziel-Rang"
          value={result.target_rank.name}
          highlight
        />

        {/* Volume */}
        <SummaryCard
          icon="📊"
          label="Benötigtes Volumen"
          value={`${result.missing_group_volume.toLocaleString('de-DE')} ${plan.unit_label}`}
        />

        {/* Customers & Partners */}
        <SummaryCard
          icon="👥"
          label="Das bedeutet ca."
          value={`${result.estimated_customers} Kunden + ${result.estimated_partners} Partner`}
        />
      </View>

      {/* Weekly Targets */}
      <View style={styles.targetsSection}>
        <Text style={styles.targetsTitle}>📅 Pro Woche</Text>
        <View style={styles.targetsCard}>
          <TargetRow 
            label="Neue Kontakte ansprechen" 
            value={result.daily_targets.weekly.new_contacts} 
          />
          <TargetRow 
            label="Follow-ups durchführen" 
            value={result.daily_targets.weekly.followups} 
          />
          <TargetRow 
            label="Alte Kontakte reaktivieren" 
            value={result.daily_targets.weekly.reactivations} 
          />
          <View style={styles.divider} />
          <TargetRow 
            label="Neue Kunden gewinnen" 
            value={result.daily_targets.weekly.new_customers} 
            highlighted
          />
          <TargetRow 
            label="Neue Partner gewinnen" 
            value={result.daily_targets.weekly.new_partners} 
            highlighted
          />
        </View>
      </View>

      {/* Daily Targets - Highlighted */}
      <View style={styles.dailySection}>
        <Text style={styles.dailyTitle}>🎯 Deine täglichen Ziele</Text>
        <View style={styles.dailyCard}>
          <View style={styles.dailyGrid}>
            <DailyBox 
              icon="📱" 
              value={result.daily_targets.daily.new_contacts} 
              label="Kontakte" 
            />
            <DailyBox 
              icon="🔄" 
              value={result.daily_targets.daily.followups} 
              label="Follow-ups" 
            />
            <DailyBox 
              icon="💤" 
              value={result.daily_targets.daily.reactivations} 
              label="Reaktivierungen" 
            />
          </View>
          <Text style={styles.dailyHint}>
            Bei 5 Arbeitstagen pro Woche
          </Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        <Text style={styles.timelineTitle}>⏱️ Zeitplan</Text>
        <View style={styles.timelineContent}>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineValue}>{timeframeMonths}</Text>
            <Text style={styles.timelineLabel}>Monate</Text>
          </View>
          <View style={styles.timelineDivider} />
          <View style={styles.timelineItem}>
            <Text style={styles.timelineValue}>{timeframeMonths * 4}</Text>
            <Text style={styles.timelineLabel}>Wochen</Text>
          </View>
          <View style={styles.timelineDivider} />
          <View style={styles.timelineItem}>
            <Text style={styles.timelineValue}>{Math.round(result.per_month_volume)}</Text>
            <Text style={styles.timelineLabel}>{plan.unit_label}/Monat</Text>
          </View>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{DISCLAIMER_TEXT}</Text>
      </View>
    </View>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface SummaryCardProps {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, highlight }) => (
  <View style={[styles.summaryCard, highlight && styles.summaryCardHighlight]}>
    <Text style={styles.summaryIcon}>{icon}</Text>
    <View style={styles.summaryContent}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>
        {value}
      </Text>
    </View>
  </View>
);

interface TargetRowProps {
  label: string;
  value: number;
  highlighted?: boolean;
}

const TargetRow: React.FC<TargetRowProps> = ({ label, value, highlighted }) => (
  <View style={styles.targetRow}>
    <Text style={styles.targetLabel}>{label}</Text>
    <Text style={[styles.targetValue, highlighted && styles.targetValueHighlighted]}>
      {value}
    </Text>
  </View>
);

interface DailyBoxProps {
  icon: string;
  value: number;
  label: string;
}

const DailyBox: React.FC<DailyBoxProps> = ({ icon, value, label }) => (
  <View style={styles.dailyBox}>
    <Text style={styles.dailyIcon}>{icon}</Text>
    <Text style={styles.dailyValue}>{value}</Text>
    <Text style={styles.dailyLabel}>{label}</Text>
  </View>
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  companyLogo: {
    fontSize: 48,
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  
  // Summary Cards
  cards: {
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  summaryCardHighlight: {
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  summaryIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f8fafc',
  },
  summaryValueHighlight: {
    color: '#06b6d4',
  },
  
  // Targets Section
  targetsSection: {
    marginBottom: 20,
  },
  targetsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  targetsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  targetLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  targetValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  targetValueHighlighted: {
    color: '#22d3ee',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 8,
  },
  
  // Daily Section
  dailySection: {
    marginBottom: 20,
  },
  dailyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
  },
  dailyCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  dailyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  dailyBox: {
    alignItems: 'center',
  },
  dailyIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  dailyValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#06b6d4',
  },
  dailyLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  dailyHint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  
  // Timeline
  timeline: {
    marginBottom: 20,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 12,
  },
  timelineContent: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'space-around',
  },
  timelineItem: {
    alignItems: 'center',
  },
  timelineValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
  },
  timelineLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  timelineDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  
  // Disclaimer
  disclaimer: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default StepPlanSummary;

