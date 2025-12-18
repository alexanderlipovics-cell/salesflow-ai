/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AUTOPILOT DRAFTS SCREEN                                                   ║
 * ║  Entwürfe prüfen und freigeben                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../services/apiConfig';

// API URL für Autopilot Endpoints
const API_BASE_URL = API_CONFIG.baseUrl;

// ═══════════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  background: '#0D0D12',
  card: '#1A1A24',
  cardBorder: '#2A2A3A',
  primary: '#6366F1',
  primaryLight: '#818CF8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AutopilotDraftsScreen({ navigation }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [approving, setApproving] = useState(false);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────────
  
  const loadDrafts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/autopilot/drafts?status=pending`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDrafts(data.drafts || []);
        setPendingCount(data.pending_count || 0);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  }, [session]);
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadDrafts();
      setLoading(false);
    };
    loadData();
  }, [loadDrafts]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDrafts();
    setRefreshing(false);
  };
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  
  const openEditModal = (draft) => {
    setSelectedDraft(draft);
    setEditedContent(draft.content);
    setEditModalVisible(true);
  };
  
  const approveDraft = async (draftId, edited = false) => {
    setApproving(true);
    
    try {
      const body = edited ? { edited_content: editedContent } : {};
      
      const response = await fetch(`${API_BASE_URL}/autopilot/drafts/${draftId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        // Draft aus Liste entfernen
        setDrafts(drafts.filter(d => d.id !== draftId));
        setPendingCount(prev => Math.max(0, prev - 1));
        setEditModalVisible(false);
        setSelectedDraft(null);
      } else {
        Alert.alert('Fehler', 'Entwurf konnte nicht gesendet werden');
      }
    } catch (error) {
      console.error('Error approving draft:', error);
      Alert.alert('Fehler', 'Verbindungsfehler');
    }
    
    setApproving(false);
  };
  
  const rejectDraft = async (draftId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/autopilot/drafts/${draftId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        setDrafts(drafts.filter(d => d.id !== draftId));
        setPendingCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error rejecting draft:', error);
    }
  };
  
  const confirmReject = (draft) => {
    Alert.alert(
      'Entwurf ablehnen?',
      `Der Entwurf für ${draft.lead_name || 'diesen Lead'} wird verworfen.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Ablehnen', style: 'destructive', onPress: () => rejectDraft(draft.id) },
      ]
    );
  };
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  
  const renderDraft = ({ item }) => (
    <View style={styles.draftCard}>
      {/* Header */}
      <View style={styles.draftHeader}>
        <View style={styles.draftMeta}>
          <Text style={styles.draftLeadName}>{item.lead_name || 'Lead'}</Text>
          <Text style={styles.draftIntent}>{formatIntent(item.intent)}</Text>
        </View>
        <Text style={styles.draftTime}>{formatTime(item.created_at)}</Text>
      </View>
      
      {/* Content */}
      <Text style={styles.draftContent} numberOfLines={4}>
        {item.content}
      </Text>
      
      {/* Actions */}
      <View style={styles.draftActions}>
        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() => confirmReject(item)}
        >
          <Ionicons name="close" size={18} color={COLORS.danger} />
          <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>Ablehnen</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={18} color={COLORS.warning} />
          <Text style={[styles.actionButtonText, { color: COLORS.warning }]}>Bearbeiten</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButtonPrimary}
          onPress={() => approveDraft(item.id)}
        >
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={styles.actionButtonTextPrimary}>Senden</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={styles.emptyTitle}>Alles erledigt!</Text>
      <Text style={styles.emptyDescription}>
        Keine Entwürfe warten auf deine Freigabe.
      </Text>
    </View>
  );
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Lade Entwürfe...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📝 Entwürfe</Text>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>
      
      {/* List */}
      <FlatList
        data={drafts}
        renderItem={renderDraft}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmpty}
      />
      
      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Entwurf bearbeiten</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedDraft && (
              <>
                <Text style={styles.modalLeadName}>
                  An: {selectedDraft.lead_name || 'Lead'}
                </Text>
                
                <TextInput
                  style={styles.modalTextInput}
                  value={editedContent}
                  onChangeText={setEditedContent}
                  multiline
                  placeholder="Nachricht eingeben..."
                  placeholderTextColor={COLORS.textMuted}
                />
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.modalButtonTextSecondary}>Abbrechen</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.modalButtonPrimary}
                    onPress={() => approveDraft(selectedDraft.id, true)}
                    disabled={approving}
                  >
                    {approving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#fff" />
                        <Text style={styles.modalButtonTextPrimary}>Senden</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatIntent(intent) {
  const labels = {
    simple_info: 'Info-Anfrage',
    price_inquiry: 'Preisfrage',
    scheduling: 'Terminierung',
    ghost_reengagement: 'Re-Engagement',
    scheduled_followup: 'Follow-up',
  };
  return labels[intent] || intent;
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Gerade eben';
  if (diff < 3600000) return `vor ${Math.floor(diff / 60000)} Min`;
  if (diff < 86400000) return `vor ${Math.floor(diff / 3600000)} Std`;
  return date.toLocaleDateString('de-DE');
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  
  // Draft Card
  draftCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  draftMeta: {
    flex: 1,
  },
  draftLeadName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  draftIntent: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  draftTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  draftContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  draftActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    marginLeft: 'auto',
  },
  actionButtonTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalLeadName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  modalTextInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 15,
    minHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.success,
  },
  modalButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

