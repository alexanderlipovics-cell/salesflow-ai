/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SEQUENCE BUILDER SCREEN                                                   ║
 * ║  Drag & Drop Workflow Editor für Outreach Sequences                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { sequenceApi, stepApi, Sequence, SequenceStep } from '../../api/sequencer';

// =============================================================================
// STEP TYPE CONFIG
// =============================================================================

const STEP_TYPES = {
  email: { label: '📧 Email', color: '#3B82F6', icon: '📧' },
  linkedin_connect: { label: '🔗 LinkedIn Connect', color: '#0A66C2', icon: '🔗' },
  linkedin_dm: { label: '💬 LinkedIn DM', color: '#0A66C2', icon: '💬' },
  linkedin_inmail: { label: '📩 LinkedIn InMail', color: '#0A66C2', icon: '📩' },
  whatsapp: { label: '💚 WhatsApp', color: '#25D366', icon: '💚' },
  sms: { label: '📱 SMS', color: '#6B7280', icon: '📱' },
  wait: { label: '⏳ Warten', color: '#F59E0B', icon: '⏳' },
  condition: { label: '🔀 Bedingung', color: '#8B5CF6', icon: '🔀' },
};

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function SequenceBuilderScreen({ route, navigation }: any) {
  const { sequenceId } = route.params || {};
  const { token } = useAuth();
  
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
  
  // Form state for new step
  const [stepForm, setStepForm] = useState({
    step_type: 'email' as SequenceStep['step_type'],
    delay_days: 0,
    delay_hours: 0,
    delay_minutes: 0,
    subject: '',
    content: '',
  });
  
  // Load sequence
  const loadSequence = useCallback(async () => {
    if (!token || !sequenceId) return;
    
    try {
      setLoading(true);
      const result = await sequenceApi.get(token, sequenceId);
      setSequence(result.sequence);
    } catch (error) {
      console.error('Failed to load sequence:', error);
      Alert.alert('Fehler', 'Sequenz konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [token, sequenceId]);
  
  useEffect(() => {
    loadSequence();
  }, [loadSequence]);
  
  // Add step
  const handleAddStep = async () => {
    if (!token || !sequence) return;
    
    try {
      setSaving(true);
      const stepOrder = (sequence.steps?.length || 0) + 1;
      
      await stepApi.add(token, sequence.id, {
        step_type: stepForm.step_type,
        step_order: stepOrder,
        delay_days: stepForm.delay_days,
        delay_hours: stepForm.delay_hours,
        delay_minutes: stepForm.delay_minutes,
        subject: stepForm.subject,
        content: stepForm.content,
      });
      
      setShowStepModal(false);
      setStepForm({
        step_type: 'email',
        delay_days: 0,
        delay_hours: 0,
        delay_minutes: 0,
        subject: '',
        content: '',
      });
      
      await loadSequence();
    } catch (error) {
      console.error('Failed to add step:', error);
      Alert.alert('Fehler', 'Step konnte nicht hinzugefügt werden');
    } finally {
      setSaving(false);
    }
  };
  
  // Delete step
  const handleDeleteStep = async (stepId: string) => {
    if (!token || !sequence) return;
    
    Alert.alert(
      'Step löschen?',
      'Diese Aktion kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await stepApi.delete(token, sequence.id, stepId);
              await loadSequence();
            } catch (error) {
              Alert.alert('Fehler', 'Step konnte nicht gelöscht werden');
            }
          },
        },
      ]
    );
  };
  
  // Toggle sequence active
  const handleToggleActive = async () => {
    if (!token || !sequence) return;
    
    try {
      setSaving(true);
      if (sequence.status === 'active') {
        await sequenceApi.pause(token, sequence.id);
      } else {
        await sequenceApi.activate(token, sequence.id);
      }
      await loadSequence();
    } catch (error) {
      Alert.alert('Fehler', 'Status konnte nicht geändert werden');
    } finally {
      setSaving(false);
    }
  };
  
  // =============================================================================
  // RENDER
  // =============================================================================
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Lade Sequenz...</Text>
      </View>
    );
  }
  
  if (!sequence) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Sequenz nicht gefunden</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{sequence.name}</Text>
          <Text style={styles.subtitle}>
            {sequence.steps?.length || 0} Steps • Status: {sequence.status}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              sequence.status === 'active' ? styles.statusActive : styles.statusInactive,
            ]}
            onPress={handleToggleActive}
            disabled={saving}
          >
            <Text style={styles.statusButtonText}>
              {sequence.status === 'active' ? '⏸️ Pause' : '▶️ Start'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{sequence.stats.enrolled}</Text>
          <Text style={styles.statLabel}>Enrolled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{sequence.stats.active}</Text>
          <Text style={styles.statLabel}>Aktiv</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{sequence.stats.replied}</Text>
          <Text style={styles.statLabel}>Replied</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{sequence.stats.completed}</Text>
          <Text style={styles.statLabel}>Fertig</Text>
        </View>
      </View>
      
      {/* Steps List */}
      <ScrollView style={styles.stepsContainer}>
        <Text style={styles.sectionTitle}>Workflow</Text>
        
        {sequence.steps?.map((step, index) => (
          <View key={step.id}>
            {/* Connector Line */}
            {index > 0 && (
              <View style={styles.connectorContainer}>
                <View style={styles.connectorLine} />
                <View style={styles.delayBadge}>
                  <Text style={styles.delayText}>
                    +{step.delay_days}d {step.delay_hours}h
                  </Text>
                </View>
              </View>
            )}
            
            {/* Step Card */}
            <TouchableOpacity
              style={[
                styles.stepCard,
                { borderLeftColor: STEP_TYPES[step.step_type]?.color || '#6B7280' },
              ]}
              onPress={() => setEditingStep(step)}
              onLongPress={() => handleDeleteStep(step.id)}
            >
              <View style={styles.stepHeader}>
                <Text style={styles.stepIcon}>
                  {STEP_TYPES[step.step_type]?.icon || '📋'}
                </Text>
                <Text style={styles.stepType}>
                  {STEP_TYPES[step.step_type]?.label || step.step_type}
                </Text>
                <Text style={styles.stepOrder}>#{step.step_order}</Text>
              </View>
              
              {step.subject && (
                <Text style={styles.stepSubject}>{step.subject}</Text>
              )}
              
              {step.content && (
                <Text style={styles.stepContent} numberOfLines={2}>
                  {step.content}
                </Text>
              )}
              
              <View style={styles.stepStats}>
                <Text style={styles.stepStatItem}>
                  📤 {step.stats.sent}
                </Text>
                <Text style={styles.stepStatItem}>
                  👁️ {step.stats.opened}
                </Text>
                <Text style={styles.stepStatItem}>
                  🔗 {step.stats.clicked}
                </Text>
                <Text style={styles.stepStatItem}>
                  💬 {step.stats.replied}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
        
        {/* Add Step Button */}
        <TouchableOpacity
          style={styles.addStepButton}
          onPress={() => setShowStepModal(true)}
        >
          <Text style={styles.addStepIcon}>+</Text>
          <Text style={styles.addStepText}>Step hinzufügen</Text>
        </TouchableOpacity>
        
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Add Step Modal */}
      <Modal
        visible={showStepModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStepModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowStepModal(false)}>
              <Text style={styles.modalCancel}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Neuer Step</Text>
            <TouchableOpacity onPress={handleAddStep} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Step Type Selection */}
            <Text style={styles.inputLabel}>Typ</Text>
            <View style={styles.stepTypeGrid}>
              {Object.entries(STEP_TYPES).map(([type, config]) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.stepTypeButton,
                    stepForm.step_type === type && {
                      backgroundColor: config.color,
                      borderColor: config.color,
                    },
                  ]}
                  onPress={() => setStepForm({ ...stepForm, step_type: type as any })}
                >
                  <Text
                    style={[
                      styles.stepTypeButtonText,
                      stepForm.step_type === type && { color: 'white' },
                    ]}
                  >
                    {config.icon} {config.label.split(' ')[1] || config.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Delay */}
            <Text style={styles.inputLabel}>Verzögerung</Text>
            <View style={styles.delayRow}>
              <View style={styles.delayInput}>
                <TextInput
                  style={styles.input}
                  value={String(stepForm.delay_days)}
                  onChangeText={(v) => setStepForm({ ...stepForm, delay_days: parseInt(v) || 0 })}
                  keyboardType="number-pad"
                  placeholder="0"
                />
                <Text style={styles.delayUnit}>Tage</Text>
              </View>
              <View style={styles.delayInput}>
                <TextInput
                  style={styles.input}
                  value={String(stepForm.delay_hours)}
                  onChangeText={(v) => setStepForm({ ...stepForm, delay_hours: parseInt(v) || 0 })}
                  keyboardType="number-pad"
                  placeholder="0"
                />
                <Text style={styles.delayUnit}>Stunden</Text>
              </View>
            </View>
            
            {/* Subject (for email) */}
            {['email', 'linkedin_inmail'].includes(stepForm.step_type) && (
              <>
                <Text style={styles.inputLabel}>Betreff</Text>
                <TextInput
                  style={styles.input}
                  value={stepForm.subject}
                  onChangeText={(v) => setStepForm({ ...stepForm, subject: v })}
                  placeholder="z.B. Kurze Frage zu {{company}}"
                />
              </>
            )}
            
            {/* Content */}
            {!['wait', 'condition'].includes(stepForm.step_type) && (
              <>
                <Text style={styles.inputLabel}>Nachricht</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={stepForm.content}
                  onChangeText={(v) => setStepForm({ ...stepForm, content: v })}
                  placeholder="Hallo {{contact_name}},\n\n..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.hint}>
                  Variablen: {'{{contact_name}}'}, {'{{company}}'}, etc.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#22C55E',
  },
  statusInactive: {
    backgroundColor: '#3B82F6',
  },
  statusButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  
  // Steps
  stepsContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  connectorContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  connectorLine: {
    width: 2,
    height: 30,
    backgroundColor: '#3B82F6',
  },
  delayBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: -8,
  },
  delayText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  stepCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  stepType: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  stepOrder: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stepSubject: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '500',
    marginBottom: 4,
  },
  stepContent: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  stepStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  stepStatItem: {
    fontSize: 12,
    color: '#94A3B8',
  },
  
  // Add Step
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  addStepIcon: {
    fontSize: 24,
    color: '#3B82F6',
    marginRight: 8,
  },
  addStepText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalCancel: {
    color: '#94A3B8',
    fontSize: 16,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSave: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  
  // Form
  inputLabel: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    minHeight: 120,
  },
  hint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
  stepTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  stepTypeButtonText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  delayRow: {
    flexDirection: 'row',
    gap: 12,
  },
  delayInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  delayUnit: {
    color: '#94A3B8',
    fontSize: 14,
  },
});

