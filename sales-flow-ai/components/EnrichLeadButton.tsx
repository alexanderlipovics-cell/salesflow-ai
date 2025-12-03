import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  View
} from 'react-native';
import { apiClient } from '../services/api';

interface EnrichLeadButtonProps {
  leadId: string;
  onEnriched?: (data: any) => void;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export default function EnrichLeadButton({
  leadId,
  onEnriched,
  size = 'medium',
  fullWidth = false
}: EnrichLeadButtonProps) {
  const [enriching, setEnriching] = useState(false);

  const handleEnrich = async () => {
    setEnriching(true);

    try {
      const response = await apiClient.post(
        `/enrichment/enrich/${leadId}?enrichment_type=full`
      );

      const result = response.data;

      if (result.success && result.enriched_fields.length > 0) {
        Alert.alert(
          '✅ Lead Enriched!',
          `Found ${result.enriched_fields.length} new fields:\n\n${result.enriched_fields.join('\n')}`,
          [
            {
              text: 'View Changes',
              onPress: () => onEnriched?.(result.data)
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert(
          'ℹ️ No Additional Data',
          'Could not find more information for this lead at this time.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Enrichment error:', error);
      Alert.alert(
        '❌ Error',
        error.response?.data?.detail || 'Failed to enrich lead. Please try again.'
      );
    } finally {
      setEnriching(false);
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingHorizontal: 12, paddingVertical: 6 };
      case 'large':
        return { paddingHorizontal: 24, paddingVertical: 14 };
      default:
        return { paddingHorizontal: 16, paddingVertical: 10 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getSizeStyles(),
        fullWidth && styles.fullWidth
      ]}
      onPress={handleEnrich}
      disabled={enriching}
      activeOpacity={0.7}
    >
      {enriching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#007AFF" size="small" />
          <Text style={[styles.buttonText, size === 'small' && styles.smallText]}>
            Enriching...
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={[styles.icon, { fontSize: getIconSize() }]}>🔍</Text>
          <Text style={[styles.buttonText, size === 'small' && styles.smallText]}>
            Auto-Enrich
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  smallText: {
    fontSize: 12,
  },
});

