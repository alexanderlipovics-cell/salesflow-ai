/**
 * ChatV31Integration Component
 * Integration aller v3.1 Features in den Chat
 * 
 * Fügt hinzu:
 * - Quick Actions für Signal Detector, Closer Library
 * - DISG Badge für aktuellen Lead
 * - Automatische Einwand-Erkennung
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import ObjectionAnalyzer from './ObjectionAnalyzer';
import CloserLibrary from './CloserLibrary';
import PersonalityBadge from './PersonalityBadge';
import { 
  useObjectionAnalyzer, 
  useCloserLibrary, 
  usePersonalityMatching 
} from '../../hooks/useChiefV31';
import { ClosingSituation, DISGType } from '../../services/chiefV31Service';

interface ChatV31IntegrationProps {
  leadId?: string;
  leadName?: string;
  leadMessages?: string[];
  onPhraseInsert?: (phrase: string) => void;
  onResponseSelect?: (response: string) => void;
  compact?: boolean;
}

const QUICK_ACTIONS = [
  { id: 'objection', emoji: '🎯', label: 'Einwand analysieren' },
  { id: 'closer', emoji: '🔥', label: 'Killer Phrase' },
  { id: 'personality', emoji: '🎭', label: 'DISG Check' },
];

const CLOSING_SITUATIONS: { id: ClosingSituation; emoji: string; label: string }[] = [
  { id: 'hesitation', emoji: '🤔', label: 'Zögert' },
  { id: 'price', emoji: '💰', label: 'Zu teuer' },
  { id: 'time', emoji: '⏰', label: 'Keine Zeit' },
  { id: 'ghost_risk', emoji: '👻', label: 'Ghost-Gefahr' },
  { id: 'ready', emoji: '🔥', label: 'Ready to Close' },
];

const ChatV31Integration: React.FC<ChatV31IntegrationProps> = ({
  leadId,
  leadName,
  leadMessages = [],
  onPhraseInsert,
  onResponseSelect,
  compact = true,
}) => {
  const [showObjectionAnalyzer, setShowObjectionAnalyzer] = useState(false);
  const [showCloserLibrary, setShowCloserLibrary] = useState(false);
  const [showSituationPicker, setShowSituationPicker] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState<ClosingSituation>('hesitation');
  
  const { analyze, analysis } = useObjectionAnalyzer();
  const { quickDetect } = usePersonalityMatching();

  // Quick DISG detection from lead messages
  const disgProfile = leadMessages.length > 0 ? quickDetect(leadMessages) : null;

  const handleQuickAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'objection':
        setShowObjectionAnalyzer(true);
        break;
      case 'closer':
        setShowSituationPicker(true);
        break;
      case 'personality':
        // Could open a personality detail modal
        if (disgProfile) {
          // Show personality info
        }
        break;
    }
  }, [disgProfile]);

  const handleSituationSelect = (situation: ClosingSituation) => {
    setSelectedSituation(situation);
    setShowSituationPicker(false);
    setShowCloserLibrary(true);
  };

  if (compact) {
    return (
      <>
        {/* Compact Quick Actions Bar */}
        <View style={styles.compactBar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.compactContent}
          >
            {/* DISG Badge if available */}
            {disgProfile && (
              <PersonalityBadge
                type={disgProfile.type}
                confidence={disgProfile.confidence}
                size="small"
              />
            )}
            
            {/* Quick Actions */}
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.compactAction}
                onPress={() => handleQuickAction(action.id)}
              >
                <Text style={styles.compactEmoji}>{action.emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Modals */}
        <ObjectionAnalyzer
          visible={showObjectionAnalyzer}
          onClose={() => setShowObjectionAnalyzer(false)}
          leadId={leadId}
          onResponseSelect={onResponseSelect}
        />

        <CloserLibrary
          visible={showCloserLibrary}
          onClose={() => setShowCloserLibrary(false)}
          initialSituation={selectedSituation}
          onPhraseSelect={onPhraseInsert}
        />

        {/* Situation Picker Modal */}
        <Modal
          visible={showSituationPicker}
          animationType="fade"
          transparent
          onRequestClose={() => setShowSituationPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setShowSituationPicker(false)}
          >
            <View style={styles.pickerContent}>
              <Text style={styles.pickerTitle}>🔥 Welche Situation?</Text>
              {CLOSING_SITUATIONS.map((sit) => (
                <TouchableOpacity
                  key={sit.id}
                  style={styles.situationItem}
                  onPress={() => handleSituationSelect(sit.id)}
                >
                  <Text style={styles.situationEmoji}>{sit.emoji}</Text>
                  <Text style={styles.situationLabel}>{sit.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  // Full mode (not compact)
  return (
    <View style={styles.container}>
      {/* DISG Profile Card */}
      {disgProfile && (
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Lead-Profil</Text>
          <View style={styles.profileCard}>
            <PersonalityBadge
              type={disgProfile.type}
              confidence={disgProfile.confidence}
              size="large"
            />
            <Text style={styles.profileHint}>
              Kommunikation anpassen für bessere Ergebnisse
            </Text>
          </View>
        </View>
      )}

      {/* Quick Actions Grid */}
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={() => handleQuickAction(action.id)}
          >
            <Text style={styles.actionEmoji}>{action.emoji}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Modals */}
      <ObjectionAnalyzer
        visible={showObjectionAnalyzer}
        onClose={() => setShowObjectionAnalyzer(false)}
        leadId={leadId}
        onResponseSelect={onResponseSelect}
      />

      <CloserLibrary
        visible={showCloserLibrary}
        onClose={() => setShowCloserLibrary(false)}
        initialSituation={selectedSituation}
        onPhraseSelect={onPhraseInsert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  // Compact styles
  compactBar: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.xs,
  },
  compactContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  compactAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactEmoji: {
    fontSize: 18,
  },
  // Full mode styles
  profileSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  profileHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  actionLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    textAlign: 'center',
  },
  // Picker styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  pickerContent: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 300,
    ...SHADOWS.lg,
  },
  pickerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  situationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  situationEmoji: {
    fontSize: 24,
  },
  situationLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
});

export default ChatV31Integration;

