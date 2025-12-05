/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  LANGUAGE SELECTOR DROPDOWN                                                ║
 * ║  Multi-Language Auswahl für Sales Intelligence v3.0                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageCode, LANGUAGE_LABELS } from '../../types/salesIntelligence';

interface LanguageSelectorProps {
  selectedLanguage: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  compact?: boolean;
  showDetectedBadge?: boolean;
  detectedLanguage?: LanguageCode;
}

interface LanguageOption {
  code: LanguageCode;
  label: string;
  flag: string;
  region?: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: LanguageCode.DE, label: 'Deutsch', flag: '🇩🇪', region: 'Deutschland' },
  { code: LanguageCode.DE_AT, label: 'Österreichisch', flag: '🇦🇹', region: 'Österreich' },
  { code: LanguageCode.DE_CH, label: 'Schweizerdeutsch', flag: '🇨🇭', region: 'Schweiz' },
  { code: LanguageCode.EN_US, label: 'English', flag: '🇺🇸', region: 'USA' },
  { code: LanguageCode.EN_UK, label: 'English', flag: '🇬🇧', region: 'UK' },
  { code: LanguageCode.ES, label: 'Español', flag: '🇪🇸', region: 'España' },
  { code: LanguageCode.ES_LATAM, label: 'Español', flag: '🌎', region: 'Latinoamérica' },
  { code: LanguageCode.FR, label: 'Français', flag: '🇫🇷', region: 'France' },
  { code: LanguageCode.IT, label: 'Italiano', flag: '🇮🇹', region: 'Italia' },
  { code: LanguageCode.PT, label: 'Português', flag: '🇵🇹', region: 'Portugal' },
  { code: LanguageCode.NL, label: 'Nederlands', flag: '🇳🇱', region: 'Nederland' },
  { code: LanguageCode.PL, label: 'Polski', flag: '🇵🇱', region: 'Polska' },
  { code: LanguageCode.TR, label: 'Türkçe', flag: '🇹🇷', region: 'Türkiye' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  compact = false,
  showDetectedBadge = false,
  detectedLanguage,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const currentOption = LANGUAGE_OPTIONS.find(opt => opt.code === selectedLanguage) 
    || LANGUAGE_OPTIONS[0];

  const handleSelect = (language: LanguageCode) => {
    onLanguageChange(language);
    setModalVisible(false);
  };

  const renderLanguageItem = ({ item }: { item: LanguageOption }) => {
    const isSelected = item.code === selectedLanguage;
    const isDetected = showDetectedBadge && item.code === detectedLanguage;

    return (
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.languageItemSelected]}
        onPress={() => handleSelect(item.code)}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <View style={styles.languageInfo}>
          <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
            {item.label}
          </Text>
          {item.region && (
            <Text style={styles.languageRegion}>{item.region}</Text>
          )}
        </View>
        {isDetected && (
          <View style={styles.detectedBadge}>
            <Ionicons name="sparkles" size={12} color="#F59E0B" />
            <Text style={styles.detectedText}>Erkannt</Text>
          </View>
        )}
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color="#10B981" />
        )}
      </TouchableOpacity>
    );
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.compactFlag}>{currentOption.flag}</Text>
        <Ionicons name="chevron-down" size={14} color="#9CA3AF" />

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable 
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.compactDropdown}>
              {LANGUAGE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.code}
                  style={[
                    styles.compactItem,
                    opt.code === selectedLanguage && styles.compactItemSelected,
                  ]}
                  onPress={() => handleSelect(opt.code)}
                >
                  <Text style={styles.compactItemFlag}>{opt.flag}</Text>
                  <Text style={styles.compactItemLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectorFlag}>{currentOption.flag}</Text>
        <View style={styles.selectorInfo}>
          <Text style={styles.selectorLabel}>{currentOption.label}</Text>
          {currentOption.region && (
            <Text style={styles.selectorRegion}>{currentOption.region}</Text>
          )}
        </View>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sprache wählen</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {showDetectedBadge && detectedLanguage && (
              <View style={styles.detectedHint}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" />
                <Text style={styles.detectedHintText}>
                  Automatisch erkannt: {LANGUAGE_LABELS[detectedLanguage]}
                </Text>
              </View>
            )}

            <FlatList
              data={LANGUAGE_OPTIONS}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              style={styles.languageList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  selectorFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  selectorInfo: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  selectorRegion: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  
  // Compact styles
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  compactFlag: {
    fontSize: 18,
  },
  compactDropdown: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  compactItemSelected: {
    backgroundColor: '#374151',
  },
  compactItemFlag: {
    fontSize: 18,
  },
  compactItemLabel: {
    fontSize: 14,
    color: '#F9FAFB',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  detectedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  detectedHintText: {
    fontSize: 14,
    color: '#FDE68A',
  },
  languageList: {
    padding: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#1F2937',
  },
  languageItemSelected: {
    backgroundColor: '#065F46',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  flag: {
    fontSize: 28,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  languageNameSelected: {
    color: '#ECFDF5',
  },
  languageRegion: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    gap: 4,
  },
  detectedText: {
    fontSize: 11,
    color: '#FDE68A',
    fontWeight: '600',
  },
});

export default LanguageSelector;

