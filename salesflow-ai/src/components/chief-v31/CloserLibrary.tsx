/**
 * CloserLibrary Component
 * Killer Phrases zum Kopieren für verschiedene Situationen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import { 
  getCloser, 
  getKillerPhrases,
  getClosingSituations,
  ClosingSituation,
  KillerPhrase,
  CloserResult,
} from '../../services/chiefV31Service';

interface CloserLibraryProps {
  visible: boolean;
  onClose: () => void;
  initialSituation?: ClosingSituation;
  onPhraseSelect?: (phrase: string) => void;
}

const SITUATION_CONFIG: Record<ClosingSituation, { emoji: string; name: string; color: string }> = {
  hesitation: { emoji: '🤔', name: 'Zögern', color: COLORS.warning },
  price: { emoji: '💰', name: 'Zu teuer', color: COLORS.error },
  time: { emoji: '⏰', name: 'Keine Zeit', color: COLORS.info },
  ghost_risk: { emoji: '👻', name: 'Ghost-Gefahr', color: COLORS.textSecondary },
  ready: { emoji: '🔥', name: 'Ready to Close', color: COLORS.success },
};

const CloserLibrary: React.FC<CloserLibraryProps> = ({
  visible,
  onClose,
  initialSituation = 'hesitation',
  onPhraseSelect,
}) => {
  const [selectedSituation, setSelectedSituation] = useState<ClosingSituation>(initialSituation);
  const [phrases, setPhrases] = useState<KillerPhrase[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadPhrases(selectedSituation);
    }
  }, [visible, selectedSituation]);

  const loadPhrases = async (situation: ClosingSituation) => {
    setLoading(true);
    try {
      const result = await getKillerPhrases(situation);
      setPhrases(result.phrases);
    } catch (error) {
      console.error('Failed to load phrases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (phrase: string, index: number) => {
    Clipboard.setString(phrase);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleUse = (phrase: string) => {
    if (onPhraseSelect) {
      onPhraseSelect(phrase);
      onClose();
    }
  };

  const situations = Object.entries(SITUATION_CONFIG) as [ClosingSituation, typeof SITUATION_CONFIG[ClosingSituation]][];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🔥 Closer Library</Text>
            <Text style={styles.headerSubtitle}>Killer Phrases zum Kopieren</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Situation Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {situations.map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.tab,
                selectedSituation === key && styles.tabActive,
                selectedSituation === key && { backgroundColor: config.color + '20' },
              ]}
              onPress={() => setSelectedSituation(key)}
            >
              <Text style={styles.tabEmoji}>{config.emoji}</Text>
              <Text style={[
                styles.tabText,
                selectedSituation === key && { color: config.color },
              ]}>
                {config.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <>
              {/* Situation Header */}
              <View style={styles.situationHeader}>
                <Text style={styles.situationEmoji}>
                  {SITUATION_CONFIG[selectedSituation].emoji}
                </Text>
                <Text style={styles.situationTitle}>
                  Wenn der Kunde {SITUATION_CONFIG[selectedSituation].name.toLowerCase()} sagt/zeigt:
                </Text>
              </View>

              {/* Phrases */}
              {phrases.map((phrase, index) => (
                <View key={index} style={styles.phraseCard}>
                  <View style={styles.phraseHeader}>
                    <Text style={styles.phraseName}>{phrase.name}</Text>
                    {copiedIndex === index && (
                      <Text style={styles.copiedBadge}>✓ Kopiert!</Text>
                    )}
                  </View>
                  
                  <Text style={styles.phraseText}>"{phrase.phrase}"</Text>
                  
                  {phrase.followup && (
                    <View style={styles.followupContainer}>
                      <Text style={styles.followupLabel}>→ Dann:</Text>
                      <Text style={styles.followupText}>"{phrase.followup}"</Text>
                    </View>
                  )}
                  
                  <View style={styles.whyContainer}>
                    <Text style={styles.whyLabel}>💡 Warum das funktioniert:</Text>
                    <Text style={styles.whyText}>{phrase.why}</Text>
                  </View>

                  <View style={styles.phraseActions}>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => handleCopy(phrase.phrase, index)}
                    >
                      <Text style={styles.copyButtonText}>
                        📋 {copiedIndex === index ? 'Kopiert!' : 'Kopieren'}
                      </Text>
                    </TouchableOpacity>
                    {onPhraseSelect && (
                      <TouchableOpacity
                        style={styles.useButton}
                        onPress={() => handleUse(phrase.phrase)}
                      >
                        <Text style={styles.useButtonText}>✨ Verwenden</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              {/* Pro Tip */}
              <View style={styles.proTipCard}>
                <Text style={styles.proTipTitle}>💎 Pro-Tipp</Text>
                <Text style={styles.proTipText}>
                  Die besten Closer nutzen diese Sätze nicht auswendig, sondern passen 
                  sie an den Kontext an. Wichtig ist die STRUKTUR, nicht der exakte Wortlaut.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  tabsContainer: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsContent: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
    gap: SPACING.xs,
    marginRight: SPACING.sm,
  },
  tabActive: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabEmoji: {
    fontSize: 16,
  },
  tabText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  situationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  situationEmoji: {
    fontSize: 24,
  },
  situationTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  phraseCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  phraseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  phraseName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
  },
  copiedBadge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
  },
  phraseText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontStyle: 'italic',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  followupContainer: {
    backgroundColor: COLORS.primaryBg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  followupLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  followupText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  whyContainer: {
    marginBottom: SPACING.md,
  },
  whyLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  whyText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  phraseActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  copyButton: {
    flex: 1,
    backgroundColor: COLORS.borderLight,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  copyButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    fontSize: 14,
  },
  useButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  useButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
    fontSize: 14,
  },
  proTipCard: {
    backgroundColor: COLORS.primaryBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  proTipTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  proTipText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
  },
});

export default CloserLibrary;

