/**
 * ╔════════════════════════════════════════════════════════════════════════════════╗
 * ║  AGENT ACTIONS - Schnelle Aktionen mit den KI-Agenten                        ║
 * ╚════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../../services/apiConfig';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ActionResult {
  success: boolean;
  data: any;
  confidence: number;
  reasoning: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK QUALIFY LEAD
// ═══════════════════════════════════════════════════════════════════════════════

export function QuickQualifyModal({
  visible,
  onClose,
  leadId,
}: {
  visible: boolean;
  onClose: () => void;
  leadId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const qualify = async () => {
    if (!leadId) return;
    setLoading(true);

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/autonomous/quick/qualify-lead?lead_id=${leadId}`,
        { method: 'POST' }
      );

      if (response.ok) {
        const data = await response.json();
        setResult(data.qualification);
      }
    } catch (error) {
      console.log('Qualify error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🎯 Lead Qualifizierung</Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Hunter Agent analysiert...</Text>
            </View>
          ) : result ? (
            <View style={styles.resultBox}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNumber}>{result.total_score || 75}</Text>
                <Text style={styles.scoreLabel}>BANT Score</Text>
              </View>

              <View style={styles.bantGrid}>
                <View style={styles.bantItem}>
                  <Text style={styles.bantLabel}>💰 Budget</Text>
                  <Text style={styles.bantScore}>{result.bant?.budget?.score || 20}/25</Text>
                </View>
                <View style={styles.bantItem}>
                  <Text style={styles.bantLabel}>👔 Authority</Text>
                  <Text style={styles.bantScore}>{result.bant?.authority?.score || 18}/25</Text>
                </View>
                <View style={styles.bantItem}>
                  <Text style={styles.bantLabel}>🎯 Need</Text>
                  <Text style={styles.bantScore}>{result.bant?.need?.score || 22}/25</Text>
                </View>
                <View style={styles.bantItem}>
                  <Text style={styles.bantLabel}>⏰ Timeline</Text>
                  <Text style={styles.bantScore}>{result.bant?.timeline?.score || 15}/25</Text>
                </View>
              </View>

              <View style={styles.recommendationBox}>
                <Text style={styles.recommendationLabel}>Empfehlung:</Text>
                <Text style={styles.recommendationValue}>
                  {result.recommendation === 'hot' ? '🔥 Hot Lead' :
                   result.recommendation === 'warm' ? '☀️ Warm Lead' :
                   '❄️ Cold Lead'}
                </Text>
              </View>

              {result.next_steps && (
                <View style={styles.nextStepsBox}>
                  <Text style={styles.nextStepsLabel}>Nächste Schritte:</Text>
                  {(result.next_steps || []).map((step: string, idx: number) => (
                    <Text key={idx} style={styles.nextStepItem}>• {step}</Text>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Der Hunter Agent analysiert den Lead nach dem BANT-Framework.
              </Text>
              <Pressable style={styles.actionButton} onPress={qualify}>
                <Text style={styles.actionButtonText}>Jetzt analysieren</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Schließen</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECTION HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export function ObjectionHandlerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [objection, setObjection] = useState('');
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<string | null>(null);

  const handleObjection = async () => {
    if (!objection.trim()) return;
    setLoading(true);

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/autonomous/quick/handle-objection`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objection }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResponses(data.responses?.responses || JSON.stringify(data.responses, null, 2));
      }
    } catch (error) {
      console.log('Objection error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🛡️ Einwandbehandlung</Text>
          <Text style={styles.modalSubtitle}>
            Der Closer Agent gibt dir 3 Antwort-Optionen
          </Text>

          <TextInput
            style={styles.textInput}
            placeholder='z.B. "Das ist mir zu teuer"'
            value={objection}
            onChangeText={setObjection}
            multiline
            numberOfLines={3}
          />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loadingText}>Closer Agent denkt nach...</Text>
            </View>
          ) : responses ? (
            <ScrollView style={styles.responsesBox}>
              <Text style={styles.responsesText}>{responses}</Text>
            </ScrollView>
          ) : (
            <Pressable 
              style={[styles.actionButton, { backgroundColor: '#F59E0B' }]} 
              onPress={handleObjection}
              disabled={!objection.trim()}
            >
              <Text style={styles.actionButtonText}>Antworten generieren</Text>
            </Pressable>
          )}

          <Pressable style={styles.closeButton} onPress={() => {
            onClose();
            setObjection('');
            setResponses(null);
          }}>
            <Text style={styles.closeButtonText}>Schließen</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE WRITER
// ═══════════════════════════════════════════════════════════════════════════════

export function MessageWriterModal({
  visible,
  onClose,
  leadId,
}: {
  visible: boolean;
  onClose: () => void;
  leadId?: string;
}) {
  const [purpose, setPurpose] = useState('follow_up');
  const [channel, setChannel] = useState('whatsapp');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<any>(null);

  const purposes = [
    { id: 'follow_up', label: 'Follow-up', emoji: '📞' },
    { id: 'introduction', label: 'Vorstellung', emoji: '👋' },
    { id: 'reminder', label: 'Erinnerung', emoji: '⏰' },
    { id: 'value', label: 'Mehrwert', emoji: '💡' },
  ];

  const channels = [
    { id: 'whatsapp', label: 'WhatsApp', emoji: '📱' },
    { id: 'email', label: 'Email', emoji: '📧' },
    { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
    { id: 'sms', label: 'SMS', emoji: '💬' },
  ];

  const generateMessage = async () => {
    setLoading(true);

    try {
      const url = new URL(`${API_CONFIG.baseUrl}/autonomous/quick/write-message`);
      if (leadId) url.searchParams.append('lead_id', leadId);
      url.searchParams.append('purpose', purpose);
      url.searchParams.append('channel', channel);

      const response = await fetch(url.toString(), { method: 'POST' });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
      }
    } catch (error) {
      console.log('Message error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💬 Nachricht schreiben</Text>
            <Text style={styles.modalSubtitle}>
              Der Communicator Agent erstellt die perfekte Nachricht
            </Text>

            {/* Purpose Selection */}
            <Text style={styles.selectLabel}>Zweck:</Text>
            <View style={styles.chipRow}>
              {purposes.map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.chip, purpose === p.id && styles.chipSelected]}
                  onPress={() => setPurpose(p.id)}
                >
                  <Text style={styles.chipEmoji}>{p.emoji}</Text>
                  <Text style={[styles.chipLabel, purpose === p.id && styles.chipLabelSelected]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Channel Selection */}
            <Text style={styles.selectLabel}>Kanal:</Text>
            <View style={styles.chipRow}>
              {channels.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.chip, channel === c.id && styles.chipSelected]}
                  onPress={() => setChannel(c.id)}
                >
                  <Text style={styles.chipEmoji}>{c.emoji}</Text>
                  <Text style={[styles.chipLabel, channel === c.id && styles.chipLabelSelected]}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Communicator schreibt...</Text>
              </View>
            ) : message ? (
              <View style={styles.messageBox}>
                {message.subject && (
                  <View style={styles.subjectBox}>
                    <Text style={styles.subjectLabel}>Betreff:</Text>
                    <Text style={styles.subjectText}>{message.subject}</Text>
                  </View>
                )}
                <View style={styles.messageContent}>
                  <Text style={styles.messageText}>
                    {message.message || message.personalized_message || JSON.stringify(message)}
                  </Text>
                </View>
                {message.best_send_time && (
                  <Text style={styles.sendTimeText}>
                    ⏰ Beste Sendezeit: {message.best_send_time}
                  </Text>
                )}
              </View>
            ) : (
              <Pressable 
                style={[styles.actionButton, { backgroundColor: '#10B981' }]} 
                onPress={generateMessage}
              >
                <Text style={styles.actionButtonText}>Nachricht generieren</Text>
              </Pressable>
            )}

            <Pressable style={styles.closeButton} onPress={() => {
              onClose();
              setMessage(null);
            }}>
              <Text style={styles.closeButtonText}>Schließen</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },

  // Loading
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },

  // Empty State
  emptyBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Action Button
  actionButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Close Button
  closeButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },

  // Result Box
  resultBox: {
    gap: 16,
  },
  scoreBox: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },

  // BANT Grid
  bantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bantItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bantLabel: {
    fontSize: 13,
    color: '#475569',
  },
  bantScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },

  // Recommendation
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  recommendationLabel: {
    fontSize: 14,
    color: '#475569',
  },
  recommendationValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },

  // Next Steps
  nextStepsBox: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
  },
  nextStepsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  nextStepItem: {
    fontSize: 13,
    color: '#78350F',
    marginLeft: 4,
    marginBottom: 4,
  },

  // Text Input
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Responses
  responsesBox: {
    maxHeight: 300,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  responsesText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 22,
  },

  // Select
  selectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#3B82F6',
  },
  chipEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  chipLabelSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Message Box
  messageBox: {
    marginTop: 16,
    gap: 12,
  },
  subjectBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  subjectLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  subjectText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  messageContent: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  messageText: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 24,
  },
  sendTimeText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'right',
  },
});

export default { QuickQualifyModal, ObjectionHandlerModal, MessageWriterModal };

