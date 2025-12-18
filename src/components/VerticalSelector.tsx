/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  VERTICAL SELECTOR COMPONENT                                                ║
 * ║  Auswahl des Verticals (Network Marketing, Field Sales, etc.)               ║
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
} from 'react-native';
import { AURA_COLORS, AURA_SHADOWS } from './aura';
import {
  VERTICALS,
  VerticalId,
  getVerticalConfig,
  VERTICAL_LIST,
} from '../config/verticals/VerticalContext';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

interface VerticalSelectorProps {
  currentVertical: VerticalId;
  onVerticalChange?: (vertical: VerticalId) => void;
}

export const VerticalSelector: React.FC<VerticalSelectorProps> = ({
  currentVertical,
  onVerticalChange,
}) => {
  const { user, profile, refreshProfile } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentConfig = getVerticalConfig(currentVertical);

  const handleSelectVertical = async (verticalId: VerticalId) => {
    if (verticalId === currentVertical) {
      setModalVisible(false);
      return;
    }

    setSaving(true);
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ vertical: verticalId })
        .eq('id', user?.id);

      if (error) throw error;

      // Refresh Profile
      await refreshProfile?.();

      // Callback
      onVerticalChange?.(verticalId);

      setModalVisible(false);
    } catch (error) {
      console.error('Error updating vertical:', error);
      alert('Fehler beim Speichern des Verticals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <Text style={styles.selectorIcon}>{currentConfig.icon}</Text>
          <View style={styles.selectorTextContainer}>
            <Text style={styles.selectorLabel}>Vertical</Text>
            <Text style={styles.selectorValue}>{currentConfig.name}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
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
              <Text style={styles.modalTitle}>Vertical auswählen</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {VERTICAL_LIST.map((vertical) => {
                const isSelected = vertical.id === currentVertical;
                return (
                  <TouchableOpacity
                    key={vertical.id}
                    style={[
                      styles.verticalOption,
                      isSelected && styles.verticalOptionSelected,
                    ]}
                    onPress={() => handleSelectVertical(vertical.id)}
                    disabled={saving}
                  >
                    <View style={styles.verticalOptionContent}>
                      <Text style={styles.verticalOptionIcon}>
                        {vertical.icon}
                      </Text>
                      <View style={styles.verticalOptionText}>
                        <Text
                          style={[
                            styles.verticalOptionName,
                            isSelected && styles.verticalOptionNameSelected,
                          ]}
                        >
                          {vertical.name}
                        </Text>
                        <Text style={styles.verticalOptionDescription}>
                          {vertical.description}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AURA_COLORS.surface.primary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    ...AURA_SHADOWS.sm,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  chevron: {
    fontSize: 20,
    color: AURA_COLORS.text.secondary,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AURA_COLORS.surface.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    ...AURA_SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.border.subtle,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AURA_COLORS.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: AURA_COLORS.text.primary,
  },
  modalScrollView: {
    padding: 16,
  },
  verticalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  verticalOptionSelected: {
    backgroundColor: AURA_COLORS.accent.primary + '20',
    borderWidth: 2,
    borderColor: AURA_COLORS.accent.primary,
  },
  verticalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  verticalOptionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  verticalOptionText: {
    flex: 1,
  },
  verticalOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  verticalOptionNameSelected: {
    color: AURA_COLORS.accent.primary,
  },
  verticalOptionDescription: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
    lineHeight: 16,
  },
  checkmark: {
    fontSize: 20,
    color: AURA_COLORS.accent.primary,
    marginLeft: 8,
  },
});

