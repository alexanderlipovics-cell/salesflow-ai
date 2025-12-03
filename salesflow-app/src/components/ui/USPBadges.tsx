/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - USP BADGES                                                ║
 * ║  Visuelle Darstellung der Unique Selling Points                           ║
 * ║  - Locked Block™ (Compliance)                                              ║
 * ║  - Neuro-Profiler (DISG)                                                   ║
 * ║  - Liability Shield                                                        ║
 * ║  - Silent Guard (RLS)                                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

export type DISGType = 'D' | 'I' | 'S' | 'G';

export interface DISGBadgeProps {
  type: DISGType | string | null;
  mini?: boolean;
  showLabel?: boolean;
  onPress?: () => void;
}

export interface ComplianceBadgeProps {
  checked?: boolean;
  score?: number; // 0-100
  issues?: number;
  onPress?: () => void;
}

export interface LiabilityShieldBadgeProps {
  blockedCount?: number;
  onPress?: () => void;
}

export interface LockedBlockBadgeProps {
  active?: boolean;
  onPress?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DISG_CONFIG: Record<DISGType, {
  label: string;
  labelFull: string;
  color: string;
  icon: string;
  description: string;
  tips: string[];
}> = {
  D: {
    label: 'D',
    labelFull: 'Dominant',
    color: '#ef4444',
    icon: '🔴',
    description: 'Direkt, entscheidungsfreudig, ergebnisorientiert',
    tips: [
      'Komm schnell zum Punkt',
      'Zeige klare Ergebnisse/ROI',
      'Sei selbstbewusst',
      'Vermeide zu viele Details',
    ],
  },
  I: {
    label: 'I',
    labelFull: 'Initiativ',
    color: '#f59e0b',
    icon: '🟡',
    description: 'Optimistisch, enthusiastisch, kontaktfreudig',
    tips: [
      'Sei freundlich und offen',
      'Erzähle Geschichten/Testimonials',
      'Zeige Begeisterung',
      'Plane Zeit für Small-Talk ein',
    ],
  },
  S: {
    label: 'S',
    labelFull: 'Stetig',
    color: '#22c55e',
    icon: '🟢',
    description: 'Geduldig, teamorientiert, loyal',
    tips: [
      'Baue Vertrauen langsam auf',
      'Betone Sicherheit & Stabilität',
      'Sei zuverlässig',
      'Vermeide Druck/Eile',
    ],
  },
  G: {
    label: 'G',
    labelFull: 'Gewissenhaft',
    color: '#3b82f6',
    icon: '🔵',
    description: 'Analytisch, präzise, qualitätsbewusst',
    tips: [
      'Liefere Fakten & Daten',
      'Sei präzise und detailliert',
      'Gib Zeit zum Nachdenken',
      'Vermeide übertriebene Claims',
    ],
  },
};

// =============================================================================
// DISG BADGE COMPONENT - Neuro-Profiler USP
// =============================================================================

export const DISGBadge: React.FC<DISGBadgeProps> = ({
  type,
  mini = false,
  showLabel = false,
  onPress,
}) => {
  if (!type || !DISG_CONFIG[type as DISGType]) return null;
  const config = DISG_CONFIG[type as DISGType];
  
  const content = (
    <View style={[
      mini ? styles.disgBadgeMini : styles.disgBadge,
      { borderColor: mini ? 'transparent' : config.color },
      mini && { backgroundColor: config.color + '20' },
    ]}>
      <Text style={mini ? styles.disgBadgeMiniText : styles.disgIcon}>
        {config.icon}
      </Text>
      {!mini && showLabel && (
        <View>
          <Text style={[styles.disgLabel, { color: config.color }]}>
            {config.labelFull}
          </Text>
          <Text style={styles.disgDesc}>{config.description}</Text>
        </View>
      )}
      {!mini && !showLabel && (
        <Text style={[styles.disgLabelSmall, { color: config.color }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
  
  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  
  return content;
};

// =============================================================================
// DISG DETAIL CARD - Shows tips
// =============================================================================

export const DISGDetailCard: React.FC<{ type: DISGType }> = ({ type }) => {
  const config = DISG_CONFIG[type];
  if (!config) return null;
  
  return (
    <View style={[styles.disgDetailCard, { borderColor: config.color }]}>
      <View style={styles.disgDetailHeader}>
        <Text style={styles.disgDetailIcon}>{config.icon}</Text>
        <View>
          <Text style={[styles.disgDetailTitle, { color: config.color }]}>
            {config.labelFull}
          </Text>
          <Text style={styles.disgDetailDesc}>{config.description}</Text>
        </View>
      </View>
      <View style={styles.disgTipsContainer}>
        <Text style={styles.disgTipsTitle}>💡 Kommunikations-Tipps:</Text>
        {config.tips.map((tip, index) => (
          <View key={index} style={styles.disgTipRow}>
            <Text style={styles.disgTipBullet}>•</Text>
            <Text style={styles.disgTipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// =============================================================================
// COMPLIANCE BADGE - Locked Block™ USP
// =============================================================================

export const ComplianceBadge: React.FC<ComplianceBadgeProps> = ({
  checked = false,
  score,
  issues = 0,
  onPress,
}) => {
  const content = (
    <View style={[
      styles.complianceBadge,
      checked ? styles.complianceBadgeChecked : styles.complianceBadgeWarning,
    ]}>
      <Text style={styles.complianceIcon}>
        {checked ? '🛡️' : issues > 0 ? '⚠️' : '🔒'}
      </Text>
      <View>
        <Text style={[
          styles.complianceText,
          checked ? styles.complianceTextChecked : styles.complianceTextWarning,
        ]}>
          {checked ? 'Compliance ✓' : issues > 0 ? `${issues} Issues` : 'Nicht geprüft'}
        </Text>
        {score !== undefined && (
          <Text style={styles.complianceScore}>Score: {score}%</Text>
        )}
      </View>
    </View>
  );
  
  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  
  return content;
};

// =============================================================================
// LIABILITY SHIELD BADGE
// =============================================================================

export const LiabilityShieldBadge: React.FC<LiabilityShieldBadgeProps> = ({
  blockedCount = 0,
  onPress,
}) => {
  if (blockedCount === 0) return null;
  
  const content = (
    <View style={styles.liabilityBadge}>
      <Text style={styles.liabilityIcon}>⚖️</Text>
      <Text style={styles.liabilityText}>
        {blockedCount} kritische Formulierung{blockedCount > 1 ? 'en' : ''} gefiltert
      </Text>
    </View>
  );
  
  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  
  return content;
};

// =============================================================================
// LOCKED BLOCK BADGE
// =============================================================================

export const LockedBlockBadge: React.FC<LockedBlockBadgeProps> = ({
  active = true,
  onPress,
}) => {
  const content = (
    <View style={[styles.lockedBlockBadge, active && styles.lockedBlockBadgeActive]}>
      <Text style={styles.lockedBlockIcon}>{active ? '🔐' : '🔓'}</Text>
      <Text style={[styles.lockedBlockText, active && styles.lockedBlockTextActive]}>
        Locked Block™ {active ? 'aktiv' : 'inaktiv'}
      </Text>
    </View>
  );
  
  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  
  return content;
};

// =============================================================================
// COMBINED USP ROW - Shows all active USPs
// =============================================================================

export interface USPRowProps {
  disgType?: DISGType | string | null;
  complianceChecked?: boolean;
  complianceScore?: number;
  liabilityBlocked?: number;
  lockedBlockActive?: boolean;
  onDISGPress?: () => void;
  onCompliancePress?: () => void;
}

export const USPRow: React.FC<USPRowProps> = ({
  disgType,
  complianceChecked,
  complianceScore,
  liabilityBlocked = 0,
  lockedBlockActive = true,
  onDISGPress,
  onCompliancePress,
}) => {
  return (
    <View style={styles.uspRow}>
      {disgType && (
        <DISGBadge type={disgType} mini onPress={onDISGPress} />
      )}
      {complianceChecked !== undefined && (
        <ComplianceBadge
          checked={complianceChecked}
          score={complianceScore}
          onPress={onCompliancePress}
        />
      )}
      {liabilityBlocked > 0 && (
        <LiabilityShieldBadge blockedCount={liabilityBlocked} />
      )}
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // DISG Badge
  disgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#1e293b',
  },
  disgBadgeMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disgBadgeMiniText: {
    fontSize: 11,
  },
  disgIcon: {
    fontSize: 16,
  },
  disgLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  disgLabelSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  disgDesc: {
    fontSize: 10,
    color: '#94a3b8',
  },
  
  // DISG Detail Card
  disgDetailCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  disgDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  disgDetailIcon: {
    fontSize: 32,
  },
  disgDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  disgDetailDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  disgTipsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
  },
  disgTipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  disgTipRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  disgTipBullet: {
    color: '#8b5cf6',
    marginRight: 8,
    fontSize: 14,
  },
  disgTipText: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  
  // Compliance Badge
  complianceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  complianceBadgeChecked: {
    backgroundColor: '#dcfce7',
  },
  complianceBadgeWarning: {
    backgroundColor: '#fef3c7',
  },
  complianceIcon: {
    fontSize: 14,
  },
  complianceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  complianceTextChecked: {
    color: '#166534',
  },
  complianceTextWarning: {
    color: '#92400e',
  },
  complianceScore: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },
  
  // Liability Shield Badge
  liabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fef3c720',
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },
  liabilityIcon: {
    fontSize: 14,
  },
  liabilityText: {
    fontSize: 11,
    color: '#f59e0b',
  },
  
  // Locked Block Badge
  lockedBlockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#64748b20',
  },
  lockedBlockBadgeActive: {
    backgroundColor: '#8b5cf620',
    borderWidth: 1,
    borderColor: '#8b5cf640',
  },
  lockedBlockIcon: {
    fontSize: 14,
  },
  lockedBlockText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  lockedBlockTextActive: {
    color: '#8b5cf6',
  },
  
  // USP Row
  uspRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
});

export default {
  DISGBadge,
  DISGDetailCard,
  ComplianceBadge,
  LiabilityShieldBadge,
  LockedBlockBadge,
  USPRow,
  DISG_CONFIG,
};

