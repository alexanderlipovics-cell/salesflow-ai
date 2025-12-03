/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  EMAIL ACCOUNTS SCREEN                                                     ║
 * ║  SMTP-Konten verwalten für Sequence-Emails                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================================================
// TYPES
// ============================================================================

interface EmailAccount {
  id: string;
  email_address: string;
  display_name: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_security: 'ssl' | 'tls' | 'none';
  is_verified: boolean;
  is_active: boolean;
  daily_limit: number;
  sent_today: number;
  warmup_enabled: boolean;
  warmup_sent_today: number;
  created_at: string;
}

interface AccountFormData {
  email_address: string;
  display_name: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_security: 'ssl' | 'tls' | 'none';
  daily_limit: string;
}

const INITIAL_FORM: AccountFormData = {
  email_address: '',
  display_name: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_password: '',
  smtp_security: 'tls',
  daily_limit: '50',
};

// ============================================================================
// API
// ============================================================================

const API_BASE = 'http://localhost:8000/api/v1';

async function fetchAccounts(token: string): Promise<EmailAccount[]> {
  const res = await fetch(`${API_BASE}/email-accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return res.json();
}

async function createAccount(token: string, data: any): Promise<EmailAccount> {
  const res = await fetch(`${API_BASE}/email-accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create account');
  }
  return res.json();
}

async function verifyAccount(token: string, id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/email-accounts/${id}/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function testAccount(token: string, id: string, toEmail: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/email-accounts/${id}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to_email: toEmail }),
  });
  return res.json();
}

async function toggleActive(token: string, id: string, isActive: boolean): Promise<void> {
  await fetch(`${API_BASE}/email-accounts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ is_active: isActive }),
  });
}

async function deleteAccount(token: string, id: string): Promise<void> {
  await fetch(`${API_BASE}/email-accounts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ============================================================================
// SMTP PRESETS
// ============================================================================

const SMTP_PRESETS = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587, security: 'tls' as const },
  { name: 'Outlook', host: 'smtp-mail.outlook.com', port: 587, security: 'tls' as const },
  { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 465, security: 'ssl' as const },
  { name: 'Zoho', host: 'smtp.zoho.com', port: 587, security: 'tls' as const },
  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, security: 'tls' as const },
  { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, security: 'tls' as const },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function EmailAccountsScreen({ navigation }: any) {
  const { session } = useAuth();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  // Load accounts
  const loadAccounts = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const data = await fetchAccounts(session.access_token);
      setAccounts(data);
    } catch (e) {
      console.error('Error loading accounts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

  const handlePresetSelect = (preset: typeof SMTP_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      smtp_host: preset.host,
      smtp_port: String(preset.port),
      smtp_security: preset.security,
    }));
  };

  const handleSaveAccount = async () => {
    if (!session?.access_token) return;

    // Validation
    if (!formData.email_address || !formData.smtp_host || !formData.smtp_user || !formData.smtp_password) {
      Alert.alert('Fehler', 'Bitte fülle alle Pflichtfelder aus');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        email_address: formData.email_address,
        display_name: formData.display_name || null,
        smtp_host: formData.smtp_host,
        smtp_port: parseInt(formData.smtp_port, 10),
        smtp_user: formData.smtp_user,
        smtp_password: formData.smtp_password,
        smtp_security: formData.smtp_security,
        daily_limit: parseInt(formData.daily_limit, 10),
      };

      await createAccount(session.access_token, payload);
      setShowAddModal(false);
      setFormData(INITIAL_FORM);
      loadAccounts();
      Alert.alert('Erfolg', 'Email-Konto hinzugefügt! Bitte verifiziere es.');
    } catch (e: any) {
      Alert.alert('Fehler', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (account: EmailAccount) => {
    if (!session?.access_token) return;
    setVerifying(account.id);
    try {
      const result = await verifyAccount(session.access_token, account.id);
      if (result.success) {
        Alert.alert('Erfolg', 'Konto erfolgreich verifiziert! ✅');
        loadAccounts();
      } else {
        Alert.alert('Fehler', result.message || 'Verifizierung fehlgeschlagen');
      }
    } catch (e) {
      Alert.alert('Fehler', 'Verifizierung fehlgeschlagen');
    } finally {
      setVerifying(null);
    }
  };

  const handleTest = (account: EmailAccount) => {
    Alert.prompt(
      'Test-Email senden',
      'An welche Adresse soll die Test-Email gesendet werden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Senden',
          onPress: async (toEmail) => {
            if (!toEmail || !session?.access_token) return;
            try {
              const result = await testAccount(session.access_token, account.id, toEmail);
              if (result.success) {
                Alert.alert('Erfolg', `Test-Email an ${toEmail} gesendet!`);
              } else {
                Alert.alert('Fehler', 'Test fehlgeschlagen');
              }
            } catch (e) {
              Alert.alert('Fehler', 'Konnte Test-Email nicht senden');
            }
          },
        },
      ],
      'plain-text',
      account.email_address
    );
  };

  const handleToggleActive = async (account: EmailAccount) => {
    if (!session?.access_token) return;
    try {
      await toggleActive(session.access_token, account.id, !account.is_active);
      loadAccounts();
    } catch (e) {
      Alert.alert('Fehler', 'Status konnte nicht geändert werden');
    }
  };

  const handleDelete = (account: EmailAccount) => {
    Alert.alert(
      'Konto löschen?',
      `Möchtest du "${account.email_address}" wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            if (!session?.access_token) return;
            try {
              await deleteAccount(session.access_token, account.id);
              loadAccounts();
            } catch (e) {
              Alert.alert('Fehler', 'Konto konnte nicht gelöscht werden');
            }
          },
        },
      ]
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Lade Email-Konten...</Text>
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
          <Text style={styles.headerTitle}>📧 Email-Konten</Text>
          <Text style={styles.headerSubtitle}>
            {accounts.length} Konto{accounts.length !== 1 ? 'en' : ''} konfiguriert
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Account List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#667eea" />
        }
      >
        {accounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>Keine Email-Konten</Text>
            <Text style={styles.emptySubtitle}>
              Füge dein erstes SMTP-Konto hinzu, um automatische Emails zu senden
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
              <Text style={styles.emptyButtonText}>+ Konto hinzufügen</Text>
            </TouchableOpacity>
          </View>
        ) : (
          accounts.map((account) => (
            <View key={account.id} style={styles.accountCard}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.emailAddress}>{account.email_address}</Text>
                  {account.display_name && (
                    <Text style={styles.displayName}>{account.display_name}</Text>
                  )}
                </View>
                <View style={styles.statusBadges}>
                  {account.is_verified ? (
                    <View style={[styles.badge, styles.badgeVerified]}>
                      <Ionicons name="checkmark-circle" size={14} color="#fff" />
                      <Text style={styles.badgeText}>Verifiziert</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.badge, styles.badgeWarning]}
                      onPress={() => handleVerify(account)}
                      disabled={verifying === account.id}
                    >
                      {verifying === account.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="alert-circle" size={14} color="#fff" />
                          <Text style={styles.badgeText}>Verifizieren</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* SMTP Info */}
              <View style={styles.smtpInfo}>
                <Text style={styles.smtpText}>
                  {account.smtp_host}:{account.smtp_port} ({account.smtp_security.toUpperCase()})
                </Text>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{account.sent_today}</Text>
                  <Text style={styles.statLabel}>Heute gesendet</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{account.daily_limit}</Text>
                  <Text style={styles.statLabel}>Tägliches Limit</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Math.round((account.sent_today / Math.max(account.daily_limit, 1)) * 100)}%
                  </Text>
                  <Text style={styles.statLabel}>Auslastung</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(
                        (account.sent_today / Math.max(account.daily_limit, 1)) * 100,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>

              {/* Warmup */}
              {account.warmup_enabled && (
                <View style={styles.warmupBadge}>
                  <Ionicons name="flame" size={14} color="#f59e0b" />
                  <Text style={styles.warmupText}>
                    Warmup aktiv ({account.warmup_sent_today} gesendet)
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.cardActions}>
                <View style={styles.activeToggle}>
                  <Text style={styles.activeLabel}>Aktiv</Text>
                  <Switch
                    value={account.is_active}
                    onValueChange={() => handleToggleActive(account)}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor={account.is_active ? '#fff' : '#f4f3f4'}
                  />
                </View>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleTest(account)}
                >
                  <Ionicons name="paper-plane" size={18} color="#667eea" />
                  <Text style={styles.actionButtonText}>Test</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(account)}
                >
                  <Ionicons name="trash" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#667eea" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>💡 Tipps für Email-Zustellung</Text>
            <Text style={styles.infoText}>
              • Nutze Gmail mit "App-Passwort"{'\n'}
              • Aktiviere Warmup für neue Konten{'\n'}
              • Halte das tägliche Limit unter 100/Tag{'\n'}
              • Verifiziere SPF/DKIM für bessere Zustellung
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Account Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📧 Email-Konto hinzufügen</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* SMTP Presets */}
              <Text style={styles.sectionTitle}>Schnellauswahl</Text>
              <View style={styles.presetsRow}>
                {SMTP_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.name}
                    style={[
                      styles.presetChip,
                      formData.smtp_host === preset.host && styles.presetChipActive,
                    ]}
                    onPress={() => handlePresetSelect(preset)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        formData.smtp_host === preset.host && styles.presetChipTextActive,
                      ]}
                    >
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form Fields */}
              <Text style={styles.sectionTitle}>Email-Adresse *</Text>
              <TextInput
                style={styles.input}
                placeholder="deine@email.com"
                value={formData.email_address}
                onChangeText={(text) => setFormData((p) => ({ ...p, email_address: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.sectionTitle}>Anzeigename</Text>
              <TextInput
                style={styles.input}
                placeholder="Max Mustermann"
                value={formData.display_name}
                onChangeText={(text) => setFormData((p) => ({ ...p, display_name: text }))}
              />

              <Text style={styles.sectionTitle}>SMTP-Host *</Text>
              <TextInput
                style={styles.input}
                placeholder="smtp.gmail.com"
                value={formData.smtp_host}
                onChangeText={(text) => setFormData((p) => ({ ...p, smtp_host: text }))}
                autoCapitalize="none"
              />

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.sectionTitle}>Port *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="587"
                    value={formData.smtp_port}
                    onChangeText={(text) => setFormData((p) => ({ ...p, smtp_port: text }))}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.sectionTitle}>Sicherheit</Text>
                  <View style={styles.securityRow}>
                    {(['tls', 'ssl', 'none'] as const).map((sec) => (
                      <TouchableOpacity
                        key={sec}
                        style={[
                          styles.securityButton,
                          formData.smtp_security === sec && styles.securityButtonActive,
                        ]}
                        onPress={() => setFormData((p) => ({ ...p, smtp_security: sec }))}
                      >
                        <Text
                          style={[
                            styles.securityButtonText,
                            formData.smtp_security === sec && styles.securityButtonTextActive,
                          ]}
                        >
                          {sec.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>SMTP-Benutzer *</Text>
              <TextInput
                style={styles.input}
                placeholder="deine@email.com"
                value={formData.smtp_user}
                onChangeText={(text) => setFormData((p) => ({ ...p, smtp_user: text }))}
                autoCapitalize="none"
              />

              <Text style={styles.sectionTitle}>SMTP-Passwort *</Text>
              <TextInput
                style={styles.input}
                placeholder="App-Passwort eingeben"
                value={formData.smtp_password}
                onChangeText={(text) => setFormData((p) => ({ ...p, smtp_password: text }))}
                secureTextEntry
              />

              <Text style={styles.sectionTitle}>Tägliches Limit</Text>
              <TextInput
                style={styles.input}
                placeholder="50"
                value={formData.daily_limit}
                onChangeText={(text) => setFormData((p) => ({ ...p, daily_limit: text }))}
                keyboardType="number-pad"
              />

              {/* Gmail Hint */}
              <View style={styles.hintBox}>
                <Text style={styles.hintTitle}>💡 Gmail App-Passwort</Text>
                <Text style={styles.hintText}>
                  1. Aktiviere 2FA in deinem Google-Konto{'\n'}
                  2. Gehe zu Sicherheit → App-Passwörter{'\n'}
                  3. Erstelle ein neues App-Passwort für "Mail"{'\n'}
                  4. Nutze dieses 16-stellige Passwort hier
                </Text>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveAccount}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Konto hinzufügen</Text>
                </>
              )}
            </TouchableOpacity>
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
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  accountCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
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
  },
  cardHeaderLeft: {
    flex: 1,
  },
  emailAddress: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  displayName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadges: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeVerified: {
    backgroundColor: '#10b981',
  },
  badgeWarning: {
    backgroundColor: '#f59e0b',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  smtpInfo: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  smtpText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 3,
  },
  warmupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  warmupText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 6,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  activeToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0ff',
  },
  actionButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f0ff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  modalScroll: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  presetChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  presetChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  securityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  securityButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  securityButtonActive: {
    backgroundColor: '#667eea',
  },
  securityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  securityButtonTextActive: {
    color: '#fff',
  },
  hintBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

