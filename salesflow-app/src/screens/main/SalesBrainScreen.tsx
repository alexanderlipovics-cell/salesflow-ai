/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - SALES BRAIN SCREEN                                              ║
 * ║  Sales-Psychologie Module als Lern-Karten                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { AURA_COLORS, AURA_SHADOWS } from '../../components/aura';

interface Module {
  id: string;
  title: string;
  icon: string;
  description: string;
  color: string;
  category: string;
}

interface ModuleDetail {
  title: string;
  icon: string;
  description: string;
  content: any;
}

const MODULE_CONFIG: Module[] = [
  {
    id: 'psychology',
    title: 'Verkaufspsychologie',
    icon: '🧠',
    description: 'Reziprozität, Verknappung, Autorität, Konsistenz',
    color: AURA_COLORS.neon.purple,
    category: 'psychology',
  },
  {
    id: 'spin',
    title: 'SPIN-Selling',
    icon: '🎯',
    description: 'Situations-, Problem-, Implikations- und Need-Payoff-Fragen',
    color: AURA_COLORS.neon.cyan,
    category: 'spin',
  },
  {
    id: 'objection',
    title: 'Einwand-Loop',
    icon: '🛡️',
    description: '4-Schritt-Methode: Puffern, Isolieren, Reframen, Close',
    color: AURA_COLORS.neon.rose,
    category: 'objection',
  },
  {
    id: 'disg',
    title: 'DISG-Typologie',
    icon: '👥',
    description: 'Kundentypen erkennen und richtig ansprechen',
    color: AURA_COLORS.neon.green,
    category: 'disg',
  },
  {
    id: 'gap',
    title: 'Gap-Selling',
    icon: '🌉',
    description: 'Status Quo → Wunschzustand → Gap → Brücke',
    color: AURA_COLORS.neon.amber,
    category: 'gap',
  },
  {
    id: 'anti-ghosting',
    title: 'Anti-Ghosting',
    icon: '👻',
    description: 'Strategien gegen Ghosting und Funkstille',
    color: AURA_COLORS.neon.blue,
    category: 'anti-ghosting',
  },
];

export default function SalesBrainScreen() {
  const navigation = useNavigation<any>();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [moduleDetail, setModuleDetail] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Lade Modul-Details aus Supabase
  const loadModuleDetail = async (moduleId: string) => {
    setLoading(true);
    try {
      let data: any = null;

      switch (moduleId) {
        case 'psychology': {
          const { data: principles } = await supabase
            .from('sales_psychology_principles')
            .select('*')
            .order('category');
          data = {
            title: 'Verkaufspsychologie',
            icon: '🧠',
            description: 'Die 4 Prinzipien der Verkaufspsychologie',
            principles: principles || [],
          };
          break;
        }
        case 'spin': {
          const { data: questions } = await supabase
            .from('spin_questions')
            .select('*')
            .order('type');
          data = {
            title: 'SPIN-Selling',
            icon: '🎯',
            description: 'Systematische Fragetechnik für erfolgreiche Verkäufe',
            questions: questions || [],
          };
          break;
        }
        case 'objection': {
          const { data: objections } = await supabase
            .from('objection_handling_advanced')
            .select('*');
          data = {
            title: 'Einwand-Loop',
            icon: '🛡️',
            description: '4-Schritt-Methode zur professionellen Einwandbehandlung',
            objections: objections || [],
          };
          break;
        }
        case 'disg': {
          const { data: types } = await supabase
            .from('customer_types_disg')
            .select('*')
            .order('type');
          data = {
            title: 'DISG-Typologie',
            icon: '👥',
            description: 'Kundentypen erkennen und richtig ansprechen',
            types: types || [],
          };
          break;
        }
        case 'gap': {
          const { data: phases } = await supabase
            .from('gap_selling_framework')
            .select('*')
            .order('phase');
          data = {
            title: 'Gap-Selling',
            icon: '🌉',
            description: 'Die Lücke zwischen Status Quo und Wunschzustand finden',
            phases: phases || [],
          };
          break;
        }
        case 'anti-ghosting': {
          const { data: strategies } = await supabase
            .from('anti_ghosting_strategies')
            .select('*');
          data = {
            title: 'Anti-Ghosting',
            icon: '👻',
            description: 'Strategien gegen Ghosting und Funkstille',
            strategies: strategies || [],
          };
          break;
        }
      }

      setModuleDetail(data);
      setSelectedModule(moduleId);
    } catch (error: any) {
      console.error('Error loading module:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedModule) {
      await loadModuleDetail(selectedModule);
    }
    setRefreshing(false);
  };

  return (
    <View style={styles.rootContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧠 Sales Brain</Text>
          <Text style={styles.headerSubtitle}>
            Fortgeschrittene Sales-Psychologie Module
          </Text>
        </View>

        {/* Module Cards Grid */}
        <View style={styles.modulesGrid}>
          {MODULE_CONFIG.map((module) => (
            <Pressable
              key={module.id}
              style={({ pressed }) => [
                styles.moduleCard,
                { borderColor: module.color },
                pressed && styles.moduleCardPressed,
              ]}
              onPress={() => loadModuleDetail(module.id)}
            >
              <View style={[styles.moduleIconContainer, { backgroundColor: `${module.color}20` }]}>
                <Text style={styles.moduleIcon}>{module.icon}</Text>
              </View>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleDescription}>{module.description}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={selectedModule !== null && moduleDetail !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setSelectedModule(null);
          setModuleDetail(null);
        }}
      >
        <View style={styles.modalContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={AURA_COLORS.neon.cyan} />
            </View>
          ) : (
            moduleDetail && (
              <ScrollView style={styles.modalContent}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalIcon}>{moduleDetail.icon}</Text>
                  <Text style={styles.modalTitle}>{moduleDetail.title}</Text>
                  <Text style={styles.modalDescription}>{moduleDetail.description}</Text>
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => {
                      setSelectedModule(null);
                      setModuleDetail(null);
                    }}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </Pressable>
                </View>

                {/* Module Content */}
                <View style={styles.detailContent}>
                  {selectedModule === 'psychology' && moduleDetail.principles && (
                    <View>
                      {moduleDetail.principles.map((principle: any, idx: number) => (
                        <View key={idx} style={styles.principleCard}>
                          <Text style={styles.principleName}>{principle.german_name || principle.name}</Text>
                          <Text style={styles.principleConcept}>{principle.concept}</Text>
                          <Text style={styles.principleInput}>{principle.database_input}</Text>
                          {principle.example_phrase_de && (
                            <View style={styles.exampleBox}>
                              <Text style={styles.exampleLabel}>Beispiel:</Text>
                              <Text style={styles.exampleText}>{principle.example_phrase_de}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedModule === 'spin' && moduleDetail.questions && (
                    <View>
                      {moduleDetail.questions.map((question: any, idx: number) => (
                        <View key={idx} style={styles.questionCard}>
                          <View style={styles.questionHeader}>
                            <Text style={styles.questionType}>{question.type}</Text>
                            <Text style={styles.questionTypeName}>{question.type_name}</Text>
                          </View>
                          <Text style={styles.questionPurpose}>{question.purpose}</Text>
                          {question.questions && (
                            <View style={styles.questionsList}>
                              {(typeof question.questions === 'string'
                                ? JSON.parse(question.questions)
                                : question.questions
                              ).map((q: string, qIdx: number) => (
                                <Text key={qIdx} style={styles.questionItem}>
                                  • {q}
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedModule === 'objection' && moduleDetail.objections && (
                    <View>
                      {moduleDetail.objections.map((objection: any, idx: number) => (
                        <View key={idx} style={styles.objectionCard}>
                          <Text style={styles.objectionText}>"{objection.objection}"</Text>
                          <View style={styles.stepsContainer}>
                            <View style={styles.step}>
                              <Text style={styles.stepNumber}>1</Text>
                              <Text style={styles.stepLabel}>Puffern</Text>
                              <Text style={styles.stepText}>{objection.step_1_buffer}</Text>
                            </View>
                            <View style={styles.step}>
                              <Text style={styles.stepNumber}>2</Text>
                              <Text style={styles.stepLabel}>Isolieren</Text>
                              <Text style={styles.stepText}>{objection.step_2_isolate}</Text>
                            </View>
                            <View style={styles.step}>
                              <Text style={styles.stepNumber}>3</Text>
                              <Text style={styles.stepLabel}>Reframen</Text>
                              <Text style={styles.stepText}>{objection.step_3_reframe}</Text>
                            </View>
                            <View style={styles.step}>
                              <Text style={styles.stepNumber}>4</Text>
                              <Text style={styles.stepLabel}>Close</Text>
                              <Text style={styles.stepText}>{objection.step_4_close}</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedModule === 'disg' && moduleDetail.types && (
                    <View>
                      {moduleDetail.types.map((type: any, idx: number) => (
                        <View key={idx} style={styles.typeCard}>
                          <View style={styles.typeHeader}>
                            <Text style={styles.typeLetter}>{type.type}</Text>
                            <Text style={styles.typeName}>{type.type_name}</Text>
                          </View>
                          <Text style={styles.typeSigns}>{type.recognition_signs}</Text>
                          <View style={styles.instructionBox}>
                            <Text style={styles.instructionLabel}>AI-Anweisung:</Text>
                            <Text style={styles.instructionText}>{type.ai_instruction}</Text>
                          </View>
                          <View style={styles.exampleBox}>
                            <Text style={styles.exampleLabel}>Beispiel:</Text>
                            <Text style={styles.exampleText}>{type.example_script}</Text>
                          </View>
                          <Text style={styles.toneLabel}>Ton: {type.tone}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedModule === 'gap' && moduleDetail.phases && (
                    <View>
                      {moduleDetail.phases.map((phase: any, idx: number) => (
                        <View key={idx} style={styles.phaseCard}>
                          <Text style={styles.phaseName}>{phase.phase_name}</Text>
                          <Text style={styles.phaseDescription}>{phase.description}</Text>
                          {phase.questions && (
                            <View style={styles.questionsList}>
                              {(typeof phase.questions === 'string'
                                ? JSON.parse(phase.questions)
                                : phase.questions
                              ).map((q: string, qIdx: number) => (
                                <Text key={qIdx} style={styles.questionItem}>
                                  • {q}
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedModule === 'anti-ghosting' && moduleDetail.strategies && (
                    <View>
                      {moduleDetail.strategies.map((strategy: any, idx: number) => (
                        <View key={idx} style={styles.strategyCard}>
                          <Text style={styles.strategyReason}>{strategy.reason_de || strategy.reason}</Text>
                          <View style={styles.solutionBox}>
                            <Text style={styles.solutionLabel}>Lösung:</Text>
                            <Text style={styles.solutionText}>{strategy.solution_de || strategy.solution}</Text>
                          </View>
                          <View style={styles.exampleBox}>
                            <Text style={styles.exampleLabel}>Beispiel-Nachricht:</Text>
                            <Text style={styles.exampleText}>{strategy.example_message}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            )
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: AURA_COLORS.text.muted,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  moduleCard: {
    width: '47%',
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    ...AURA_SHADOWS.glass,
  },
  moduleCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  moduleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  moduleIcon: {
    fontSize: 32,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
    position: 'relative',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: AURA_COLORS.text.muted,
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AURA_COLORS.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: AURA_COLORS.text.primary,
  },
  detailContent: {
    padding: 24,
    gap: 20,
  },
  principleCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    marginBottom: 16,
  },
  principleName: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
  },
  principleConcept: {
    fontSize: 16,
    color: AURA_COLORS.text.secondary,
    marginBottom: 12,
  },
  principleInput: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  exampleBox: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AURA_COLORS.text.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  exampleText: {
    fontSize: 14,
    color: AURA_COLORS.text.primary,
    lineHeight: 20,
  },
  questionCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    marginBottom: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  questionType: {
    fontSize: 24,
    fontWeight: '700',
    color: AURA_COLORS.neon.cyan,
  },
  questionTypeName: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  questionPurpose: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginBottom: 12,
  },
  questionsList: {
    gap: 8,
  },
  questionItem: {
    fontSize: 14,
    color: AURA_COLORS.text.primary,
    lineHeight: 20,
  },
  objectionCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    marginBottom: 16,
  },
  objectionText: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.neon.rose,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  stepsContainer: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AURA_COLORS.neon.rose,
    color: AURA_COLORS.bg.primary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  stepLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    lineHeight: 20,
  },
  typeCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    marginBottom: 16,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  typeLetter: {
    fontSize: 32,
    fontWeight: '700',
    color: AURA_COLORS.neon.green,
  },
  typeName: {
    fontSize: 20,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  typeSigns: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginBottom: 12,
  },
  instructionBox: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  instructionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AURA_COLORS.text.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  instructionText: {
    fontSize: 14,
    color: AURA_COLORS.text.primary,
    lineHeight: 20,
  },
  toneLabel: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    fontStyle: 'italic',
    marginTop: 8,
  },
  phaseCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    marginBottom: 16,
  },
  phaseName: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
  },
  phaseDescription: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginBottom: 12,
  },
  strategyCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    marginBottom: 16,
  },
  strategyReason: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 12,
  },
  solutionBox: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  solutionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AURA_COLORS.text.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  solutionText: {
    fontSize: 14,
    color: AURA_COLORS.text.primary,
    lineHeight: 20,
  },
});

