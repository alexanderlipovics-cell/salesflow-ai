/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  TEACH FEEDBACK MODAL v2                                                   ║
 * ║  UI für das Sales Brain Lern-Feedback                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Wird angezeigt wenn der User einen CHIEF-Vorschlag ändert.
 * Ermöglicht dem User zu entscheiden ob Sales Flow AI daraus lernen soll.
 * 
 * Features v2:
 *   - Vorschau von Original vs. Korrigiertem Text
 *   - Suggested Rule Preview (was CHIEF lernen würde)
 *   - 3 Optionen: Persönlich / Team / Ignorieren
 *   - Animierte Übergänge & Success State
 *   - Haptic Feedback (Expo)
 *   - Loading State während API-Call
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';

// Try to import Haptics (optional)
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available
}

// ============================================================================
// TYPES
// ============================================================================

export type FeedbackType = 'personal' | 'team' | 'ignore';

export interface SuggestedRulePreview {
  title: string;
  instruction: string;
  ruleType: string;
  confidence?: number;
}

export interface TeachFeedbackModalProps {
  /** Ob das Modal sichtbar ist */
  visible: boolean;
  /** ID der Korrektur (von /brain/corrections/detect Response) */
  correctionId: string;
  /** Der originale CHIEF-Vorschlag */
  originalText: string;
  /** Der vom User korrigierte Text */
  correctedText: string;
  /** Optional: Vorgeschlagene Regel von Claude */
  suggestedRule?: SuggestedRulePreview;
  /** Optional: Zusammenfassung der Änderungen */
  changeSummary?: string[];
  /** Callback wenn Modal geschlossen wird */
  onClose: () => void;
  /** Callback nach erfolgreichem Feedback */
  onComplete: (feedbackType: FeedbackType, ruleCreated: boolean, ruleTitle?: string) => void;
  /** Optional: API Base URL */
  apiBaseUrl?: string;
}

interface FeedbackResponse {
  success: boolean;
  rule_created: boolean;
  rule_id?: string;
  rule_title?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// API HELPER
// ============================================================================

async function submitFeedback(
  correctionId: string,
  feedback: FeedbackType,
  apiBaseUrl: string = '/api/v1'
): Promise<FeedbackResponse> {
  const response = await fetch(`${apiBaseUrl}/brain/corrections/feedback`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      correction_id: correctionId,
      feedback,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Feedback failed: ${response.status}`);
  }
  
  return response.json();
}

// ============================================================================
// HAPTIC HELPERS
// ============================================================================

const hapticImpact = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (Haptics && Platform.OS !== 'web') {
    try {
      await Haptics.impactAsync(
        style === 'light' ? Haptics.ImpactFeedbackStyle.Light :
        style === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy :
        Haptics.ImpactFeedbackStyle.Medium
      );
    } catch {
      // Ignore haptic errors
    }
  }
};

const hapticNotification = async (type: 'success' | 'error' | 'warning' = 'success') => {
  if (Haptics && Platform.OS !== 'web') {
    try {
      await Haptics.notificationAsync(
        type === 'success' ? Haptics.NotificationFeedbackType.Success :
        type === 'error' ? Haptics.NotificationFeedbackType.Error :
        Haptics.NotificationFeedbackType.Warning
      );
    } catch {
      // Ignore haptic errors
    }
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const TeachFeedbackModal: React.FC<TeachFeedbackModalProps> = ({
  visible,
  correctionId,
  originalText,
  correctedText,
  suggestedRule,
  changeSummary = [],
  onClose,
  onComplete,
  apiBaseUrl = '/api/v1',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<FeedbackType | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  
  // Animation on mount/unmount
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset state
      setSelectedOption(null);
      setError(null);
      setShowSuccess(false);
    }
  }, [visible, slideAnim, fadeAnim]);
  
  // Success animation
  useEffect(() => {
    if (showSuccess) {
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      successScale.setValue(0);
    }
  }, [showSuccess, successScale]);
  
  const handleSelect = useCallback(async (feedback: FeedbackType) => {
    hapticImpact('medium');
    setSelectedOption(feedback);
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await submitFeedback(correctionId, feedback, apiBaseUrl);
      
      if (result.rule_created) {
        // Show success state
        hapticNotification('success');
        setSuccessMessage(result.rule_title || 'Neue Regel gelernt');
        setShowSuccess(true);
        
        // Wait for animation, then complete
        setTimeout(() => {
          setShowSuccess(false);
          onComplete(feedback, true, result.rule_title);
          onClose();
        }, 1800);
      } else {
        // No rule created, just close
        hapticImpact('light');
        onComplete(feedback, false);
        onClose();
      }
    } catch (err) {
      console.error('Feedback error:', err);
      hapticNotification('error');
      setError('Fehler beim Speichern. Bitte versuche es erneut.');
      setSelectedOption(null);
    } finally {
      setIsLoading(false);
    }
  }, [correctionId, apiBaseUrl, onComplete, onClose]);
  
  const handleClose = useCallback(() => {
    hapticImpact('light');
    onClose();
  }, [onClose]);
  
  // Truncate text for preview
  const truncate = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>
      
      {/* Modal Content */}
      <Animated.View 
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={styles.modal}>
          {/* Handle */}
          <View style={styles.handle} />
          
          {showSuccess ? (
            // ========== SUCCESS STATE ==========
            <Animated.View 
              style={[
                styles.successContainer,
                { transform: [{ scale: successScale }] }
              ]}
            >
              <View style={styles.successIcon}>
                <Text style={styles.successEmoji}>✅</Text>
              </View>
              <Text style={styles.successTitle}>Gelernt! 🧠</Text>
              <Text style={styles.successText}>
                {successMessage || 'Ich werde das ab jetzt beachten.'}
              </Text>
            </Animated.View>
          ) : (
            <>
              {/* ========== HEADER ========== */}
              <View style={styles.header}>
                <View style={styles.emojiContainer}>
                  <Text style={styles.emoji}>🧠</Text>
                </View>
                <Text style={styles.title}>Du hast den Text angepasst</Text>
                <Text style={styles.subtitle}>
                  Soll ich daraus für die Zukunft lernen?
                </Text>
              </View>
              
              {/* ========== CHANGE SUMMARY ========== */}
              {changeSummary.length > 0 && (
                <View style={styles.changeSummary}>
                  {changeSummary.slice(0, 3).map((change, index) => (
                    <View key={index} style={styles.changeItem}>
                      <Text style={styles.changeBullet}>•</Text>
                      <Text style={styles.changeText}>{change}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* ========== PREVIEW ========== */}
              <View style={styles.preview}>
                <View style={styles.previewBox}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewIcon}>❌</Text>
                    <Text style={styles.previewLabel}>Mein Vorschlag</Text>
                  </View>
                  <Text style={styles.previewText} numberOfLines={2}>
                    {truncate(originalText)}
                  </Text>
                </View>
                
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrowIcon}>↓</Text>
                </View>
                
                <View style={[styles.previewBox, styles.previewBoxGood]}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewIcon}>✅</Text>
                    <Text style={styles.previewLabel}>Deine Version</Text>
                  </View>
                  <Text style={styles.previewText} numberOfLines={2}>
                    {truncate(correctedText)}
                  </Text>
                </View>
              </View>
              
              {/* ========== SUGGESTED RULE PREVIEW ========== */}
              {suggestedRule && (
                <View style={styles.rulePreview}>
                  <View style={styles.rulePreviewHeader}>
                    <Text style={styles.rulePreviewIcon}>💡</Text>
                    <Text style={styles.rulePreviewLabel}>Was ich lernen würde:</Text>
                  </View>
                  <Text style={styles.rulePreviewText}>
                    "{suggestedRule.instruction}"
                  </Text>
                  {suggestedRule.confidence && suggestedRule.confidence > 0.7 && (
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(suggestedRule.confidence * 100)}% sicher
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* ========== ERROR MESSAGE ========== */}
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              
              {/* ========== LOADING STATE ========== */}
              {isLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={styles.loadingText}>
                    {selectedOption === 'ignore' ? 'Wird übersprungen...' : 'Lerne...'}
                  </Text>
                </View>
              ) : (
                /* ========== OPTIONS ========== */
                <View style={styles.options}>
                  {/* Personal Option */}
                  <TouchableOpacity
                    style={[
                      styles.option,
                      styles.optionPersonal,
                      selectedOption === 'personal' && styles.optionSelected,
                    ]}
                    onPress={() => handleSelect('personal')}
                    activeOpacity={0.8}
                    disabled={isLoading}
                  >
                    <View style={styles.optionIcon}>
                      <Text style={styles.optionEmoji}>👤</Text>
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>Nur für mich</Text>
                      <Text style={styles.optionDesc}>
                        Merk dir das für meine Nachrichten
                      </Text>
                    </View>
                    <Text style={styles.optionArrow}>›</Text>
                  </TouchableOpacity>
                  
                  {/* Team Option */}
                  <TouchableOpacity
                    style={[
                      styles.option,
                      styles.optionTeam,
                      selectedOption === 'team' && styles.optionSelected,
                    ]}
                    onPress={() => handleSelect('team')}
                    activeOpacity={0.8}
                    disabled={isLoading}
                  >
                    <View style={styles.optionIcon}>
                      <Text style={styles.optionEmoji}>👥</Text>
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>Fürs Team teilen</Text>
                      <Text style={styles.optionDesc}>
                        Das ganze Team profitiert davon
                      </Text>
                    </View>
                    <Text style={styles.optionArrow}>›</Text>
                  </TouchableOpacity>
                  
                  {/* Ignore Option */}
                  <TouchableOpacity
                    style={[
                      styles.option,
                      styles.optionIgnore,
                      selectedOption === 'ignore' && styles.optionSelected,
                    ]}
                    onPress={() => handleSelect('ignore')}
                    activeOpacity={0.8}
                    disabled={isLoading}
                  >
                    <View style={styles.optionIcon}>
                      <Text style={styles.optionEmoji}>🚫</Text>
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, styles.optionTitleMuted]}>
                        Ignorieren
                      </Text>
                      <Text style={styles.optionDesc}>
                        War nur dieses eine Mal anders
                      </Text>
                    </View>
                    <Text style={styles.optionArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* ========== LATER BUTTON ========== */}
              <TouchableOpacity 
                style={styles.laterButton} 
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={[styles.laterText, isLoading && styles.laterTextDisabled]}>
                  Später entscheiden
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    minHeight: 400,
    maxWidth: SCREEN_WIDTH,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  // Change Summary
  changeSummary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  changeBullet: {
    color: '#6B7280',
    marginRight: 8,
    fontSize: 14,
  },
  changeText: {
    color: '#374151',
    fontSize: 13,
    flex: 1,
  },
  
  // Preview
  preview: {
    marginBottom: 16,
  },
  previewBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  previewBoxGood: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  previewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  
  // Rule Preview
  rulePreview: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  rulePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rulePreviewIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  rulePreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  rulePreviewText: {
    fontSize: 14,
    color: '#78350F',
    fontStyle: 'italic',
  },
  confidenceBadge: {
    backgroundColor: '#FDE68A',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  
  // Error
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Loading
  loading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  
  // Options
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionPersonal: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  optionTeam: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  optionIgnore: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  optionSelected: {
    borderWidth: 3,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  optionTitleMuted: {
    color: '#6B7280',
  },
  optionDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  optionArrow: {
    fontSize: 24,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  
  // Later Button
  laterButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  laterText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  laterTextDisabled: {
    opacity: 0.5,
  },
  
  // Success State
  successContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successEmoji: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default TeachFeedbackModal;
