/**
 * EarningsCalculator - Calculates Zinzino earnings based on rank data
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ZinzinoRankData } from '../../hooks/useZinzinoMLM';
import { ZINZINO_ALL_RANKS, CAB_TIERS } from '../../data/zinzinoRanks';

interface Props {
  rankData: ZinzinoRankData;
  currentRank: string;
}

export default function EarningsCalculator({ rankData, currentRank }: Props) {
  // Get current rank benefits (outside useMemo for use in JSX)
  const rankObj = ZINZINO_ALL_RANKS.find(r => r.id === currentRank);
  
  const calculations = useMemo(() => {
    // Calculate balanced credits
    const smaller = Math.min(rankData.left_credits, rankData.right_credits);
    const larger = Math.max(rankData.left_credits, rankData.right_credits);
    const balanced = Math.min(larger + smaller, smaller * 3);

    // Get provision percent
    const provisionPercent = rankObj?.benefits?.team_provision
      ? parseFloat(rankObj.benefits.team_provision.replace('%', ''))
      : 10;

    // Team Provision
    const teamProvision = (balanced * provisionPercent) / 100;

    // CAB Bonus
    const cabTier = CAB_TIERS.find(
      tier =>
        rankData.left_credits >= tier.left_credits &&
        rankData.right_credits >= tier.right_credits
    );
    const cabBonus = cabTier?.pay_points || 0;

    // Customer Career Cash Bonus (if applicable)
    const customerRank = ZINZINO_ALL_RANKS.find(
      r => r.type === 'customer' && r.id === currentRank
    );
    const cashBonusPercent = customerRank?.benefits?.cash_bonus
      ? parseFloat(customerRank.benefits.cash_bonus.replace('%', ''))
      : 0;
    const cashBonus = (rankData.pcv * cashBonusPercent) / 100;

    // Monthly Bonus (if applicable)
    const monthlyBonus = customerRank?.benefits?.monthly_bonus || '0';

    // Total Monthly
    const totalMonthly = teamProvision + cabBonus + cashBonus;

    return {
      balanced,
      teamProvision,
      cabBonus,
      cabTier: cabTier?.tier || null,
      cashBonus,
      monthlyBonus,
      totalMonthly,
    };
  }, [rankData, currentRank]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💰 Monatliche Einnahmen</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Provision</Text>
        <Text style={styles.amount}>
          {calculations.teamProvision.toFixed(2)} PP
        </Text>
        <Text style={styles.details}>
          Balanced: {calculations.balanced} Credits × {rankObj?.benefits?.team_provision || '10%'}
        </Text>
      </View>

      {calculations.cabBonus > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CAB Bonus (Tier {calculations.cabTier})</Text>
          <Text style={styles.amount}>{calculations.cabBonus} PP</Text>
        </View>
      )}

      {calculations.cashBonus > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cash Bonus</Text>
          <Text style={styles.amount}>
            {calculations.cashBonus.toFixed(2)} PP
          </Text>
        </View>
      )}

      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Gesamt (monatlich)</Text>
        <Text style={styles.totalAmount}>
          {calculations.totalMonthly.toFixed(2)} PP
        </Text>
        <Text style={styles.totalEur}>
          ≈ €{calculations.totalMonthly.toFixed(2)}
        </Text>
      </View>
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
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  details: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  totalSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#3B82F6',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
  },
  totalEur: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
});

