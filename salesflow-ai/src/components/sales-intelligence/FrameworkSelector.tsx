/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  FRAMEWORK SELECTION MODAL                                                 ║
 * ║  Sales Framework Auswahl mit Details & Empfehlung                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FrameworkType, FRAMEWORK_LABELS } from '../../types/salesIntelligence';

interface FrameworkSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedFramework?: FrameworkType;
  onSelectFramework: (framework: FrameworkType) => void;
  recommendedFramework?: FrameworkType;
  recommendationReason?: string;
}

interface FrameworkInfo {
  id: FrameworkType;
  name: string;
  emoji: string;
  tagline: string;
  bestFor: string[];
  corePrinciple: string;
  stages: string[];
  keyQuestions: string[];
  color: string;
}

const FRAMEWORKS: FrameworkInfo[] = [
  {
    id: FrameworkType.SPIN,
    name: 'SPIN Selling',
    emoji: '🔄',
    tagline: 'Durch Fragen zum Abschluss führen',
    bestFor: ['B2B', 'Komplexe Produkte', 'Lange Sales Cycles'],
    corePrinciple: 'Den Kunden durch gezielte Fragen selbst zum Problem und zur Lösung führen.',
    stages: ['Situation', 'Problem', 'Implication', 'Need-Payoff'],
    keyQuestions: [
      'Wie läuft das aktuell bei euch?',
      'Welche Herausforderungen seht ihr dabei?',
      'Was bedeutet das für eure Conversion Rate?',
    ],
    color: '#3B82F6',
  },
  {
    id: FrameworkType.CHALLENGER,
    name: 'Challenger Sale',
    emoji: '💡',
    tagline: 'Den Status Quo herausfordern',
    bestFor: ['B2B', 'Transformation', 'Commoditized Markets'],
    corePrinciple: 'Den Kunden mit neuen Einsichten herausfordern und zum Umdenken bewegen.',
    stages: ['Teach', 'Tailor', 'Take Control'],
    keyQuestions: [
      'Was wäre, wenn alles was du über X glaubst, falsch ist?',
      'Wusstest du, dass 67% der Leads durch mangelhaftes Follow-up verloren gehen?',
    ],
    color: '#F59E0B',
  },
  {
    id: FrameworkType.GAP,
    name: 'GAP Selling',
    emoji: '🎯',
    tagline: 'Die Lücke zwischen IST und SOLL',
    bestFor: ['B2B SaaS', 'Tech Sales', 'Problem-Solution Fit'],
    corePrinciple: 'Die Lücke zwischen aktuellem und gewünschtem Zustand klar machen.',
    stages: ['Current State', 'Future State', 'Gap'],
    keyQuestions: [
      'Wo steht ihr heute?',
      'Wo wollt ihr hin?',
      'Was fehlt, um dahin zu kommen?',
    ],
    color: '#10B981',
  },
  {
    id: FrameworkType.SANDLER,
    name: 'Sandler System',
    emoji: '🤝',
    tagline: 'Auf Augenhöhe verhandeln',
    bestFor: ['Hartnäckige Leads', 'Think-It-Over', 'Preis-Einwände'],
    corePrinciple: 'Gleichberechtigte Beziehung statt Verkäufer-Käufer-Dynamik.',
    stages: ['Bonding', 'Up-Front Contract', 'Pain', 'Budget', 'Decision'],
    keyQuestions: [
      'Ist es ok wenn ich ein paar Fragen stelle?',
      'Was habt ihr dagegen unternommen?',
      'Habt ihr Budget dafür eingeplant?',
    ],
    color: '#8B5CF6',
  },
  {
    id: FrameworkType.SNAP,
    name: 'SNAP Selling',
    emoji: '⚡',
    tagline: 'Für Vielbeschäftigte',
    bestFor: ['C-Level', 'Schnelle Entscheidungen', 'Commodities'],
    corePrinciple: 'Einfach, wertvoll, ausgerichtet, dringend – für überlastete Käufer.',
    stages: ['Simple', 'iNvaluable', 'Aligned', 'Priority'],
    keyQuestions: [
      'In 30 Sekunden: Was ist euer größtes Problem?',
      'Was steht ganz oben auf eurer Prioritätenliste?',
    ],
    color: '#EC4899',
  },
  {
    id: FrameworkType.MEDDIC,
    name: 'MEDDIC',
    emoji: '🏢',
    tagline: 'Enterprise Sales Qualifizierung',
    bestFor: ['Enterprise Deals', 'Große Budgets', 'Multiple Stakeholder'],
    corePrinciple: 'Strukturierte Qualifizierung durch systematische Informationssammlung.',
    stages: ['Metrics', 'Economic Buyer', 'Decision Criteria', 'Decision Process', 'Identify Pain', 'Champion'],
    keyQuestions: [
      'Welche KPIs wollt ihr verbessern?',
      'Wer gibt das Budget frei?',
      'Wer kämpft intern für uns?',
    ],
    color: '#14B8A6',
  },
  {
    id: FrameworkType.SOLUTION,
    name: 'Solution Selling',
    emoji: '🧩',
    tagline: 'Problem verstehen, Lösung präsentieren',
    bestFor: ['Custom Solutions', 'Services', 'Consulting'],
    corePrinciple: 'Erst das Problem tiefgehend verstehen, dann die Lösung präsentieren.',
    stages: ['Discover', 'Diagnose', 'Design', 'Deliver'],
    keyQuestions: [
      'Was wäre für euch die ideale Lösung?',
      'Warum ist das Problem entstanden?',
      'Wie sieht Erfolg für euch aus?',
    ],
    color: '#F97316',
  },
];

const FrameworkCard: React.FC<{
  framework: FrameworkInfo;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}> = ({ framework, isSelected, isRecommended, onSelect }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.frameworkCard,
        { borderColor: isSelected ? framework.color : '#374151' },
        isSelected && { backgroundColor: framework.color + '15' },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardEmoji}>{framework.emoji}</Text>
          <View style={styles.cardTitleContainer}>
            <View style={styles.cardTitleWithBadges}>
              <Text style={[styles.cardName, { color: framework.color }]}>
                {framework.name}
              </Text>
              {isRecommended && (
                <View style={[styles.recommendedBadge, { backgroundColor: framework.color }]}>
                  <Ionicons name="star" size={10} color="#FFF" />
                  <Text style={styles.recommendedText}>Empfohlen</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardTagline}>{framework.tagline}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={styles.expandButton}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.bestForContainer}>
        {framework.bestFor.map((item, index) => (
          <View key={index} style={styles.bestForTag}>
            <Text style={styles.bestForText}>{item}</Text>
          </View>
        ))}
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.corePrinciple}>{framework.corePrinciple}</Text>

          <View style={styles.stagesContainer}>
            <Text style={styles.sectionLabel}>Phasen:</Text>
            <View style={styles.stagesRow}>
              {framework.stages.map((stage, index) => (
                <React.Fragment key={index}>
                  <View style={[styles.stageTag, { borderColor: framework.color }]}>
                    <Text style={[styles.stageText, { color: framework.color }]}>
                      {stage}
                    </Text>
                  </View>
                  {index < framework.stages.length - 1 && (
                    <Ionicons name="arrow-forward" size={12} color="#4B5563" />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          <View style={styles.questionsContainer}>
            <Text style={styles.sectionLabel}>Key Questions:</Text>
            {framework.keyQuestions.map((question, index) => (
              <View key={index} style={styles.questionItem}>
                <Text style={styles.questionBullet}>💬</Text>
                <Text style={styles.questionText}>"{question}"</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: framework.color }]}>
          <Ionicons name="checkmark" size={14} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({
  visible,
  onClose,
  selectedFramework,
  onSelectFramework,
  recommendedFramework,
  recommendationReason,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Sales Framework wählen</Text>
              <Text style={styles.modalSubtitle}>
                Wähle die Verkaufsmethodik für diesen Deal
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {recommendedFramework && recommendationReason && (
            <View style={styles.recommendationBanner}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>KI-Empfehlung</Text>
                <Text style={styles.recommendationText}>{recommendationReason}</Text>
              </View>
            </View>
          )}

          <ScrollView
            style={styles.frameworkList}
            showsVerticalScrollIndicator={false}
          >
            {FRAMEWORKS.map((framework) => (
              <FrameworkCard
                key={framework.id}
                framework={framework}
                isSelected={framework.id === selectedFramework}
                isRecommended={framework.id === recommendedFramework}
                onSelect={() => {
                  onSelectFramework(framework.id);
                  onClose();
                }}
              />
            ))}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Compact button to open the selector
export const FrameworkButton: React.FC<{
  selectedFramework?: FrameworkType;
  onPress: () => void;
}> = ({ selectedFramework, onPress }) => {
  const framework = selectedFramework 
    ? FRAMEWORKS.find(f => f.id === selectedFramework)
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.frameworkButton,
        framework && { borderColor: framework.color },
      ]}
      onPress={onPress}
    >
      {framework ? (
        <>
          <Text style={styles.frameworkButtonEmoji}>{framework.emoji}</Text>
          <Text style={[styles.frameworkButtonText, { color: framework.color }]}>
            {framework.name}
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="layers-outline" size={18} color="#6B7280" />
          <Text style={styles.frameworkButtonPlaceholder}>Framework wählen</Text>
        </>
      )}
      <Ionicons name="chevron-down" size={16} color="#6B7280" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },

  // Recommendation banner
  recommendationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#78350F',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FDE68A',
    marginBottom: 2,
  },
  recommendationText: {
    fontSize: 12,
    color: '#FCD34D',
    lineHeight: 18,
  },

  // Framework list
  frameworkList: {
    padding: 16,
    paddingTop: 0,
  },
  bottomSpacer: {
    height: 40,
  },

  // Framework card
  frameworkCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitleWithBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  recommendedText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  cardTagline: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  expandButton: {
    padding: 4,
  },

  // Best for tags
  bestForContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  bestForTag: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bestForText: {
    fontSize: 11,
    color: '#D1D5DB',
  },

  // Expanded content
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  corePrinciple: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: 16,
  },
  stagesContainer: {},
  stagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  stageTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stageText: {
    fontSize: 11,
    fontWeight: '600',
  },
  questionsContainer: {},
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  questionBullet: {
    fontSize: 12,
  },
  questionText: {
    fontSize: 13,
    color: '#D1D5DB',
    flex: 1,
    fontStyle: 'italic',
  },

  // Selected indicator
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Framework button (compact)
  frameworkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 8,
  },
  frameworkButtonEmoji: {
    fontSize: 18,
  },
  frameworkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  frameworkButtonPlaceholder: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
});

export default FrameworkSelector;

