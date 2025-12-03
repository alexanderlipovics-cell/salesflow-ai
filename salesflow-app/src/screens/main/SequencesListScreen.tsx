/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SEQUENCES LIST SCREEN                                                     ║
 * ║  Übersicht aller Outreach Sequences                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { sequenceApi, Sequence } from '../../api/sequencer';

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function SequencesListScreen({ navigation }: any) {
  const { token } = useAuth();
  
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSequenceName, setNewSequenceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  
  // Load sequences
  const loadSequences = useCallback(async (isRefresh = false) => {
    if (!token) return;
    
    try {
      if (!isRefresh) setLoading(true);
      const result = await sequenceApi.list(token, filter || undefined);
      setSequences(result.sequences);
    } catch (error) {
      console.error('Failed to load sequences:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, filter]);
  
  useEffect(() => {
    loadSequences();
  }, [loadSequences]);
  
  // Create sequence
  const handleCreate = async () => {
    if (!token || !newSequenceName.trim()) return;
    
    try {
      setCreating(true);
      const result = await sequenceApi.create(token, {
        name: newSequenceName.trim(),
      });
      
      setShowCreateModal(false);
      setNewSequenceName('');
      
      // Navigate to builder
      navigation.navigate('SequenceBuilder', { sequenceId: result.sequence.id });
    } catch (error) {
      console.error('Failed to create sequence:', error);
      Alert.alert('Fehler', 'Sequenz konnte nicht erstellt werden');
    } finally {
      setCreating(false);
    }
  };
  
  // Delete sequence
  const handleDelete = (sequence: Sequence) => {
    Alert.alert(
      'Sequenz löschen?',
      `"${sequence.name}" wird unwiderruflich gelöscht.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await sequenceApi.delete(token!, sequence.id);
              await loadSequences();
            } catch (error) {
              Alert.alert('Fehler', 'Sequenz konnte nicht gelöscht werden');
            }
          },
        },
      ]
    );
  };
  
  // =============================================================================
  // RENDER
  // =============================================================================
  
  const renderSequence = ({ item }: { item: Sequence }) => {
    const statusColors = {
      draft: '#64748B',
      active: '#22C55E',
      paused: '#F59E0B',
      completed: '#3B82F6',
      archived: '#6B7280',
    };
    
    return (
      <TouchableOpacity
        style={styles.sequenceCard}
        onPress={() => navigation.navigate('SequenceBuilder', { sequenceId: item.id })}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.sequenceHeader}>
          <Text style={styles.sequenceName}>{item.name}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[item.status] || '#64748B' },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.sequenceDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.sequenceStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.stats.enrolled}</Text>
            <Text style={styles.statLabel}>Enrolled</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.stats.active}</Text>
            <Text style={styles.statLabel}>Aktiv</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.stats.replied}</Text>
            <Text style={styles.statLabel}>Replied</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {item.stats.enrolled > 0
                ? Math.round((item.stats.replied / item.stats.enrolled) * 100)
                : 0}%
            </Text>
            <Text style={styles.statLabel}>Reply Rate</Text>
          </View>
        </View>
        
        <View style={styles.sequenceFooter}>
          <Text style={styles.stepsCount}>
            📋 {(item as any).sequence_steps?.count || '?'} Steps
          </Text>
          <Text style={styles.dateText}>
            Erstellt: {new Date(item.created_at).toLocaleDateString('de-DE')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📬 Sequences</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.analyticsButton}
            onPress={() => navigation.navigate('SequenceAnalytics')}
          >
            <Text style={styles.analyticsButtonText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.templatesButton}
            onPress={() => navigation.navigate('SequenceTemplates')}
          >
            <Text style={styles.templatesButtonText}>📋 Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.createButtonText}>+ Neu</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Filters */}
      <View style={styles.filterRow}>
        {['all', 'draft', 'active', 'paused'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              (filter === f || (f === 'all' && !filter)) && styles.filterActive,
            ]}
            onPress={() => setFilter(f === 'all' ? null : f)}
          >
            <Text
              style={[
                styles.filterText,
                (filter === f || (f === 'all' && !filter)) && styles.filterTextActive,
              ]}
            >
              {f === 'all' ? 'Alle' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* List */}
      <FlatList
        data={sequences}
        renderItem={renderSequence}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSequences(true);
            }}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Keine Sequences</Text>
            <Text style={styles.emptySubtitle}>
              Erstelle deine erste Outreach-Sequence
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.emptyButtonText}>Sequence erstellen</Text>
            </TouchableOpacity>
          </View>
        }
      />
      
      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Neue Sequence</Text>
            
            <TextInput
              style={styles.modalInput}
              value={newSequenceName}
              onChangeText={setNewSequenceName}
              placeholder="z.B. Cold Outreach - B2B"
              placeholderTextColor="#64748B"
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCreate,
                  (!newSequenceName.trim() || creating) && styles.modalCreateDisabled,
                ]}
                onPress={handleCreate}
                disabled={!newSequenceName.trim() || creating}
              >
                <Text style={styles.modalCreateText}>
                  {creating ? 'Erstellen...' : 'Erstellen'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  analyticsButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  analyticsButtonText: {
    fontSize: 16,
  },
  templatesButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  templatesButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 13,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  filterActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  filterTextActive: {
    color: 'white',
  },
  
  // List
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  sequenceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sequenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sequenceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sequenceDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 12,
  },
  sequenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
    marginVertical: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sequenceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepsCount: {
    color: '#64748B',
    fontSize: 13,
  },
  dateText: {
    color: '#64748B',
    fontSize: 13,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#94A3B8',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 16,
    color: 'white',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalCreate: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  modalCreateDisabled: {
    opacity: 0.5,
  },
  modalCreateText: {
    color: 'white',
    fontWeight: '600',
  },
});

