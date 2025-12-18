/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL SELECTOR                                        ║
 * ║  Komponente zur Branchenauswahl                                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useVerticalSelector, VERTICALS } from '../hooks/useVertical';

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL SELECTOR BUTTON (Kompakt)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Kompakter Button zum Öffnen des Vertical-Selectors
 */
export const VerticalSelectorButton = ({ onPress, vertical, style }) => {
  return (
    <TouchableOpacity
      style={[styles.selectorButton, { borderColor: vertical.color + '50' }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.selectorIcon}>{vertical.icon}</Text>
      <Text style={styles.selectorLabel}>{vertical.label}</Text>
      <Text style={styles.selectorChevron}>▼</Text>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL SELECTOR MODAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Modal für die Branchenauswahl
 */
export const VerticalSelectorModal = ({ 
  visible, 
  onClose, 
  onSelect, 
  selectedId,
  isLoading 
}) => {
  const verticals = Object.values(VERTICALS).filter(v => v.id !== 'custom');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏢 Branche auswählen</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Wähle deine Branche für personalisierte Tipps und Einwandbehandlung
          </Text>

          {/* Vertical List */}
          <ScrollView style={styles.verticalList} showsVerticalScrollIndicator={false}>
            {verticals.map((vertical) => {
              const isSelected = vertical.id === selectedId;
              
              return (
                <TouchableOpacity
                  key={vertical.id}
                  style={[
                    styles.verticalOption,
                    isSelected && { 
                      backgroundColor: vertical.color + '15',
                      borderColor: vertical.color,
                    },
                  ]}
                  onPress={() => onSelect(vertical.id)}
                  disabled={isLoading}
                >
                  <View style={styles.verticalOptionLeft}>
                    <Text style={styles.verticalIcon}>{vertical.icon}</Text>
                    <View style={styles.verticalInfo}>
                      <Text style={[
                        styles.verticalName,
                        isSelected && { color: vertical.color }
                      ]}>
                        {vertical.label}
                      </Text>
                      <Text style={styles.verticalDescription}>
                        {vertical.description}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkmark, { backgroundColor: vertical.color }]}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#06b6d4" />
              <Text style={styles.loadingText}>Speichern...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL SELECTOR (Combined)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Kompletter Vertical Selector mit Button und Modal
 * 
 * @example
 * <VerticalSelector />
 */
const VerticalSelector = ({ style }) => {
  const { selected, options, select, isLoading } = useVerticalSelector();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = async (verticalId) => {
    try {
      await select(verticalId);
      setModalVisible(false);
    } catch (error) {
      console.error('Failed to select vertical:', error);
    }
  };

  return (
    <>
      <VerticalSelectorButton
        vertical={selected}
        onPress={() => setModalVisible(true)}
        style={style}
      />
      <VerticalSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelect}
        selectedId={selected.id}
        isLoading={isLoading}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL BADGE (Für Header/Dashboard)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Kleines Badge für die aktuelle Branche
 */
export const VerticalBadge = ({ vertical, size = 'medium', onPress }) => {
  const sizes = {
    small: { icon: 14, label: 10, padding: 4 },
    medium: { icon: 16, label: 11, padding: 6 },
    large: { icon: 20, label: 13, padding: 8 },
  };
  const s = sizes[size];

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component 
      style={[
        styles.badge,
        { 
          backgroundColor: vertical.color + '15',
          borderColor: vertical.color + '30',
          paddingHorizontal: s.padding * 2,
          paddingVertical: s.padding,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.badgeIcon, { fontSize: s.icon }]}>{vertical.icon}</Text>
      <Text style={[styles.badgeLabel, { fontSize: s.label, color: vertical.color }]}>
        {vertical.label}
      </Text>
    </Component>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL ONBOARDING CARD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Karte für das Vertical-Onboarding
 */
export const VerticalOnboardingCard = ({ onSelect }) => {
  const verticals = Object.values(VERTICALS).filter(v => v.id !== 'custom').slice(0, 4);

  return (
    <View style={styles.onboardingCard}>
      <Text style={styles.onboardingTitle}>🏢 In welcher Branche bist du tätig?</Text>
      <Text style={styles.onboardingSubtitle}>
        Wähle deine Branche für personalisierte Unterstützung
      </Text>
      <View style={styles.onboardingGrid}>
        {verticals.map((vertical) => (
          <TouchableOpacity
            key={vertical.id}
            style={styles.onboardingOption}
            onPress={() => onSelect(vertical.id)}
          >
            <View style={[styles.onboardingIconCircle, { backgroundColor: vertical.color + '20' }]}>
              <Text style={styles.onboardingIcon}>{vertical.icon}</Text>
            </View>
            <Text style={styles.onboardingLabel}>{vertical.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Selector Button
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  selectorIcon: {
    fontSize: 16,
  },
  selectorLabel: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '500',
  },
  selectorChevron: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Vertical List
  verticalList: {
    paddingHorizontal: 16,
  },
  verticalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  verticalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  verticalIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  verticalInfo: {
    flex: 1,
  },
  verticalName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 2,
  },
  verticalDescription: {
    fontSize: 12,
    color: '#94a3b8',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },

  // Loading
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  badgeIcon: {
    // fontSize set dynamically
  },
  badgeLabel: {
    fontWeight: '600',
  },

  // Onboarding Card
  onboardingCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  onboardingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 8,
  },
  onboardingSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 20,
  },
  onboardingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  onboardingOption: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  onboardingIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  onboardingIcon: {
    fontSize: 28,
  },
  onboardingLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#f8fafc',
    textAlign: 'center',
  },
});

export default VerticalSelector;

