/**
 * FastStartProgress - Shows Fast Start Plan progress (first 120 days)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FAST_START_MILESTONES } from '../../data/zinzinoRanks';

interface Props {
  premierCustomers: number;
  daysSinceStart: number;
}

export default function FastStartProgress({ premierCustomers, daysSinceStart }: Props) {
  const completedMilestones = FAST_START_MILESTONES.filter(
    m => premierCustomers >= m.premier_customers && daysSinceStart <= m.days
  );
  const nextMilestone = FAST_START_MILESTONES.find(
    m => premierCustomers < m.premier_customers && daysSinceStart <= m.days
  );
  const totalEarned = completedMilestones.reduce((sum, m) => sum + m.pay_points, 0);
  const maxPossible = FAST_START_MILESTONES.reduce((sum, m) => sum + m.pay_points, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚡ Fast Start Plan (120 Tage)</Text>
      <Text style={styles.subtitle}>
        {totalEarned} / {maxPossible} PP verdient
      </Text>

      <View style={styles.milestonesContainer}>
        {FAST_START_MILESTONES.map((milestone, index) => {
          const isCompleted = completedMilestones.some(m => m.days === milestone.days);
          const isNext = nextMilestone?.days === milestone.days;
          const isExpired = daysSinceStart > milestone.days && !isCompleted;

          return (
            <View
              key={milestone.days}
              style={[
                styles.milestone,
                isCompleted && styles.milestoneCompleted,
                isNext && styles.milestoneNext,
                isExpired && styles.milestoneExpired,
              ]}
            >
              <View style={styles.milestoneHeader}>
                <Text style={styles.milestoneDays}>{milestone.days} Tage</Text>
                {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                {isExpired && <Text style={styles.expired}>✗</Text>}
              </View>
              <Text style={styles.milestoneRequirement}>
                {milestone.premier_customers} Premier Customers
              </Text>
              <Text style={styles.milestoneReward}>
                {milestone.pay_points} PP
              </Text>
              {isNext && (
                <View style={styles.progressIndicator}>
                  <Text style={styles.progressText}>
                    {premierCustomers} / {milestone.premier_customers}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {nextMilestone && daysSinceStart <= nextMilestone.days && (
        <View style={styles.nextMilestoneInfo}>
          <Text style={styles.nextMilestoneText}>
            Nächster Meilenstein in {nextMilestone.days - daysSinceStart} Tagen
          </Text>
          <Text style={styles.nextMilestoneRequirement}>
            Noch {nextMilestone.premier_customers - premierCustomers} Premier Customers
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  milestonesContainer: {
    gap: 8,
  },
  milestone: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  milestoneCompleted: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  milestoneNext: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
  },
  milestoneExpired: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    opacity: 0.6,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  milestoneDays: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  checkmark: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: 'bold',
  },
  expired: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  milestoneRequirement: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  milestoneReward: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  progressIndicator: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
  },
  nextMilestoneInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  nextMilestoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  nextMilestoneRequirement: {
    fontSize: 12,
    color: '#64748B',
  },
});

