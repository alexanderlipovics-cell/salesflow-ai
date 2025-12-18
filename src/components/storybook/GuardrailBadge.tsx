/**
 * GuardrailBadge Component
 * Zeigt Compliance-Regeln als Badge
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../theme';

interface Guardrail {
  id?: string;
  rule_name: string;
  rule_description: string;
  severity: 'block' | 'warn' | 'suggest';
  example_bad?: string;
  example_good?: string;
  legal_reference?: string;
}

interface GuardrailBadgeProps {
  guardrail: Guardrail;
  compact?: boolean;
  onPress?: () => void;
}

const SEVERITY_CONFIG = {
  block: {
    icon: '🚫',
    label: 'Verboten',
    color: COLORS.error,
    bg: COLORS.errorBg,
  },
  warn: {
    icon: '⚠️',
    label: 'Warnung',
    color: COLORS.warning,
    bg: COLORS.warningBg,
  },
  suggest: {
    icon: '💡',
    label: 'Vorschlag',
    color: COLORS.info,
    bg: COLORS.infoBg,
  },
};

const GuardrailBadge: React.FC<GuardrailBadgeProps> = ({
  guardrail,
  compact = false,
  onPress,
}) => {
  const config = SEVERITY_CONFIG[guardrail.severity];

  const formatRuleName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactBadge, { backgroundColor: config.bg }]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <Text style={styles.compactIcon}>{config.icon}</Text>
        <Text style={[styles.compactText, { color: config.color }]}>
          {formatRuleName(guardrail.rule_name)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: config.color }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.severityBadge, { backgroundColor: config.bg }]}>
          <Text style={styles.severityIcon}>{config.icon}</Text>
          <Text style={[styles.severityLabel, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
        {guardrail.legal_reference && (
          <Text style={styles.legalRef}>📜 {guardrail.legal_reference}</Text>
        )}
      </View>

      {/* Rule Name */}
      <Text style={styles.ruleName}>
        {formatRuleName(guardrail.rule_name)}
      </Text>

      {/* Description */}
      <Text style={styles.description}>
        {guardrail.rule_description}
      </Text>

      {/* Examples */}
      {guardrail.example_bad && (
        <View style={styles.exampleContainer}>
          <Text style={styles.exampleLabel}>❌ Nicht:</Text>
          <Text style={styles.exampleBad}>"{guardrail.example_bad}"</Text>
        </View>
      )}

      {guardrail.example_good && (
        <View style={styles.exampleContainer}>
          <Text style={styles.exampleLabel}>✅ Besser:</Text>
          <Text style={styles.exampleGood}>"{guardrail.example_good}"</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  compactIcon: {
    fontSize: 12,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  severityIcon: {
    fontSize: 12,
  },
  severityLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  legalRef: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  ruleName: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  description: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  exampleContainer: {
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
  },
  exampleLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  exampleBad: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
    fontStyle: 'italic',
  },
  exampleGood: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.success,
    fontStyle: 'italic',
  },
});

export default GuardrailBadge;

