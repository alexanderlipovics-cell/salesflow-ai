/**
 * KillerPhraseCard Component
 * Kompakte Anzeige einer einzelnen Killer Phrase
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Clipboard,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import { KillerPhrase } from '../../services/chiefV31Service';

interface KillerPhraseCardProps {
  phrase: KillerPhrase;
  situation?: string;
  onUse?: (phrase: string) => void;
  compact?: boolean;
}

const KillerPhraseCard: React.FC<KillerPhraseCardProps> = ({
  phrase,
  situation,
  onUse,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const handleCopy = () => {
    Clipboard.setString(phrase.phrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUse = () => {
    if (onUse) {
      onUse(phrase.phrase);
    }
  };

  if (compact && !expanded) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={() => setExpanded(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.compactName}>🔥 {phrase.name}</Text>
        <Text style={styles.expandIcon}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{phrase.name}</Text>
        {situation && (
          <View style={styles.situationBadge}>
            <Text style={styles.situationText}>{situation}</Text>
          </View>
        )}
      </View>

      {/* Phrase */}
      <View style={styles.phraseContainer}>
        <Text style={styles.phraseText}>"{phrase.phrase}"</Text>
      </View>

      {/* Follow-up */}
      {phrase.followup && (
        <View style={styles.followupContainer}>
          <Text style={styles.followupLabel}>→ Dann:</Text>
          <Text style={styles.followupText}>"{phrase.followup}"</Text>
        </View>
      )}

      {/* Why */}
      <Text style={styles.whyText}>💡 {phrase.why}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.copyButton]}
          onPress={handleCopy}
        >
          <Text style={styles.copyButtonText}>
            {copied ? '✓ Kopiert!' : '📋 Kopieren'}
          </Text>
        </TouchableOpacity>

        {onUse && (
          <TouchableOpacity
            style={[styles.actionButton, styles.useButton]}
            onPress={handleUse}
          >
            <Text style={styles.useButtonText}>✨ Verwenden</Text>
          </TouchableOpacity>
        )}

        {compact && (
          <TouchableOpacity
            style={styles.collapseButton}
            onPress={() => setExpanded(false)}
          >
            <Text style={styles.collapseText}>▲</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  compactCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  compactName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  name: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
  },
  situationBadge: {
    backgroundColor: COLORS.primaryBg,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  situationText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
  },
  phraseContainer: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  phraseText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  followupContainer: {
    backgroundColor: COLORS.successBg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  followupLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  followupText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  whyText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: COLORS.borderLight,
  },
  copyButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '600',
  },
  useButton: {
    backgroundColor: COLORS.primary,
  },
  useButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '600',
  },
  collapseButton: {
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  collapseText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default KillerPhraseCard;

