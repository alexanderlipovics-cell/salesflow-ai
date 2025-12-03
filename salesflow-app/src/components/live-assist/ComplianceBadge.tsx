/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMPLIANCE BADGE                                                          ║
 * ║  Zeigt den Compliance-Score einer Antwort an                               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ComplianceBadgeProps {
  score: number;  // 0-100
  issues?: number;  // Anzahl der Probleme
  showDetails?: boolean;  // Zeigt Details wie Issue-Count
}

const getScoreColor = (score: number) => {
  if (score >= 90) return { bg: '#22C55E', text: '#ECFDF5', icon: 'shield-checkmark' };  // Green - Excellent
  if (score >= 70) return { bg: '#F59E0B', text: '#FFFBEB', icon: 'warning' };  // Yellow - OK
  if (score >= 50) return { bg: '#F97316', text: '#FFF7ED', icon: 'alert-circle' };  // Orange - Warning
  return { bg: '#EF4444', text: '#FEE2E2', icon: 'close-circle' };  // Red - Critical
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return 'Compliant';
  if (score >= 70) return 'OK';
  if (score >= 50) return 'Warnung';
  return 'Kritisch';
};

export function ComplianceBadge({ score, issues = 0, showDetails = false }: ComplianceBadgeProps) {
  const colors = getScoreColor(score);
  
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Ionicons name={colors.icon as any} size={12} color={colors.text} style={styles.icon} />
      <Text style={[styles.text, { color: colors.text }]}>
        {score >= 90 ? '✓' : `${Math.round(score)}%`}
      </Text>
      {showDetails && issues > 0 && (
        <Text style={[styles.issueCount, { color: colors.text }]}>
          ({issues} korrigiert)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  issueCount: {
    fontSize: 9,
    marginLeft: 4,
    opacity: 0.9,
  },
});

export default ComplianceBadge;

