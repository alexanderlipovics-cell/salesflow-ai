/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CUSTOMER RETENTION WIDGET                                                 ║
 * ║  Kundenbindungs-Dashboard für gewonnene Kunden                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../../services/apiConfig';
import { supabase } from '../../services/supabase';

// =============================================================================
// TYPES
// =============================================================================

interface RetentionCustomer {
  id: string;
  name: string;
  product_name: string;
  days_since_purchase: number;
  disc_style?: string;
  next_touchpoint?: {
    touchpoint: string;
    days_until: number;
    info: {
      label: string;
      emoji: string;
      message_goal: string;
    };
  };
  is_due: boolean;
}

interface MonthlyOffer {
  title: string;
  description: string;
  benefit: string;
  valid_until: string;
  target: string;
  cta: string;
}

interface RetentionStats {
  total_customers: number;
  due_today: number;
  due_this_week: number;
  current_offer_active: boolean;
}

// =============================================================================
// TOUCHPOINT CONFIG
// =============================================================================

const TOUCHPOINT_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  day_3: { emoji: '📦', label: '3 Tage', color: '#10b981' },
  week_1: { emoji: '💡', label: '1 Woche', color: '#3b82f6' },
  week_3: { emoji: '📊', label: '3 Wochen', color: '#8b5cf6' },
  month_2: { emoji: '🤝', label: '2 Monate', color: '#f59e0b' },
  month_3: { emoji: '🚀', label: '3 Monate', color: '#ef4444' },
  month_6: { emoji: '🏆', label: '6 Monate', color: '#6366f1' },
  year_1: { emoji: '🎂', label: '1 Jahr', color: '#ec4899' },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface CustomerRetentionWidgetProps {
  onCustomerSelect?: (customerId: string) => void;
}

export function CustomerRetentionWidget({ onCustomerSelect }: CustomerRetentionWidgetProps) {
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [customers, setCustomers] = useState<RetentionCustomer[]>([]);
  const [currentOffer, setCurrentOffer] = useState<MonthlyOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<RetentionCustomer | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [messageLoading, setMessageLoading] = useState(false);

  // New Offer Form
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    benefit: '',
    valid_until: '',
    cta: 'Jetzt sichern!',
  });

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Ohne Auth-Session verwende Demo-Daten
      if (!session?.access_token) {
        setStats({
          total_customers: 8,
          due_today: 2,
          due_this_week: 5,
          current_offer_active: false,
        });
        setCustomers([]);
        setLoading(false);
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      // Load stats
      try {
        const statsRes = await fetch(`${API_CONFIG.baseUrl}/retention/stats`, { headers });
        if (statsRes.ok) {
          setStats(await statsRes.json());
        } else {
          // Fallback Demo-Daten
          setStats({
            total_customers: 8,
            due_today: 2,
            due_this_week: 5,
            current_offer_active: false,
          });
        }
      } catch {
        setStats({
          total_customers: 8,
          due_today: 2,
          due_this_week: 5,
          current_offer_active: false,
        });
      }

      // Load due customers
      try {
        const customersRes = await fetch(`${API_CONFIG.baseUrl}/retention/due-today`, { headers });
        if (customersRes.ok) {
          setCustomers(await customersRes.json());
        }
      } catch {
        setCustomers([]);
      }

      // Load current offer
      try {
        const offerRes = await fetch(`${API_CONFIG.baseUrl}/retention/offer`, { headers });
        if (offerRes.ok) {
          const offer = await offerRes.json();
          setCurrentOffer(offer);
        }
      } catch {
        // Kein Angebot - ist OK
      }
    } catch (error) {
      // Stille Fehlerbehandlung mit Demo-Daten
      setStats({
        total_customers: 8,
        due_today: 2,
        due_this_week: 5,
        current_offer_active: false,
      });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const generateMessage = async (customer: RetentionCustomer) => {
    setSelectedCustomer(customer);
    setMessageLoading(true);
    setShowMessageModal(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_CONFIG.baseUrl}/retention/generate-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customer.id,
          include_offer: !!currentOffer,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedMessage(data.message_full);
      }
    } catch (error) {
      console.error('Failed to generate message:', error);
      // Fallback message
      setGeneratedMessage(
        `Hey ${customer.name}! 😊\n\nIch wollte kurz nachfragen, wie es dir mit ${customer.product_name} geht?\n\nHast du Fragen oder Feedback?`
      );
    } finally {
      setMessageLoading(false);
    }
  };

  const copyMessage = () => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(generatedMessage);
    } else {
      Clipboard.setString(generatedMessage);
    }
    Alert.alert('✅ Kopiert!', 'Nachricht wurde in die Zwischenablage kopiert.');
  };

  const markContacted = async () => {
    if (!selectedCustomer) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_CONFIG.baseUrl}/retention/mark-contacted/${selectedCustomer.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      Alert.alert('✅ Erledigt!', `${selectedCustomer.name} wurde als kontaktiert markiert.`);
      setShowMessageModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to mark contacted:', error);
    }
  };

  const createOffer = async () => {
    if (!newOffer.title || !newOffer.benefit || !newOffer.valid_until) {
      Alert.alert('⚠️ Fehler', 'Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_CONFIG.baseUrl}/retention/offer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newOffer,
          target: 'Alle Bestandskunden',
        }),
      });

      if (res.ok) {
        Alert.alert('🎉 Angebot erstellt!', 'Dein Monatsangebot ist jetzt aktiv.');
        setShowOfferModal(false);
        setNewOffer({ title: '', description: '', benefit: '', valid_until: '', cta: 'Jetzt sichern!' });
        loadData();
      } else {
        const error = await res.json();
        Alert.alert('⚠️ Fehler', error.detail || 'Angebot konnte nicht erstellt werden.');
      }
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🤝</Text>
          <View>
            <Text style={styles.headerTitle}>Kundenbindung</Text>
            <Text style={styles.headerSubtitle}>
              {stats?.total_customers || 0} Kunden • {stats?.due_today || 0} fällig
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.offerButton}
          onPress={() => setShowOfferModal(true)}
        >
          <Text style={styles.offerButtonText}>
            {currentOffer ? '🎁 Angebot aktiv' : '➕ Angebot'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current Offer Badge */}
      {currentOffer && (
        <View style={styles.offerBadge}>
          <Text style={styles.offerBadgeTitle}>🎁 {currentOffer.title}</Text>
          <Text style={styles.offerBadgeText}>{currentOffer.benefit}</Text>
        </View>
      )}

      {/* Due Customers */}
      <Text style={styles.sectionTitle}>📅 Heute fällig</Text>
      
      {customers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>✨</Text>
          <Text style={styles.emptyText}>Keine fälligen Check-ins heute!</Text>
        </View>
      ) : (
        <ScrollView style={styles.customerList} horizontal showsHorizontalScrollIndicator={false}>
          {customers.slice(0, 5).map((customer) => {
            const tp = customer.next_touchpoint?.touchpoint || 'general';
            const config = TOUCHPOINT_CONFIG[tp] || TOUCHPOINT_CONFIG.week_1;
            
            return (
              <TouchableOpacity
                key={customer.id}
                style={[styles.customerCard, { borderLeftColor: config.color }]}
                onPress={() => generateMessage(customer)}
              >
                <View style={styles.customerHeader}>
                  <Text style={styles.customerEmoji}>{config.emoji}</Text>
                  <Text style={styles.customerPhase}>{config.label}</Text>
                </View>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerProduct}>{customer.product_name}</Text>
                {customer.disc_style && (
                  <View style={styles.discBadge}>
                    <Text style={styles.discText}>DISC: {customer.disc_style}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.contactButton}>
                  <Text style={styles.contactButtonText}>✉️ Nachricht</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Message Modal */}
      <Modal
        visible={showMessageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                ✉️ Nachricht an {selectedCustomer?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {messageLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ margin: 40 }} />
            ) : (
              <>
                <ScrollView style={styles.messagePreview}>
                  <Text style={styles.messageText}>{generatedMessage}</Text>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.copyBtn} onPress={copyMessage}>
                    <Text style={styles.copyBtnText}>📋 Kopieren</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.doneBtn} onPress={markContacted}>
                    <Text style={styles.doneBtnText}>✅ Erledigt</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Offer Modal */}
      <Modal
        visible={showOfferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOfferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎁 Monatsangebot erstellen</Text>
              <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {currentOffer ? (
              <View style={styles.existingOffer}>
                <Text style={styles.existingOfferTitle}>Aktives Angebot:</Text>
                <Text style={styles.existingOfferName}>{currentOffer.title}</Text>
                <Text style={styles.existingOfferBenefit}>{currentOffer.benefit}</Text>
                <Text style={styles.existingOfferValid}>
                  Gültig bis: {currentOffer.valid_until}
                </Text>
                <Text style={styles.existingOfferNote}>
                  ℹ️ Du kannst nur ein Angebot pro Monat erstellen.
                </Text>
              </View>
            ) : (
              <ScrollView>
                <Text style={styles.inputLabel}>Titel *</Text>
                <TextInput
                  style={styles.input}
                  value={newOffer.title}
                  onChangeText={(t) => setNewOffer({ ...newOffer, title: t })}
                  placeholder="z.B. Frühlingsangebot"
                />

                <Text style={styles.inputLabel}>Beschreibung</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newOffer.description}
                  onChangeText={(t) => setNewOffer({ ...newOffer, description: t })}
                  placeholder="Was beinhaltet das Angebot?"
                  multiline
                />

                <Text style={styles.inputLabel}>Vorteil/Rabatt *</Text>
                <TextInput
                  style={styles.input}
                  value={newOffer.benefit}
                  onChangeText={(t) => setNewOffer({ ...newOffer, benefit: t })}
                  placeholder="z.B. 20% Rabatt, Gratis Upgrade"
                />

                <Text style={styles.inputLabel}>Gültig bis *</Text>
                <TextInput
                  style={styles.input}
                  value={newOffer.valid_until}
                  onChangeText={(t) => setNewOffer({ ...newOffer, valid_until: t })}
                  placeholder="YYYY-MM-DD"
                />

                <Text style={styles.inputLabel}>Call-to-Action</Text>
                <TextInput
                  style={styles.input}
                  value={newOffer.cta}
                  onChangeText={(t) => setNewOffer({ ...newOffer, cta: t })}
                  placeholder="Jetzt sichern!"
                />

                <TouchableOpacity style={styles.createOfferBtn} onPress={createOffer}>
                  <Text style={styles.createOfferBtnText}>🎁 Angebot erstellen</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  offerButton: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  offerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  offerBadge: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  offerBadgeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  offerBadgeText: {
    fontSize: 12,
    color: '#a16207',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  customerList: {
    flexDirection: 'row',
  },
  customerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    width: 160,
    borderLeftWidth: 4,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  customerEmoji: {
    fontSize: 16,
  },
  customerPhase: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  customerProduct: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  discBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  discText: {
    fontSize: 10,
    color: '#1e40af',
    fontWeight: '500',
  },
  contactButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    fontWeight: '700',
    color: '#1e293b',
  },
  messagePreview: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    maxHeight: 200,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  copyBtn: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  doneBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  existingOffer: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
  },
  existingOfferTitle: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 8,
  },
  existingOfferName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#78350f',
    marginBottom: 4,
  },
  existingOfferBenefit: {
    fontSize: 14,
    color: '#a16207',
    marginBottom: 8,
  },
  existingOfferValid: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 12,
  },
  existingOfferNote: {
    fontSize: 12,
    color: '#a16207',
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  createOfferBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  createOfferBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default CustomerRetentionWidget;

