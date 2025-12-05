import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';
import { useSubscription } from '../context/SubscriptionContext';

interface Lead {
  id: number;
  name: string;
  status: string;
  company: string;
}

export default function LeadsScreen() {
  const navigation = useNavigation<any>();
  const { checkCanAddLead, incrementLeadCount, leadCount, isPro } = useSubscription();
  
  const [leads, setLeads] = useState<Lead[]>([
    { id: 1, name: 'Max Mustermann', status: 'Neu', company: 'Muster GmbH' },
    { id: 2, name: 'Anna Schmidt', status: 'Kontaktiert', company: 'Schmidt AG' },
    { id: 3, name: 'Peter Weber', status: 'Interessiert', company: 'Weber GmbH' },
  ]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', company: '' });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Neu':
        return COLORS.secondary;
      case 'Kontaktiert':
        return COLORS.warning;
      case 'Interessiert':
        return COLORS.success;
      default:
        return COLORS.textMuted;
    }
  };

  const handleAddLead = () => {
    if (!checkCanAddLead()) {
      // Paywall zeigen
      navigation.navigate('Paywall', { trigger: 'lead_limit' });
      return;
    }
    
    // Modal öffnen
    setModalVisible(true);
  };

  const saveLead = () => {
    if (!newLead.name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen ein.');
      return;
    }

    const lead: Lead = {
      id: Date.now(),
      name: newLead.name,
      company: newLead.company || 'Unbekannt',
      status: 'Neu',
    };

    setLeads([lead, ...leads]);
    incrementLeadCount();
    setNewLead({ name: '', company: '' });
    setModalVisible(false);
    Alert.alert('Erfolg!', 'Lead wurde hinzugefügt.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Lead Management</Text>
          {!isPro && (
            <Text style={styles.limitText}>
              {leadCount}/5 Leads verwendet
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddLead}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {leads.map((lead) => (
          <TouchableOpacity key={lead.id} activeOpacity={0.8}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{lead.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(lead.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{lead.status}</Text>
                </View>
              </View>
              <Text style={styles.cardCompany}>{lead.company}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Lead Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Neuen Lead hinzufügen</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#71717a"
              value={newLead.name}
              onChangeText={(text) => setNewLead({ ...newLead, name: text })}
              autoFocus
            />
            
            <TextInput
              style={styles.input}
              placeholder="Unternehmen (optional)"
              placeholderTextColor="#71717a"
              value={newLead.company}
              onChangeText={(text) => setNewLead({ ...newLead, company: text })}
            />
            
            <TouchableOpacity style={styles.saveButton} onPress={saveLead}>
              <Text style={styles.saveButtonText}>Lead speichern</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  limitText: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  cardCompany: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  input: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3f3f46',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
