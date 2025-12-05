/**
 * Language Switcher Component
 * Allows users to change app language
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface Language {
  code: string;
  name: string;
  native_name: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'de', name: 'German', native_name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', native_name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', native_name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', native_name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', native_name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch', native_name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pt', name: 'Portuguese', native_name: 'Português', flag: '🇵🇹' },
  { code: 'pl', name: 'Polish', native_name: 'Polski', flag: '🇵🇱' }
];

interface LanguageSwitcherProps {
  showLabel?: boolean;
  compact?: boolean;
  onLanguageChange?: (language: string) => void;
}

export default function LanguageSwitcher({
  showLabel = true,
  compact = false,
  onLanguageChange
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = async (languageCode: string) => {
    try {
      setUpdating(true);

      // Change language in i18next
      await i18n.changeLanguage(languageCode);

      // Update language in backend
      try {
        const response = await fetch('/api/i18n/users/language', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add auth token if available
            // 'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ language: languageCode })
        });

        if (!response.ok) {
          console.warn('Failed to update language in backend');
        }
      } catch (error) {
        console.warn('Backend language update failed:', error);
        // Don't fail the language change if backend update fails
      }

      // Callback
      if (onLanguageChange) {
        onLanguageChange(languageCode);
      }

      setModalVisible(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setUpdating(false);
    }
  };

  const renderLanguageItem = ({ item }: { item: Language }) => {
    const isSelected = item.code === currentLanguage.code;

    return (
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.languageItemSelected]}
        onPress={() => changeLanguage(item.code)}
        disabled={updating}
      >
        <Text style={styles.languageFlag}>{item.flag}</Text>
        <View style={styles.languageTextContainer}>
          <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
            {item.native_name}
          </Text>
          <Text style={styles.languageNameEn}>{item.name}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#06b6d4" />
        )}
      </TouchableOpacity>
    );
  };

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={styles.compactButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.compactButtonText}>{currentLanguage.flag}</Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('language_switcher.title')}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={LANGUAGES}
                renderItem={renderLanguageItem}
                keyExtractor={item => item.code}
                style={styles.languageList}
              />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonFlag}>{currentLanguage.flag}</Text>
        {showLabel && (
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonLabel}>{t('settings.language')}</Text>
            <Text style={styles.buttonLanguage}>{currentLanguage.native_name}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('language_switcher.title')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {updating && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#06b6d4" />
              </View>
            )}

            <FlatList
              data={LANGUAGES}
              renderItem={renderLanguageItem}
              keyExtractor={item => item.code}
              style={styles.languageList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Compact Button
  compactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center'
  },
  compactButtonText: {
    fontSize: 20
  },

  // Full Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  buttonFlag: {
    fontSize: 24,
    marginRight: 12
  },
  buttonTextContainer: {
    flex: 1
  },
  buttonLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2
  },
  buttonLanguage: {
    fontSize: 16,
    color: '#f1f5f9',
    fontWeight: '500'
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1f5f9'
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center'
  },

  // Language List
  languageList: {
    paddingTop: 8
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  languageItemSelected: {
    backgroundColor: '#1e293b'
  },
  languageFlag: {
    fontSize: 28,
    marginRight: 16
  },
  languageTextContainer: {
    flex: 1
  },
  languageName: {
    fontSize: 16,
    color: '#f1f5f9',
    fontWeight: '500',
    marginBottom: 2
  },
  languageNameSelected: {
    color: '#06b6d4',
    fontWeight: '600'
  },
  languageNameEn: {
    fontSize: 13,
    color: '#94a3b8'
  }
});

