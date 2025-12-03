/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - PROPOSAL REMINDERS SCREEN                                 ║
 * ║  Übersicht aller Kontakte mit gesendetem Angebot                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useProposalReminders } from '../../hooks/useProposalReminders';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  overdue: { 
    label: '🚨 Überfällig', 
    color: '#EF4444', 
    bgColor: '#FEE2E2',
    borderColor: '#FECACA'
  },
  due_soon: { 
    label: '⚠️ Bald fällig', 
    color: '#F59E0B', 
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A'
  },
  scheduled: { 
    label: '📅 Geplant', 
    color: '#3B82F6', 
    bgColor: '#DBEAFE',
    borderColor: '#BFDBFE'
  }
};

const PRIORITY_COLORS = {
  urgent: '#EF4444',
  high: '#F59E0B',
  normal: '#8B5CF6'
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const StatCard = ({ icon, value, label, color }) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ContactCard = ({ 
  contact, 
  onCreateReminder, 
  onMarkComplete, 
  onPress,
  formatDays,
  getPriority 
}) => {
  const status = STATUS_CONFIG[contact.reminder_status] || STATUS_CONFIG.scheduled;
  const priority = getPriority(contact.suggested_priority);
  const hasReminder = contact.open_reminder_count > 0;

  return (
    <Pressable 
      style={[
        styles.contactCard,
        { borderLeftColor: status.color }
      ]}
      onPress={() => onPress(contact)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.contactName}>{contact.name || 'Unbekannt'}</Text>
          {contact.company && (
            <Text style={styles.contactCompany}>{contact.company}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📧</Text>
          <Text style={styles.detailText}>{contact.email || '-'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📞</Text>
          <Text style={styles.detailText}>{contact.phone || '-'}</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>📅 Angebot gesendet:</Text>
          <Text style={[styles.metaValue, contact.days_since_proposal > 5 && styles.metaWarning]}>
            {formatDays(contact.days_since_proposal)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>⚡ Priorität:</Text>
          <Text style={[styles.metaValue, { color: priority.color }]}>
            {contact.suggested_priority}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        {hasReminder ? (
          <View style={styles.reminderActive}>
            <Text style={styles.reminderActiveIcon}>✅</Text>
            <Text style={styles.reminderActiveText}>
              Reminder aktiv ({contact.open_reminder_count})
            </Text>
          </View>
        ) : (
          <Pressable 
            style={styles.createReminderBtn}
            onPress={() => onCreateReminder(contact)}
          >
            <Text style={styles.createReminderText}>🔔 Reminder erstellen</Text>
          </Pressable>
        )}
        
        <Pressable 
          style={styles.actionBtn}
          onPress={() => onMarkComplete(contact)}
        >
          <Text style={styles.actionBtnText}>📞 Jetzt anrufen</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

const SectionHeader = ({ title, count, color, icon }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionIcon}>{icon}</Text>
    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
    <View style={[styles.countBadge, { backgroundColor: color }]}>
      <Text style={styles.countText}>{count}</Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function ProposalRemindersScreen({ navigation }) {
  const { user } = useAuth();
  const workspaceId = user?.user_metadata?.workspace_id || user?.id;

  const {
    contacts,
    stats,
    contactsByStatus,
    prioritizedContacts,
    summary,
    isLoading,
    isProcessing,
    error,
    refresh,
    processReminders,
    createReminder,
    formatDaysSinceProposal,
    getPriorityCategory,
    PRIORITY_CONFIG
  } = useProposalReminders(workspaceId);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleProcessAll = useCallback(async () => {
    Alert.alert(
      '🔔 Reminders erstellen',
      `Für ${summary.needingAction} Kontakte automatisch Reminder-Tasks erstellen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Erstellen', 
          onPress: async () => {
            const result = await processReminders(true);
            if (result?.success) {
              Alert.alert(
                '✅ Erfolg',
                `${result.tasks_created} Reminder-Tasks wurden erstellt.`
              );
            }
          }
        }
      ]
    );
  }, [summary.needingAction, processReminders]);

  const handleCreateReminder = useCallback(async (contact) => {
    Alert.alert(
      '🔔 Reminder erstellen',
      `Reminder für "${contact.name}" erstellen?\n\nPriorität: ${contact.suggested_priority}`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Erstellen',
          onPress: async () => {
            const taskId = await createReminder(contact.contact_id, contact.suggested_priority);
            if (taskId) {
              Alert.alert('✅ Reminder erstellt', 'Task wurde in deiner Aufgabenliste hinzugefügt.');
            }
          }
        }
      ]
    );
  }, [createReminder]);

  const handleContactPress = useCallback((contact) => {
    setSelectedContact(contact);
    setModalVisible(true);
  }, []);

  const handleCall = useCallback((contact) => {
    setModalVisible(false);
    // Hier könnte Navigation zur Telefon-App oder zum Chat gehen
    Alert.alert(
      '📞 Kontakt anrufen',
      `${contact.name}\n${contact.phone || 'Keine Telefonnummer'}`,
      [{ text: 'OK' }]
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (isLoading && contacts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Proposal Reminders werden geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Proposal Reminders</Text>
        <Text style={styles.headerSubtitle}>
          {summary.total} Kontakte mit Angebot
        </Text>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <StatCard 
          icon="🚨" 
          value={summary.overdue} 
          label="Überfällig" 
          color="#EF4444" 
        />
        <StatCard 
          icon="⚠️" 
          value={summary.dueSoon} 
          label="Bald fällig" 
          color="#F59E0B" 
        />
        <StatCard 
          icon="📋" 
          value={summary.needingAction} 
          label="Brauchen Reminder" 
          color="#8B5CF6" 
        />
      </View>

      {/* Process All Button */}
      {summary.needingAction > 0 && (
        <Pressable 
          style={styles.processAllBtn}
          onPress={handleProcessAll}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={styles.processAllIcon}>🔔</Text>
              <Text style={styles.processAllText}>
                Alle {summary.needingAction} Reminders erstellen
              </Text>
            </>
          )}
        </Pressable>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Contacts List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Überfällig */}
        {contactsByStatus.overdue.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Überfällig"
              count={contactsByStatus.overdue.length}
              color="#EF4444"
              icon="🚨"
            />
            {contactsByStatus.overdue.map(contact => (
              <ContactCard
                key={contact.contact_id}
                contact={contact}
                onCreateReminder={handleCreateReminder}
                onMarkComplete={handleCall}
                onPress={handleContactPress}
                formatDays={formatDaysSinceProposal}
                getPriority={getPriorityCategory}
              />
            ))}
          </View>
        )}

        {/* Bald fällig */}
        {contactsByStatus.dueSoon.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Bald fällig"
              count={contactsByStatus.dueSoon.length}
              color="#F59E0B"
              icon="⚠️"
            />
            {contactsByStatus.dueSoon.map(contact => (
              <ContactCard
                key={contact.contact_id}
                contact={contact}
                onCreateReminder={handleCreateReminder}
                onMarkComplete={handleCall}
                onPress={handleContactPress}
                formatDays={formatDaysSinceProposal}
                getPriority={getPriorityCategory}
              />
            ))}
          </View>
        )}

        {/* Geplant */}
        {contactsByStatus.scheduled.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Geplant"
              count={contactsByStatus.scheduled.length}
              color="#3B82F6"
              icon="📅"
            />
            {contactsByStatus.scheduled.map(contact => (
              <ContactCard
                key={contact.contact_id}
                contact={contact}
                onCreateReminder={handleCreateReminder}
                onMarkComplete={handleCall}
                onPress={handleContactPress}
                formatDays={formatDaysSinceProposal}
                getPriority={getPriorityCategory}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {contacts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Keine Proposals offen</Text>
            <Text style={styles.emptyText}>
              Sobald du einem Lead ein Angebot sendest, erscheint er hier für das automatische Nachfassen.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Contact Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        {selectedContact && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedContact.name}</Text>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </Pressable>
              </View>

              <Text style={styles.modalCompany}>
                {selectedContact.company || 'Keine Firma'}
              </Text>

              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📧 E-Mail</Text>
                  <Text style={styles.detailValue}>{selectedContact.email || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📞 Telefon</Text>
                  <Text style={styles.detailValue}>{selectedContact.phone || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📅 Angebot gesendet</Text>
                  <Text style={styles.detailValue}>
                    {formatDaysSinceProposal(selectedContact.days_since_proposal)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>⚡ Priorität</Text>
                  <Text style={[styles.detailValue, { color: '#8B5CF6', fontWeight: 'bold' }]}>
                    {selectedContact.suggested_priority}
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable 
                  style={styles.modalActionBtn}
                  onPress={() => handleCall(selectedContact)}
                >
                  <Text style={styles.modalActionText}>📞 Anrufen</Text>
                </Pressable>
                
                {selectedContact.open_reminder_count === 0 && (
                  <Pressable 
                    style={[styles.modalActionBtn, styles.modalActionPrimary]}
                    onPress={() => {
                      setModalVisible(false);
                      handleCreateReminder(selectedContact);
                    }}
                  >
                    <Text style={[styles.modalActionText, { color: 'white' }]}>
                      🔔 Reminder erstellen
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748B' },
  
  // Header
  header: { backgroundColor: '#8B5CF6', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  
  // Stats Bar
  statsBar: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0' 
  },
  statCard: { flex: 1, alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  
  // Process All Button
  processAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    gap: 8
  },
  processAllIcon: { fontSize: 18 },
  processAllText: { color: 'white', fontSize: 16, fontWeight: '600' },
  
  // Error
  errorContainer: { 
    backgroundColor: '#FEE2E2', 
    margin: 16, 
    padding: 12, 
    borderRadius: 8 
  },
  errorText: { color: '#DC2626', fontSize: 14 },
  
  // List
  listContainer: { flex: 1 },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { color: 'white', fontSize: 12, fontWeight: '600' },
  
  // Contact Card
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  contactName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  contactCompany: { fontSize: 14, color: '#64748B', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  
  cardDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailIcon: { fontSize: 14, marginRight: 8, width: 20 },
  detailText: { fontSize: 14, color: '#475569' },
  
  cardMeta: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 12, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9' 
  },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaLabel: { fontSize: 12, color: '#64748B' },
  metaValue: { fontSize: 12, color: '#1E293B', fontWeight: '600', marginLeft: 4 },
  metaWarning: { color: '#EF4444' },
  
  cardActions: { 
    flexDirection: 'row', 
    gap: 8, 
    marginTop: 12, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9' 
  },
  reminderActive: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 10,
    borderRadius: 8
  },
  reminderActiveIcon: { fontSize: 14, marginRight: 6 },
  reminderActiveText: { fontSize: 13, color: '#059669', fontWeight: '500' },
  createReminderBtn: {
    flex: 1,
    backgroundColor: '#EDE9FE',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  createReminderText: { fontSize: 13, color: '#8B5CF6', fontWeight: '600' },
  actionBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  actionBtnText: { fontSize: 13, color: 'white', fontWeight: '600' },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8 },
  bottomSpacer: { height: 100 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24,
    maxHeight: '80%'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  closeButton: { fontSize: 24, color: '#94A3B8', padding: 8 },
  modalCompany: { fontSize: 16, color: '#64748B', marginBottom: 20 },
  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 14, color: '#64748B', marginBottom: 4 },
  detailValue: { fontSize: 16, color: '#1E293B', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalActionBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalActionPrimary: { backgroundColor: '#8B5CF6' },
  modalActionText: { fontSize: 16, fontWeight: '600', color: '#475569' }
});

