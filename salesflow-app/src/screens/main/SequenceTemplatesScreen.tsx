/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SEQUENCE TEMPLATES SCREEN                                                ║
 * ║  Vorgefertigte Workflows durchsuchen und anwenden                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================================================
// TYPES
// ============================================================================

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  estimated_duration_days: number;
  step_count: number;
}

interface TemplateStep {
  step_order: number;
  step_type: string;
  delay_days: number;
  delay_hours: number;
  config: Record<string, any>;
}

interface TemplateDetail extends TemplateSummary {
  steps: TemplateStep[];
}

interface Category {
  id: string;
  name: string;
  count: number;
}

// ============================================================================
// API
// ============================================================================

const API_BASE = 'http://localhost:8000/api/v1';

async function fetchTemplates(token: string, category?: string): Promise<TemplateSummary[]> {
  const url = category
    ? `${API_BASE}/sequence-templates?category=${category}`
    : `${API_BASE}/sequence-templates`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

async function fetchCategories(token: string): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/sequence-templates/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

async function fetchTemplateDetail(token: string, id: string): Promise<TemplateDetail> {
  const res = await fetch(`${API_BASE}/sequence-templates/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch template');
  return res.json();
}

async function applyTemplate(token: string, id: string, name?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/sequence-templates/${id}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to apply template');
  return res.json();
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEP_TYPE_ICONS: Record<string, string> = {
  email: '📧',
  linkedin_connect: '🔗',
  linkedin_message: '💬',
  call: '📞',
  task: '✅',
  wait: '⏰',
};

const STEP_TYPE_LABELS: Record<string, string> = {
  email: 'Email',
  linkedin_connect: 'LinkedIn Connect',
  linkedin_message: 'LinkedIn DM',
  call: 'Anruf',
  task: 'Aufgabe',
  wait: 'Warten',
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function SequenceTemplatesScreen({ navigation }: any) {
  const { session } = useAuth();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail Modal
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Apply Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [applying, setApplying] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const [templateData, categoryData] = await Promise.all([
        fetchTemplates(session.access_token, selectedCategory || undefined),
        fetchCategories(session.access_token),
      ]);
      setTemplates(templateData);
      setCategories(categoryData);
    } catch (e) {
      console.error('Error loading templates:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setLoading(true);
  };

  const handleTemplatePress = async (template: TemplateSummary) => {
    if (!session?.access_token) return;
    setLoadingDetail(true);
    setShowDetailModal(true);

    try {
      const detail = await fetchTemplateDetail(session.access_token, template.id);
      setSelectedTemplate(detail);
    } catch (e) {
      Alert.alert('Fehler', 'Template konnte nicht geladen werden');
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApplyPress = () => {
    if (!selectedTemplate) return;
    setCustomName(selectedTemplate.name);
    setShowApplyModal(true);
  };

  const handleApplyConfirm = async () => {
    if (!session?.access_token || !selectedTemplate) return;
    setApplying(true);

    try {
      const result = await applyTemplate(
        session.access_token,
        selectedTemplate.id,
        customName || undefined
      );
      
      Alert.alert(
        '✅ Erfolg!',
        'Sequence wurde erstellt. Möchtest du sie jetzt bearbeiten?',
        [
          { text: 'Später', style: 'cancel' },
          {
            text: 'Bearbeiten',
            onPress: () => {
              setShowApplyModal(false);
              setShowDetailModal(false);
              navigation.navigate('SequenceBuilder', { sequenceId: result.sequence.id });
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Fehler', 'Template konnte nicht angewendet werden');
    } finally {
      setApplying(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && templates.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Lade Templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📋 Sequence Templates</Text>
          <Text style={styles.headerSubtitle}>
            {templates.length} Workflow{templates.length !== 1 ? 's' : ''} verfügbar
          </Text>
        </View>
      </LinearGradient>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => handleCategorySelect(null)}
        >
          <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
            Alle
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
            onPress={() => handleCategorySelect(cat.id)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat.id && styles.categoryChipTextActive,
              ]}
            >
              {cat.name} ({cat.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Templates Grid */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#667eea" />
        }
      >
        {templates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.templateCard}
            onPress={() => handleTemplatePress(template)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.templateName}>{template.name}</Text>
              <View style={styles.stepCountBadge}>
                <Text style={styles.stepCountText}>{template.step_count} Steps</Text>
              </View>
            </View>
            
            <Text style={styles.templateDescription} numberOfLines={2}>
              {template.description}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={14} color="#667eea" />
                <Text style={styles.durationText}>~{template.estimated_duration_days} Tage</Text>
              </View>
              <View style={styles.tagsRow}>
                {template.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {loadingDetail ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#667eea" />
              </View>
            ) : selectedTemplate ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedTemplate.name}</Text>
                    <Text style={styles.modalSubtitle}>{selectedTemplate.description}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetailModal(false);
                      setSelectedTemplate(null);
                    }}
                  >
                    <Ionicons name="close" size={28} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.sectionTitle}>📬 Steps ({selectedTemplate.step_count})</Text>

                  {selectedTemplate.steps.map((step, index) => (
                    <View key={index} style={styles.stepCard}>
                      <View style={styles.stepHeader}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>{step.step_order}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stepType}>
                            {STEP_TYPE_ICONS[step.step_type] || '📋'}{' '}
                            {STEP_TYPE_LABELS[step.step_type] || step.step_type}
                          </Text>
                          <Text style={styles.stepDelay}>
                            {step.delay_days > 0 ? `+${step.delay_days} Tag${step.delay_days > 1 ? 'e' : ''}` : ''}
                            {step.delay_hours > 0 ? ` ${step.delay_hours}h` : ''}
                            {step.delay_days === 0 && step.delay_hours === 0 ? 'Sofort' : ''}
                          </Text>
                        </View>
                      </View>

                      {/* Email Preview */}
                      {step.step_type === 'email' && step.config.subject && (
                        <View style={styles.emailPreview}>
                          <Text style={styles.emailSubject}>📧 {step.config.subject}</Text>
                          <Text style={styles.emailBody} numberOfLines={3}>
                            {step.config.body}
                          </Text>
                        </View>
                      )}

                      {/* LinkedIn Preview */}
                      {(step.step_type === 'linkedin_connect' || step.step_type === 'linkedin_message') &&
                        step.config.message && (
                          <View style={styles.linkedinPreview}>
                            <Text style={styles.linkedinMessage} numberOfLines={2}>
                              {step.config.message}
                            </Text>
                          </View>
                        )}
                    </View>
                  ))}

                  <View style={{ height: 20 }} />
                </ScrollView>

                {/* Apply Button */}
                <TouchableOpacity style={styles.applyButton} onPress={handleApplyPress}>
                  <Ionicons name="rocket" size={20} color="#fff" />
                  <Text style={styles.applyButtonText}>Template verwenden</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Apply Modal */}
      <Modal visible={showApplyModal} animationType="fade" transparent>
        <View style={styles.applyModalOverlay}>
          <View style={styles.applyModalContent}>
            <Text style={styles.applyModalTitle}>🚀 Sequence erstellen</Text>
            <Text style={styles.applyModalSubtitle}>
              Das Template wird als neue Sequence gespeichert
            </Text>

            <Text style={styles.inputLabel}>Name der Sequence</Text>
            <TextInput
              style={styles.input}
              value={customName}
              onChangeText={setCustomName}
              placeholder="z.B. Meine Cold Outreach Sequence"
            />

            <View style={styles.applyModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowApplyModal(false)}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, applying && styles.confirmButtonDisabled]}
                onPress={handleApplyConfirm}
                disabled={applying}
              >
                {applying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Erstellen</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#667eea',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 12,
  },
  stepCountBadge: {
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepCountText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    color: '#667eea',
    marginLeft: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: 300,
  },
  modalLoading: {
    padding: 60,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalScroll: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  stepCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  stepType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  stepDelay: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  emailPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  emailSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  emailBody: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  linkedinPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  linkedinMessage: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  applyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  applyModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  applyModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  applyModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  applyModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

