/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ANALYTICS - PIPELINE VALUE                                                  ║
 * ║  Gewichteter Pipeline-Wert nach Wahrscheinlichkeit                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AURA_COLORS, AURA_SPACING, AURA_RADIUS, AURA_FONTS } from '../aura';

interface Deal {
  stage: string;
  value: number;
  probability: number; // 0-100
}

interface PipelineValueProps {
  deals: Deal[];
  currency?: string;
}

// Stage-Wahrscheinlichkeiten (falls nicht in Deal vorhanden)
const DEFAULT_PROBABILITIES: Record<string, number> = {
  lead: 10,
  contacted: 20,
  qualified: 40,
  proposal_sent: 60,
  negotiation: 80,
  closed_won: 100,
  closed_lost: 0,
};

export const PipelineValue: React.FC<PipelineValueProps> = ({
  deals,
  currency = '€',
}) => {
  // Berechne gewichteten Pipeline-Wert
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const weightedValue = deals.reduce(
    (sum, deal) => sum + deal.value * (deal.probability / 100),
    0
  );

  // Durchschnittliche Deal-Größe
  const avgDealSize = deals.length > 0 ? totalValue / deals.length : 0;

  // Gruppiere nach Stage
  const dealsByStage: Record<string, { count: number; value: number }> = {};
  deals.forEach((deal) => {
    if (!dealsByStage[deal.stage]) {
      dealsByStage[deal.stage] = { count: 0, value: 0 };
    }
    dealsByStage[deal.stage].count += 1;
    dealsByStage[deal.stage].value += deal.value;
  });

  const stages = Object.entries(dealsByStage).sort(
    (a, b) => (DEFAULT_PROBABILITIES[b[0]] || 0) - (DEFAULT_PROBABILITIES[a[0]] || 0)
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pipeline-Wert</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Gesamt</Text>
          <Text style={[styles.statValue, { color: AURA_COLORS.neon.cyan }]}>
            {currency}
            {totalValue.toLocaleString('de-DE')}
          </Text>
          <Text style={styles.statSubtext}>{deals.length} Deals</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Gewichtet</Text>
          <Text style={[styles.statValue, { color: AURA_COLORS.neon.green }]}>
            {currency}
            {weightedValue.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.statSubtext}>Nach Wahrscheinlichkeit</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Ø Deal-Größe</Text>
          <Text style={[styles.statValue, { color: AURA_COLORS.neon.amber }]}>
            {currency}
            {avgDealSize.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.statSubtext}>Durchschnitt</Text>
        </View>
      </View>

      <View style={styles.stagesContainer}>
        <Text style={styles.sectionTitle}>Deals nach Stage</Text>
        {stages.map(([stage, data]) => {
          const probability = DEFAULT_PROBABILITIES[stage] || 50;
          return (
            <View key={stage} style={styles.stageRow}>
              <View style={styles.stageInfo}>
                <Text style={styles.stageName}>{formatStageName(stage)}</Text>
                <Text style={styles.stageMeta}>
                  {data.count} Deals • {probability}% Wahrscheinlichkeit
                </Text>
              </View>
              <View style={styles.stageValue}>
                <Text style={styles.stageValueText}>
                  {currency}
                  {data.value.toLocaleString('de-DE')}
                </Text>
                <Text style={styles.stageWeightedText}>
                  {currency}
                  {(data.value * (probability / 100)).toLocaleString('de-DE', {
                    maximumFractionDigits: 0,
                  })}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

function formatStageName(stage: string): string {
  const stageNames: Record<string, string> = {
    lead: 'Lead',
    contacted: 'Kontaktiert',
    qualified: 'Qualifiziert',
    proposal_sent: 'Angebot gesendet',
    negotiation: 'Verhandlung',
    closed_won: 'Gewonnen',
    closed_lost: 'Verloren',
  };
  return stageNames[stage] || stage;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.lg,
    padding: AURA_SPACING.lg,
    marginVertical: AURA_SPACING.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  title: {
    ...AURA_FONTS.title,
    fontSize: 18,
    color: AURA_COLORS.text.primary,
    marginBottom: AURA_SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: AURA_SPACING.sm,
    marginBottom: AURA_SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: AURA_RADIUS.md,
    padding: AURA_SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  statLabel: {
    ...AURA_FONTS.caption,
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginBottom: AURA_SPACING.xs,
  },
  statValue: {
    ...AURA_FONTS.title,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: AURA_SPACING.xs,
  },
  statSubtext: {
    ...AURA_FONTS.caption,
    fontSize: 10,
    color: AURA_COLORS.text.subtle,
  },
  stagesContainer: {
    marginTop: AURA_SPACING.md,
  },
  sectionTitle: {
    ...AURA_FONTS.subtitle,
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    marginBottom: AURA_SPACING.md,
  },
  stageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: AURA_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    ...AURA_FONTS.body,
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  stageMeta: {
    ...AURA_FONTS.caption,
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  stageValue: {
    alignItems: 'flex-end',
  },
  stageValueText: {
    ...AURA_FONTS.body,
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  stageWeightedText: {
    ...AURA_FONTS.caption,
    fontSize: 11,
    color: AURA_COLORS.neon.green,
    marginTop: 2,
  },
});

