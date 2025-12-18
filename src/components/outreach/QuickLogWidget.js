/**
 * Quick-Log Widget - Floating Action Button für schnelles Outreach-Tracking
 * 
 * Ermöglicht das schnelle Erfassen einer gesendeten Nachricht auf Social Media
 * mit minimalem Aufwand (2-3 Taps)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
  Keyboard,
  Vibration,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { createOutreach, PLATFORMS, MESSAGE_TYPES } from '../../services/outreachService';

export default function QuickLogWidget({ onLog, style }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Platform, 2: Details
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form State
  const [platform, setPlatform] = useState(null);
  const [contactName, setContactName] = useState('');
  const [contactHandle, setContactHandle] = useState('');
  const [messageType, setMessageType] = useState('cold_dm');
  const [messagePreview, setMessagePreview] = useState('');
  const [notes, setNotes] = useState('');
  
  // Animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  const resetForm = () => {
    setPlatform(null);
    setContactName('');
    setContactHandle('');
    setMessageType('cold_dm');
    setMessagePreview('');
    setNotes('');
    setStep(1);
    setSuccess(false);
  };
  
  const handleOpen = () => {
    setIsOpen(true);
    Animated.spring(rotateAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  
  const handleClose = () => {
    Animated.spring(rotateAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false);
      resetForm();
    });
  };
  
  const selectPlatform = (p) => {
    setPlatform(p);
    setStep(2);
    Vibration.vibrate(10);
  };
  
  const handleSubmit = async () => {
    if (!contactName.trim()) return;
    
    setLoading(true);
    
    try {
      const result = await createOutreach({
        contact_name: contactName.trim(),
        platform: platform,
        message_type: messageType,
        contact_handle: contactHandle.trim() || null,
        message_preview: messagePreview.trim() || null,
        notes: notes.trim() || null,
      }, user?.access_token);
      
      setSuccess(true);
      Vibration.vibrate([0, 50, 50, 50]);
      
      if (onLog) {
        onLog(result.outreach);
      }
      
      // Auto-Close nach 1.5s
      setTimeout(() => {
        handleClose();
      }, 1500);
      
    } catch (error) {
      console.error('Quick-Log Error:', error);
      alert('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };
  
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* Floating Action Button */}
      <Pressable
        style={[styles.fab, style]}
        onPress={handleOpen}
        onPressIn={() => {
          Animated.spring(scaleAnim, {
            toValue: 0.9,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate: spin }] }}>
          <Text style={styles.fabIcon}>+</Text>
        </Animated.View>
      </Pressable>
      
      {/* Quick-Log Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {success ? '✅ Gespeichert!' : step === 1 ? '📱 Plattform wählen' : '✍️ Details'}
              </Text>
              <Pressable onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
            
            {/* Success State */}
            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.successText}>Nachricht geloggt!</Text>
                <Text style={styles.successSubtext}>
                  Ghost-Tracker aktiv. Du wirst erinnert falls keine Antwort kommt.
                </Text>
              </View>
            ) : step === 1 ? (
              /* Step 1: Platform Selection */
              <View style={styles.platformGrid}>
                {Object.entries(PLATFORMS).map(([key, config]) => (
                  <Pressable
                    key={key}
                    style={[
                      styles.platformBtn,
                      { borderColor: config.color }
                    ]}
                    onPress={() => selectPlatform(key)}
                  >
                    <Text style={styles.platformIcon}>{config.icon}</Text>
                    <Text style={styles.platformLabel}>{config.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              /* Step 2: Details Form */
              <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
                
                {/* Selected Platform */}
                <View style={styles.selectedPlatform}>
                  <Text style={styles.selectedPlatformIcon}>
                    {PLATFORMS[platform]?.icon}
                  </Text>
                  <Text style={styles.selectedPlatformLabel}>
                    {PLATFORMS[platform]?.label}
                  </Text>
                  <Pressable onPress={() => setStep(1)}>
                    <Text style={styles.changeBtn}>Ändern</Text>
                  </Pressable>
                </View>
                
                {/* Contact Name (Required) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={contactName}
                    onChangeText={setContactName}
                    placeholder="Max Mustermann"
                    placeholderTextColor="#64748b"
                    autoFocus
                  />
                </View>
                
                {/* Handle (Optional) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>@Handle</Text>
                  <TextInput
                    style={styles.input}
                    value={contactHandle}
                    onChangeText={setContactHandle}
                    placeholder="@maxmustermann"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                  />
                </View>
                
                {/* Message Type */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nachrichtentyp</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.typeRow}>
                      {Object.entries(MESSAGE_TYPES).slice(0, 5).map(([key, config]) => (
                        <Pressable
                          key={key}
                          style={[
                            styles.typeChip,
                            messageType === key && styles.typeChipActive
                          ]}
                          onPress={() => setMessageType(key)}
                        >
                          <Text style={[
                            styles.typeChipText,
                            messageType === key && styles.typeChipTextActive
                          ]}>
                            {config.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                
                {/* Message Preview (Optional) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nachricht (Kurzvorschau)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={messagePreview}
                    onChangeText={setMessagePreview}
                    placeholder="Hey! Ich hab gesehen..."
                    placeholderTextColor="#64748b"
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                {/* Submit Button */}
                <Pressable
                  style={[
                    styles.submitBtn,
                    (!contactName.trim() || loading) && styles.submitBtnDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!contactName.trim() || loading}
                >
                  <Text style={styles.submitBtnText}>
                    {loading ? '⏳ Speichern...' : '✓ Nachricht geloggt'}
                  </Text>
                </Pressable>
                
                {/* Hint */}
                <Text style={styles.hint}>
                  💡 Markiere später als "Gelesen" wenn du die blauen Haken siehst
                </Text>
                
              </ScrollView>
            )}
            
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  
  // Platform Grid
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  platformBtn: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  platformIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  platformLabel: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  
  // Form
  formContainer: {
    padding: 20,
  },
  selectedPlatform: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedPlatformIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  selectedPlatformLabel: {
    fontSize: 16,
    color: '#f8fafc',
    fontWeight: '500',
    flex: 1,
  },
  changeBtn: {
    color: '#3b82f6',
    fontSize: 14,
  },
  
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  typeChipText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  typeChipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  
  submitBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#334155',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  hint: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
  },
  
  // Success
  successContainer: {
    padding: 40,
    alignItems: 'center',
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  successText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

