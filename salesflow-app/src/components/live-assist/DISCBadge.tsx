/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  DISC BADGE COMPONENT                                                      ║
 * ║  Zeigt den erkannten DISC-Typ des Kontakts an                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// =============================================================================
// TYPES
// =============================================================================

export type DISCType = 'D' | 'I' | 'S' | 'C' | '?';

export interface DISCProfile {
  primaryType: DISCType;
  secondaryType?: DISCType;
  confidence: number;
  communicationStyle: string;
  toneRecommendation: string;
}

interface DISCBadgeProps {
  profile: DISCProfile | null;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animated?: boolean;
}

// =============================================================================
// DISC COLORS & INFO
// =============================================================================

const DISC_CONFIG = {
  D: {
    color: '#DC2626', // Red
    bgColor: '#FEE2E2',
    label: 'Dominant',
    shortLabel: 'D-Typ',
    icon: 'flash-outline',
    description: 'Direkt, ergebnisorientiert, entscheidungsfreudig',
    tips: [
      'Komm auf den Punkt',
      'Zeig ROI und Ergebnisse',
      'Biete Optionen an',
      'Keine langen Einleitungen',
    ],
  },
  I: {
    color: '#F59E0B', // Amber/Yellow
    bgColor: '#FEF3C7',
    label: 'Initiativ',
    shortLabel: 'I-Typ',
    icon: 'happy-outline',
    description: 'Enthusiastisch, beziehungsorientiert, gesprächig',
    tips: [
      'Sei begeistert',
      'Erzähle Stories',
      'Mach es persönlich',
      'Zeig die Vision',
    ],
  },
  S: {
    color: '#22C55E', // Green
    bgColor: '#DCFCE7',
    label: 'Stetig',
    shortLabel: 'S-Typ',
    icon: 'heart-outline',
    description: 'Ruhig, harmoniebedürftig, geduldig',
    tips: [
      'Gib Zeit zum Nachdenken',
      'Betone Sicherheit',
      'Kein Druck',
      'Schritt für Schritt',
    ],
  },
  C: {
    color: '#3B82F6', // Blue
    bgColor: '#DBEAFE',
    label: 'Gewissenhaft',
    shortLabel: 'C-Typ',
    icon: 'analytics-outline',
    description: 'Analytisch, detailorientiert, vorsichtig',
    tips: [
      'Bring Zahlen und Daten',
      'Sei präzise',
      'Biete Dokumentation an',
      'Logisch argumentieren',
    ],
  },
  '?': {
    color: '#6B7280', // Gray
    bgColor: '#F3F4F6',
    label: 'Unbekannt',
    shortLabel: '?',
    icon: 'help-outline',
    description: 'Nicht genug Daten für eine Einschätzung',
    tips: ['Stell offene Fragen', 'Beobachte die Kommunikation'],
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DISCBadge({
  profile,
  onPress,
  size = 'medium',
  showLabel = true,
  animated = true,
}: DISCBadgeProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showModal, setShowModal] = React.useState(false);

  const discType = profile?.primaryType || '?';
  const config = DISC_CONFIG[discType];
  const confidence = profile?.confidence || 0;

  // Pulse animation when confidence is high
  useEffect(() => {
    if (animated && confidence > 0.7) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [confidence, animated]);

  const sizeStyles = {
    small: { badge: styles.badgeSmall, text: styles.textSmall, icon: 14 },
    medium: { badge: styles.badgeMedium, text: styles.textMedium, icon: 18 },
    large: { badge: styles.badgeLarge, text: styles.textLarge, icon: 22 },
  };

  const currentSize = sizeStyles[size];

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          style={[
            styles.badge,
            currentSize.badge,
            { backgroundColor: config.bgColor, borderColor: config.color },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={config.icon as any}
            size={currentSize.icon}
            color={config.color}
          />
          {showLabel && (
            <Text style={[styles.badgeText, currentSize.text, { color: config.color }]}>
              {config.shortLabel}
            </Text>
          )}
          {confidence > 0.5 && (
            <View style={[styles.confidenceDot, { backgroundColor: config.color }]} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Detail Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={[styles.modalContent, { borderColor: config.color }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { backgroundColor: config.bgColor }]}>
              <View style={[styles.modalIconWrap, { backgroundColor: config.color }]}>
                <Ionicons name={config.icon as any} size={28} color="white" />
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={[styles.modalTitle, { color: config.color }]}>
                  {config.label}
                </Text>
                <Text style={styles.modalSubtitle}>{config.description}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Confidence */}
            <View style={styles.confidenceSection}>
              <Text style={styles.confidenceLabel}>Erkennungs-Sicherheit</Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    { width: `${confidence * 100}%`, backgroundColor: config.color },
                  ]}
                />
              </View>
              <Text style={styles.confidenceValue}>{Math.round(confidence * 100)}%</Text>
            </View>

            {/* Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 So kommunizierst du am besten:</Text>
              <ScrollView style={styles.tipsList}>
                {config.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <View style={[styles.tipDot, { backgroundColor: config.color }]} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Secondary Type */}
            {profile?.secondaryType && profile.secondaryType !== '?' && (
              <View style={styles.secondarySection}>
                <Text style={styles.secondaryLabel}>
                  Sekundärer Typ:{' '}
                  <Text style={{ color: DISC_CONFIG[profile.secondaryType].color, fontWeight: '700' }}>
                    {DISC_CONFIG[profile.secondaryType].label}
                  </Text>
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// =============================================================================
// COMPACT DISC INDICATOR (for chat messages)
// =============================================================================

export function DISCIndicator({ type, size = 16 }: { type: DISCType; size?: number }) {
  const config = DISC_CONFIG[type];
  
  return (
    <View
      style={[
        styles.indicator,
        {
          width: size,
          height: size,
          backgroundColor: config.color,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.indicatorText, { fontSize: size * 0.6 }]}>{type}</Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  badgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  badgeText: {
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 11,
  },
  textMedium: {
    fontSize: 13,
  },
  textLarge: {
    fontSize: 15,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    borderWidth: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },

  // Confidence
  confidenceSection: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  confidenceLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
  },
  confidenceBar: {
    width: 100,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E5E7EB',
    width: 40,
    textAlign: 'right',
  },

  // Tips
  tipsSection: {
    padding: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 12,
  },
  tipsList: {
    maxHeight: 150,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tipText: {
    fontSize: 14,
    color: '#D1D5DB',
    flex: 1,
  },

  // Secondary
  secondarySection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  secondaryLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Indicator
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorText: {
    color: 'white',
    fontWeight: '800',
  },
});

export default DISCBadge;

