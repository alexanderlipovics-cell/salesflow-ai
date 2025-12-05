/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  REVIEW QUEUE SCREEN                                                       ║
 * ║  Human-in-the-Loop für Reactivation Drafts                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  reactivationApi,
  type ReactivationDraft,
  type ReviewDraftRequest,
} from '../../api/reactivation';
import { AURA_COLORS } from '../../components/aura';

export default function ReviewQueueScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drafts, setDrafts] = useState<ReactivationDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<ReactivationDraft | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, edit_rate: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingDrafts, queueStats] = await Promise.all([
        reactivationApi.getDrafts('pending', 50),
        reactivationApi.getQueueStats(),
      ]);
      setDrafts(pendingDrafts);
      setStats(queueStats);
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Fehler beim Laden der Drafts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openDraft = async (draftId: string) => {
    try {
      const draft = await reactivationApi.getDraftDetails(draftId);
      setSelectedDraft(draft);
      setEditedMessage(draft.draft_message);
      setEditMode(false);
      setNotes('');
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Fehler beim Laden des Drafts');
    }
  };

  const handleReview = async (action: 'approved' | 'rejected' | 'edited') => {
    if (!selectedDraft) return;

    const request: ReviewDraftRequest = {
      action,
      edited_message: editMode && editedMessage ? editedMessage : undefined,
      notes: notes || undefined,
      send_now: action === 'approved',
    };

    try {
      setProcessing(selectedDraft.id);
      await reactivationApi.reviewDraft(selectedDraft.id, request);
      Alert.alert('Erfolg', `Draft ${action === 'approved' ? 'genehmigt' : action === 'rejected' ? 'abgelehnt' : 'bearbeitet'}`);
      setSelectedDraft(null);
      await loadData();
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Fehler beim Reviewen');
    } finally {
      setProcessing(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={AURA_COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: AURA_COLORS.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ padding: 16 }}>
          {/* Header */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: AURA_COLORS.text.primary }}>
              📋 Review Queue
            </Text>
            <Text style={{ fontSize: 16, color: AURA_COLORS.text.secondary, marginTop: 4 }}>
              {stats.pending} Drafts warten auf Review
            </Text>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: AURA_COLORS.warning + '20',
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: AURA_COLORS.warning,
              }}
            >
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: AURA_COLORS.warning }}>
                {stats.pending}
              </Text>
              <Text style={{ fontSize: 14, color: AURA_COLORS.text.secondary }}>Pending</Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: AURA_COLORS.success + '20',
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: AURA_COLORS.success,
              }}
            >
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: AURA_COLORS.success }}>
                {stats.approved}
              </Text>
              <Text style={{ fontSize: 14, color: AURA_COLORS.text.secondary }}>Genehmigt</Text>
            </View>
          </View>

          {/* Drafts List */}
          {drafts.length === 0 ? (
            <View
              style={{
                backgroundColor: AURA_COLORS.surface,
                padding: 48,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: AURA_COLORS.text.primary,
                  marginBottom: 8,
                }}
              >
                Keine Drafts mehr!
              </Text>
              <Text style={{ fontSize: 14, color: AURA_COLORS.text.secondary, textAlign: 'center' }}>
                Alle Drafts wurden bearbeitet. Neue Drafts erscheinen hier, sobald der Reactivation
                Agent läuft.
              </Text>
            </View>
          ) : (
            drafts.map((draft) => (
              <TouchableOpacity
                key={draft.id}
                style={{
                  backgroundColor: AURA_COLORS.surface,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                }}
                onPress={() => openDraft(draft.id)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: AURA_COLORS.text.primary }}>
                    {draft.lead_context.name}
                  </Text>
                  <View
                    style={{
                      backgroundColor: AURA_COLORS.primary + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: AURA_COLORS.primary, fontWeight: 'bold' }}>
                      {draft.suggested_channel.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {draft.lead_context.company && (
                  <Text style={{ fontSize: 14, color: AURA_COLORS.text.secondary, marginBottom: 8 }}>
                    {draft.lead_context.company}
                  </Text>
                )}
                <Text
                  style={{
                    fontSize: 14,
                    color: AURA_COLORS.text.secondary,
                    marginBottom: 8,
                  }}
                  numberOfLines={2}
                >
                  {draft.draft_message}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  {draft.signals.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {draft.signals.slice(0, 3).map((signal, idx) => (
                        <View
                          key={idx}
                          style={{
                            backgroundColor: AURA_COLORS.primary + '20',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ fontSize: 10, color: AURA_COLORS.primary }}>
                            {signal.type}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={{ fontSize: 12, color: AURA_COLORS.text.secondary }}>
                    {Math.round(draft.confidence_score * 100)}% Confidence
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Draft Detail Modal */}
      <Modal
        visible={selectedDraft !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedDraft(null)}
      >
        {selectedDraft && (
          <View style={{ flex: 1, backgroundColor: AURA_COLORS.background }}>
            <ScrollView style={{ flex: 1 }}>
              <View style={{ padding: 16 }}>
                {/* Header */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>
                    {selectedDraft.lead_context.name}
                  </Text>
                  {selectedDraft.lead_context.company && (
                    <Text style={{ fontSize: 16, color: AURA_COLORS.text.secondary }}>
                      {selectedDraft.lead_context.company}
                    </Text>
                  )}
                  <Text style={{ fontSize: 14, color: AURA_COLORS.text.secondary, marginTop: 4 }}>
                    {selectedDraft.lead_context.days_dormant} Tage kein Kontakt
                  </Text>
                </View>

                {/* Signals */}
                {selectedDraft.signals.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                      Reaktivierungssignale
                    </Text>
                    {selectedDraft.signals.map((signal, idx) => (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: AURA_COLORS.surface,
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
                          {signal.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: AURA_COLORS.text.secondary }}>
                          {signal.summary}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: AURA_COLORS.primary,
                            marginTop: 4,
                          }}
                        >
                          Relevanz: {Math.round(signal.relevance_score * 100)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Message */}
                <View style={{ marginBottom: 24 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                      {editMode ? 'Nachricht bearbeiten' : 'Generierte Nachricht'}
                    </Text>
                    <TouchableOpacity onPress={() => setEditMode(!editMode)}>
                      <Text style={{ color: AURA_COLORS.primary, fontWeight: 'bold' }}>
                        {editMode ? 'Abbrechen' : 'Bearbeiten'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {editMode ? (
                    <TextInput
                      style={{
                        backgroundColor: AURA_COLORS.surface,
                        padding: 12,
                        borderRadius: 8,
                        minHeight: 200,
                        textAlignVertical: 'top',
                        color: AURA_COLORS.text.primary,
                      }}
                      multiline
                      value={editedMessage}
                      onChangeText={setEditedMessage}
                      placeholder="Nachricht bearbeiten..."
                    />
                  ) : (
                    <View
                      style={{
                        backgroundColor: AURA_COLORS.surface,
                        padding: 16,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: AURA_COLORS.text.primary, lineHeight: 20 }}>
                        {selectedDraft.draft_message}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Notes */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                    Notizen (optional)
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: AURA_COLORS.surface,
                      padding: 12,
                      borderRadius: 8,
                      minHeight: 100,
                      textAlignVertical: 'top',
                      color: AURA_COLORS.text.primary,
                    }}
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notizen für Feedback-Learning..."
                  />
                </View>

                {/* Actions */}
                <View style={{ gap: 12, marginBottom: 24 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: AURA_COLORS.success,
                      padding: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                    onPress={() => handleReview('approved')}
                    disabled={processing === selectedDraft.id}
                  >
                    {processing === selectedDraft.id ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                        ✅ Genehmigen & Senden
                      </Text>
                    )}
                  </TouchableOpacity>

                  {editMode && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: AURA_COLORS.primary,
                        padding: 16,
                        borderRadius: 12,
                        alignItems: 'center',
                      }}
                      onPress={() => handleReview('edited')}
                      disabled={processing === selectedDraft.id}
                    >
                      {processing === selectedDraft.id ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                          ✏️ Speichern & Genehmigen
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={{
                      backgroundColor: AURA_COLORS.error,
                      padding: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                    onPress={() => handleReview('rejected')}
                    disabled={processing === selectedDraft.id}
                  >
                    {processing === selectedDraft.id ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                        ❌ Ablehnen
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

