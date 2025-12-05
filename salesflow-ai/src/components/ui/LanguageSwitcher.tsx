/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  LANGUAGE SWITCHER                                                        ║
 * ║  Minimalistischer, eleganter Sprach-Toggle im AURA OS Design             ║
 * ║  Unterstützt: DE | EN | ES                                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  getCurrentLanguage,
  getAvailableLanguages,
  type SupportedLanguage,
} from '../../i18n';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  variant?: 'minimal' | 'compact' | 'full';
  showFlags?: boolean;
  style?: object;
}

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE SWITCHER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function LanguageSwitcher({ 
  variant = 'minimal', 
  showFlags = false,
  style 
}: Props) {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const currentLang = getCurrentLanguage();
  const languages = getAvailableLanguages();
  
  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setModalVisible(true);
  }, [scaleAnim]);
  
  const handleSelectLanguage = useCallback(async (lang: SupportedLanguage) => {
    await changeLanguage(lang);
    setModalVisible(false);
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // MINIMAL VARIANT (nur Kürzel: DE | EN)
  // ─────────────────────────────────────────────────────────────────────────
  
  if (variant === 'minimal') {
    return (
      <>
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
          <TouchableOpacity
            onPress={handlePress}
            style={styles.minimalContainer}
            activeOpacity={0.7}
          >
            <View style={styles.minimalInner}>
              <Text style={styles.minimalText}>
                {SUPPORTED_LANGUAGES[currentLang].nativeLabel}
              </Text>
              <View style={styles.minimalDivider} />
              <Text style={styles.minimalChevron}>▼</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Language Selection Modal */}
        <LanguageModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          currentLang={currentLang}
          languages={languages}
          onSelect={handleSelectLanguage}
          showFlags={showFlags}
        />
      </>
    );
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // COMPACT VARIANT (mit Flag oder Icon)
  // ─────────────────────────────────────────────────────────────────────────
  
  if (variant === 'compact') {
    return (
      <>
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
          <TouchableOpacity
            onPress={handlePress}
            style={styles.compactContainer}
            activeOpacity={0.7}
          >
            <Text style={styles.compactFlag}>
              {SUPPORTED_LANGUAGES[currentLang].flag}
            </Text>
            <Text style={styles.compactText}>
              {SUPPORTED_LANGUAGES[currentLang].nativeLabel}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        
        <LanguageModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          currentLang={currentLang}
          languages={languages}
          onSelect={handleSelectLanguage}
          showFlags={showFlags}
        />
      </>
    );
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // FULL VARIANT (horizontale Auswahl)
  // ─────────────────────────────────────────────────────────────────────────
  
  return (
    <View style={[styles.fullContainer, style]}>
      {languages.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          onPress={() => handleSelectLanguage(lang.code)}
          style={[
            styles.fullButton,
            currentLang === lang.code && styles.fullButtonActive,
          ]}
          activeOpacity={0.7}
        >
          {showFlags && <Text style={styles.fullFlag}>{lang.flag}</Text>}
          <Text style={[
            styles.fullText,
            currentLang === lang.code && styles.fullTextActive,
          ]}>
            {lang.nativeLabel}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LANGUAGE SELECTION MODAL
// ═══════════════════════════════════════════════════════════════════════════

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  currentLang: SupportedLanguage;
  languages: Array<{ code: SupportedLanguage; label: string; nativeLabel: string; flag: string }>;
  onSelect: (lang: SupportedLanguage) => void;
  showFlags: boolean;
}

function LanguageModal({
  visible,
  onClose,
  currentLang,
  languages,
  onSelect,
  showFlags,
}: ModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.modalGradient}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🌍</Text>
              <Text style={styles.modalSubtitle}>Select Language</Text>
            </View>
            
            {/* Language Options */}
            <View style={styles.modalOptions}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => onSelect(lang.code)}
                  style={[
                    styles.modalOption,
                    currentLang === lang.code && styles.modalOptionActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={styles.modalOptionFlag}>{lang.flag}</Text>
                    <View style={styles.modalOptionText}>
                      <Text style={styles.modalOptionLabel}>{lang.label}</Text>
                      <Text style={styles.modalOptionNative}>{lang.nativeLabel}</Text>
                    </View>
                  </View>
                  
                  {currentLang === lang.code && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Subtle brand footer */}
            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterText}>AURA OS • Global Edition</Text>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE LANGUAGE TOGGLE (für Header)
// ═══════════════════════════════════════════════════════════════════════════

interface InlineProps {
  style?: object;
}

export function InlineLanguageToggle({ style }: InlineProps) {
  const currentLang = getCurrentLanguage();
  const languages = getAvailableLanguages();
  
  const cycleLanguage = useCallback(async () => {
    const currentIndex = languages.findIndex((l) => l.code === currentLang);
    const nextIndex = (currentIndex + 1) % languages.length;
    await changeLanguage(languages[nextIndex].code);
  }, [currentLang, languages]);
  
  return (
    <TouchableOpacity
      onPress={cycleLanguage}
      style={[styles.inlineContainer, style]}
      activeOpacity={0.7}
    >
      <Text style={styles.inlineText}>
        {languages.map((lang, idx) => (
          <Text
            key={lang.code}
            style={[
              styles.inlineLang,
              currentLang === lang.code && styles.inlineLangActive,
            ]}
          >
            {lang.nativeLabel}
            {idx < languages.length - 1 ? ' | ' : ''}
          </Text>
        ))}
      </Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

// AURA OS Colors
const AURA_CYAN = '#22d3ee';
const AURA_CYAN_GLOW = 'rgba(34, 211, 238, 0.3)';
const AURA_CYAN_SUBTLE = 'rgba(34, 211, 238, 0.1)';

const styles = StyleSheet.create({
  // Minimal Variant
  minimalContainer: {
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: AURA_CYAN_GLOW,
  },
  minimalInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  minimalText: {
    color: AURA_CYAN,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  minimalDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  minimalChevron: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 8,
  },
  
  // Compact Variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  compactFlag: {
    fontSize: 16,
  },
  compactText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Full Variant
  fullContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  fullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  fullButtonActive: {
    backgroundColor: AURA_CYAN_SUBTLE,
    borderColor: AURA_CYAN_GLOW,
    borderWidth: 1,
  },
  fullFlag: {
    fontSize: 14,
  },
  fullText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  fullTextActive: {
    color: AURA_CYAN,
    fontWeight: '700',
  },
  
  // Inline Toggle
  inlineContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inlineText: {
    fontSize: 12,
  },
  inlineLang: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },
  inlineLangActive: {
    color: AURA_CYAN,
    fontWeight: '700',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 32,
    marginBottom: 8,
  },
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  modalOptions: {
    gap: 10,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalOptionActive: {
    backgroundColor: AURA_CYAN_SUBTLE,
    borderColor: AURA_CYAN_GLOW,
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  modalOptionFlag: {
    fontSize: 28,
  },
  modalOptionText: {
    gap: 2,
  },
  modalOptionLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOptionNative: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  checkmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AURA_CYAN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalFooter: {
    marginTop: 20,
    alignItems: 'center',
  },
  modalFooterText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default LanguageSwitcher;

