/**
 * PersonalityBadge Component
 * Zeigt DISG-Typ eines Leads mit Tipps
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import { DISGType, PersonalityProfile } from '../../services/chiefV31Service';

interface PersonalityBadgeProps {
  type: DISGType;
  confidence?: number;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  profile?: PersonalityProfile;
}

const DISG_CONFIG: Record<DISGType, {
  emoji: string;
  name: string;
  label: string;
  color: string;
  bgColor: string;
  description: string;
  keywords: string[];
}> = {
  dominant: {
    emoji: '🔴',
    name: 'D-Typ',
    label: 'Dominant',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    description: 'Direkt, ergebnisorientiert, entscheidungsfreudig',
    keywords: ['kurz', 'Fakten', 'Ergebnis'],
  },
  initiativ: {
    emoji: '🟡',
    name: 'I-Typ',
    label: 'Initiativ',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Enthusiastisch, kontaktfreudig, optimistisch',
    keywords: ['persönlich', 'Storytelling', 'Emojis'],
  },
  stetig: {
    emoji: '🟢',
    name: 'S-Typ',
    label: 'Stetig',
    color: '#10B981',
    bgColor: '#D1FAE5',
    description: 'Geduldig, zuverlässig, teamorientiert',
    keywords: ['Sicherheit', 'keine Eile', 'Testimonials'],
  },
  gewissenhaft: {
    emoji: '🔵',
    name: 'G-Typ',
    label: 'Gewissenhaft',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    description: 'Analytisch, detailorientiert, qualitätsbewusst',
    keywords: ['Fakten', 'Zahlen', 'Quellen'],
  },
};

const PersonalityBadge: React.FC<PersonalityBadgeProps> = ({
  type,
  confidence,
  size = 'medium',
  showTooltip = true,
  profile,
}) => {
  const [showModal, setShowModal] = useState(false);
  const config = DISG_CONFIG[type];

  const sizeStyles = {
    small: { badge: styles.badgeSmall, emoji: 12, text: styles.textSmall },
    medium: { badge: styles.badgeMedium, emoji: 16, text: styles.textMedium },
    large: { badge: styles.badgeLarge, emoji: 20, text: styles.textLarge },
  };

  const currentSize = sizeStyles[size];

  return (
    <>
      <TouchableOpacity
        style={[
          styles.badge,
          currentSize.badge,
          { backgroundColor: config.bgColor },
        ]}
        onPress={() => showTooltip && setShowModal(true)}
        activeOpacity={showTooltip ? 0.7 : 1}
      >
        <Text style={{ fontSize: currentSize.emoji }}>{config.emoji}</Text>
        <Text style={[styles.badgeText, currentSize.text, { color: config.color }]}>
          {config.name}
        </Text>
        {confidence !== undefined && size !== 'small' && (
          <Text style={[styles.confidenceText, { color: config.color }]}>
            {Math.round(confidence * 100)}%
          </Text>
        )}
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal
        visible={showModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={[styles.modalHeader, { backgroundColor: config.bgColor }]}>
              <Text style={styles.modalEmoji}>{config.emoji}</Text>
              <View>
                <Text style={[styles.modalTitle, { color: config.color }]}>
                  {config.name} - {config.label}
                </Text>
                <Text style={styles.modalDescription}>{config.description}</Text>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Keywords */}
              <View style={styles.keywordsContainer}>
                {config.keywords.map((kw, i) => (
                  <View key={i} style={[styles.keyword, { backgroundColor: config.bgColor }]}>
                    <Text style={[styles.keywordText, { color: config.color }]}>{kw}</Text>
                  </View>
                ))}
              </View>

              {/* Dos */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>✅ So kommunizieren:</Text>
                {(profile?.dos || getDefaultDos(type)).map((item, i) => (
                  <Text key={i} style={styles.listItem}>• {item}</Text>
                ))}
              </View>

              {/* Don'ts */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>❌ Vermeiden:</Text>
                {(profile?.donts || getDefaultDonts(type)).map((item, i) => (
                  <Text key={i} style={styles.listItem}>• {item}</Text>
                ))}
              </View>

              {/* Quick Tips */}
              <View style={[styles.quickTip, { backgroundColor: config.bgColor }]}>
                <Text style={[styles.quickTipTitle, { color: config.color }]}>
                  💡 Quick-Tipp
                </Text>
                <Text style={styles.quickTipText}>
                  {getQuickTip(type)}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>Verstanden</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

function getDefaultDos(type: DISGType): string[] {
  const defaults: Record<DISGType, string[]> = {
    dominant: ['Kurz und direkt', 'Bullet Points', 'Ergebnisse betonen', 'Zeit respektieren'],
    initiativ: ['Enthusiasmus matchen', 'Persönlich werden', 'Storytelling', 'Emojis okay'],
    stetig: ['Geduldig sein', 'Sicherheit geben', 'Testimonials zeigen', 'Kein Druck'],
    gewissenhaft: ['Fakten liefern', 'Quellen nennen', 'Detailliert erklären', 'Logisch argumentieren'],
  };
  return defaults[type];
}

function getDefaultDonts(type: DISGType): string[] {
  const defaults: Record<DISGType, string[]> = {
    dominant: ['Smalltalk', 'Zu viele Details', 'Emotional argumentieren'],
    initiativ: ['Zu sachlich', 'Zu viele Zahlen', 'Trocken sein'],
    stetig: ['Pushen', 'Urgency-Tricks', 'Ungeduldig werden'],
    gewissenhaft: ['Zu emotional', 'Vage Aussagen', 'Übertreibungen'],
  };
  return defaults[type];
}

function getQuickTip(type: DISGType): string {
  const tips: Record<DISGType, string> = {
    dominant: 'Komm schnell zum Punkt. "Was bringt mir das?" ist die wichtigste Frage für diesen Typ.',
    initiativ: 'Zeige Begeisterung! Dieser Typ kauft das Gefühl, nicht nur das Produkt.',
    stetig: 'Gib ihm Zeit. "Kein Druck" und "Schritt für Schritt" sind deine Zauberworte.',
    gewissenhaft: 'Bereite dich vor! Dieser Typ hat Fragen und will kompetente Antworten.',
  };
  return tips[type];
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  badgeSmall: {
    paddingVertical: 2,
    paddingHorizontal: SPACING.xs,
  },
  badgeMedium: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  badgeLarge: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  badgeText: {
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },
  confidenceText: {
    fontSize: 10,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    width: '100%',
    maxHeight: '80%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  modalEmoji: {
    fontSize: 40,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
  },
  modalDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  keyword: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  keywordText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  listItem: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  quickTip: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  quickTipTitle: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.xs,
  },
  quickTipText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    alignItems: 'center',
  },
  closeButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
});

export default PersonalityBadge;

