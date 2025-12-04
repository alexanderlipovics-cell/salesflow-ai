/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  Referral Reminder Component                                                ║
 * ║  Banner/Card für Referral-Empfehlungen nach Kauf                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Clipboard,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../../services/apiConfig';
import { useAuth } from '../../context/AuthContext';

interface ReferralReminderProps {
  contactId: string;
  contactName?: string;
  lastPurchaseDate?: string;
  onScriptGenerated?: (script: string) => void;
}

interface ReferralScript {
  script: string;
  script_type: string;
  timing_suggestion: string;
  follow_up_days: number;
  confidence_score: number;
  reasoning?: string;
}

const getApiUrl = () => `${API_CONFIG.baseUrl.replace('/api/v1', '')}/api/v2/referral`;

export const ReferralReminder: React.FC<ReferralReminderProps> = ({
  contactId,
  contactName,
  lastPurchaseDate,
  onScriptGenerated,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<ReferralScript | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);

  const generateScript = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/generate-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.access_token && { Authorization: `Bearer ${user.access_token}` }),
        },
        body: JSON.stringify({
          contact_id: contactId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setScript(data);
      setShowScriptModal(true);
      
      if (onScriptGenerated) {
        onScriptGenerated(data.script);
      }
    } catch (error) {
      console.error('Error generating referral script:', error);
      Alert.alert(
        'Fehler',
        'Referral-Skript konnte nicht generiert werden. Bitte versuche es erneut.'
      );
    } finally {
      setLoading(false);
    }
  };

  const copyScript = () => {
    if (script) {
      Clipboard.setString(script.script);
      Alert.alert('✅ Kopiert', 'Skript wurde in die Zwischenablage kopiert!');
    }
  };

  const trackReferral = async (asked: boolean, result?: string) => {
    try {
      await fetch(`${getApiUrl()}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.access_token && { Authorization: `Bearer ${user.access_token}` }),
        },
        body: JSON.stringify({
          contact_id: contactId,
          asked,
          result,
          script_type: script?.script_type,
        }),
      });
    } catch (error) {
      console.error('Error tracking referral:', error);
    }
  };

  const handleAskNow = () => {
    trackReferral(true, 'yes');
    setShowScriptModal(false);
    Alert.alert('✅ Gespeichert', 'Referral-Request wurde getrackt.');
  };

  const handleLater = () => {
    trackReferral(true, 'later');
    setShowScriptModal(false);
  };

  const handleSkip = () => {
    trackReferral(false, 'no');
    setShowScriptModal(false);
  };

  return (
    <>
      <View style={styles.container}>
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <Text style={styles.icon}>💎</Text>
            <View style={styles.textContainer}>
              <Text style={styles.title}>Jetzt nach Empfehlung fragen</Text>
              <Text style={styles.subtitle}>
                {contactName || 'Dieser Kontakt'} hat kürzlich gekauft - perfekter Zeitpunkt für eine Empfehlung!
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={generateScript}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>Skript generieren</Text>
              )}
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      {/* Script Modal */}
      <Modal
        visible={showScriptModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScriptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💎 Referral-Skript</Text>
              <Pressable
                onPress={() => setShowScriptModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {script && (
                <>
                  {/* Script Info */}
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Timing:</Text>
                    <Text style={styles.infoValue}>{script.timing_suggestion}</Text>
                  </View>

                  {script.reasoning && (
                    <View style={styles.infoCard}>
                      <Text style={styles.infoLabel}>Begründung:</Text>
                      <Text style={styles.infoValue}>{script.reasoning}</Text>
                    </View>
                  )}

                  {/* Script Text */}
                  <View style={styles.scriptCard}>
                    <Text style={styles.scriptLabel}>Skript:</Text>
                    <Text style={styles.scriptText}>{script.script}</Text>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.copyButton]}
                onPress={copyScript}
              >
                <Text style={styles.modalButtonText}>📋 Kopieren</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.askButton]}
                onPress={handleAskNow}
              >
                <Text style={[styles.modalButtonText, styles.askButtonText]}>
                  ✅ Gefragt
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.laterButton]}
                onPress={handleLater}
              >
                <Text style={styles.modalButtonText}>⏰ Später</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.skipButton]}
                onPress={handleSkip}
              >
                <Text style={styles.modalButtonText}>Überspringen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748B',
  },
  modalBody: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
  },
  scriptCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  scriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  scriptText: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  modalButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  copyButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  askButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  laterButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  skipButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  askButtonText: {
    color: 'white',
  },
});

