/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  BUYER TYPE INDICATOR BADGE                                                ║
 * ║  DISC-basierte Buyer Type Anzeige                                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BuyerType,
  BuyingStage,
  BUYER_TYPE_LABELS,
  BUYER_TYPE_COLORS,
  BUYING_STAGE_LABELS,
} from '../../types/salesIntelligence';

interface BuyerTypeBadgeProps {
  buyerType?: BuyerType;
  buyingStage?: BuyingStage;
  confidence?: number;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

interface BuyerTypeDetailProps {
  buyerType: BuyerType;
}

const BUYER_TYPE_INFO: Record<BuyerType, {
  emoji: string;
  name: string;
  description: string;
  traits: string[];
  doList: string[];
  dontList: string[];
  idealPitch: string;
}> = {
  [BuyerType.ANALYTICAL]: {
    emoji: '🧮',
    name: 'Analytiker',
    description: 'Datengetrieben, recherchiert ausgiebig, entscheidet langsam aber gründlich.',
    traits: ['Braucht Fakten & Beweise', 'Stellt viele detaillierte Fragen', 'Vermeidet Risiko'],
    doList: ['Zahlen und Statistiken liefern', 'Studien zitieren', 'Zeit zum Nachdenken geben'],
    dontList: ['Druck machen', 'Emotionale Appelle', 'Schnelle Entscheidung fordern'],
    idealPitch: 'ROI-Kalkulation, Fallstudien, Risikoanalyse',
  },
  [BuyerType.DRIVER]: {
    emoji: '🎯',
    name: 'Macher',
    description: 'Ergebnisorientiert, entscheidet schnell, will Kontrolle.',
    traits: ['Will schnelle Ergebnisse', 'Fokus auf Bottom Line', 'Keine langen Erklärungen'],
    doList: ['Direkt auf den Punkt kommen', 'Ergebnisse fokussieren', 'Schnell antworten'],
    dontList: ['Zu viele Details', 'Zögern', 'Lange Nachrichten'],
    idealPitch: 'Kurz, knackig, ROI im ersten Satz',
  },
  [BuyerType.EXPRESSIVE]: {
    emoji: '✨',
    name: 'Visionär',
    description: 'Emotional, liebt Geschichten, entscheidet aus dem Bauch.',
    traits: ['Reagiert auf Emotionen', 'Liebt Storytelling', 'Will Teil von etwas sein'],
    doList: ['Geschichten erzählen', 'Vision malen', 'Begeisterung zeigen'],
    dontList: ['Zu trocken sein', 'Nur Daten präsentieren', 'Begeisterung dämpfen'],
    idealPitch: 'Story first, Vision malen, Testimonials',
  },
  [BuyerType.AMIABLE]: {
    emoji: '🤝',
    name: 'Beziehungsmensch',
    description: 'Beziehungsorientiert, braucht Vertrauen, vermeidet Konflikte.',
    traits: ['Beziehung wichtiger als Produkt', 'Braucht Vertrauen', 'Fragt andere um Rat'],
    doList: ['Beziehung aufbauen', 'Empathie zeigen', 'Geduldig sein'],
    dontList: ['Druck machen', 'Zu schnell zum Geschäft', 'Konfrontativ sein'],
    idealPitch: 'Beziehung first, Sicherheit, Unterstützung',
  },
};

const BuyerTypeDetail: React.FC<BuyerTypeDetailProps> = ({ buyerType }) => {
  const info = BUYER_TYPE_INFO[buyerType];
  const color = BUYER_TYPE_COLORS[buyerType];

  return (
    <ScrollView style={styles.detailContainer} showsVerticalScrollIndicator={false}>
      <View style={[styles.detailHeader, { backgroundColor: color + '20' }]}>
        <Text style={styles.detailEmoji}>{info.emoji}</Text>
        <Text style={[styles.detailTitle, { color }]}>{info.name}</Text>
      </View>

      <Text style={styles.detailDescription}>{info.description}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Eigenschaften</Text>
        {info.traits.map((trait, index) => (
          <View key={index} style={styles.traitItem}>
            <Text style={styles.traitBullet}>•</Text>
            <Text style={styles.traitText}>{trait}</Text>
          </View>
        ))}
      </View>

      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <Text style={[styles.sectionTitle, { color: '#10B981' }]}>✅ Do</Text>
          {info.doList.map((item, index) => (
            <Text key={index} style={styles.listItem}>{item}</Text>
          ))}
        </View>
        <View style={styles.column}>
          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>❌ Don't</Text>
          {info.dontList.map((item, index) => (
            <Text key={index} style={styles.listItem}>{item}</Text>
          ))}
        </View>
      </View>

      <View style={[styles.pitchBox, { borderColor: color }]}>
        <Text style={styles.pitchLabel}>Idealer Pitch</Text>
        <Text style={styles.pitchText}>{info.idealPitch}</Text>
      </View>
    </ScrollView>
  );
};

export const BuyerTypeBadge: React.FC<BuyerTypeBadgeProps> = ({
  buyerType,
  buyingStage,
  confidence,
  showDetails = true,
  size = 'medium',
  onPress,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  if (!buyerType) {
    return (
      <View style={[styles.badge, styles.unknownBadge, styles[`badge_${size}`]]}>
        <Text style={styles.unknownEmoji}>❓</Text>
        <Text style={styles.unknownText}>Nicht erkannt</Text>
      </View>
    );
  }

  const info = BUYER_TYPE_INFO[buyerType];
  const color = BUYER_TYPE_COLORS[buyerType];

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (showDetails) {
      setModalVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.badge,
          styles[`badge_${size}`],
          { backgroundColor: color + '20', borderColor: color },
        ]}
        onPress={handlePress}
        disabled={!showDetails && !onPress}
      >
        <Text style={[styles.emoji, styles[`emoji_${size}`]]}>{info.emoji}</Text>
        <View style={styles.badgeContent}>
          <Text style={[styles.typeName, styles[`typeName_${size}`], { color }]}>
            {info.name}
          </Text>
          {buyingStage && size !== 'small' && (
            <Text style={styles.stageName}>
              {BUYING_STAGE_LABELS[buyingStage]}
            </Text>
          )}
        </View>
        {confidence !== undefined && size !== 'small' && (
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceText}>{Math.round(confidence * 100)}%</Text>
          </View>
        )}
        {showDetails && (
          <Ionicons name="information-circle-outline" size={size === 'small' ? 14 : 18} color={color} />
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable 
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buyer Type</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <BuyerTypeDetail buyerType={buyerType} />
          </View>
        </View>
      </Modal>
    </>
  );
};

// Compact version for inline use
export const BuyerTypeIndicator: React.FC<{
  buyerType: BuyerType;
  showLabel?: boolean;
}> = ({ buyerType, showLabel = true }) => {
  const info = BUYER_TYPE_INFO[buyerType];
  const color = BUYER_TYPE_COLORS[buyerType];

  return (
    <View style={[styles.indicator, { backgroundColor: color + '15' }]}>
      <Text style={styles.indicatorEmoji}>{info.emoji}</Text>
      {showLabel && (
        <Text style={[styles.indicatorLabel, { color }]}>{info.name}</Text>
      )}
    </View>
  );
};

// Grid of all buyer types for selection
export const BuyerTypeGrid: React.FC<{
  selected?: BuyerType;
  onSelect: (type: BuyerType) => void;
}> = ({ selected, onSelect }) => {
  return (
    <View style={styles.grid}>
      {Object.values(BuyerType).map((type) => {
        const info = BUYER_TYPE_INFO[type];
        const color = BUYER_TYPE_COLORS[type];
        const isSelected = type === selected;

        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.gridItem,
              { borderColor: isSelected ? color : '#374151' },
              isSelected && { backgroundColor: color + '20' },
            ]}
            onPress={() => onSelect(type)}
          >
            <Text style={styles.gridEmoji}>{info.emoji}</Text>
            <Text style={[styles.gridName, isSelected && { color }]}>
              {info.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  // Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  badge_small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badge_medium: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badge_large: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unknownBadge: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  unknownEmoji: {
    fontSize: 16,
  },
  unknownText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emoji: {},
  emoji_small: {
    fontSize: 14,
  },
  emoji_medium: {
    fontSize: 20,
  },
  emoji_large: {
    fontSize: 28,
  },
  badgeContent: {
    flex: 1,
  },
  typeName: {
    fontWeight: '600',
  },
  typeName_small: {
    fontSize: 12,
  },
  typeName_medium: {
    fontSize: 14,
  },
  typeName_large: {
    fontSize: 16,
  },
  stageName: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  confidenceContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Indicator styles
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  indicatorEmoji: {
    fontSize: 14,
  },
  indicatorLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Grid styles
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#1F2937',
  },
  gridEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  gridName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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

  // Detail styles
  detailContainer: {
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  detailEmoji: {
    fontSize: 40,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  detailDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  traitItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  traitBullet: {
    color: '#6B7280',
    marginRight: 8,
  },
  traitText: {
    fontSize: 14,
    color: '#D1D5DB',
    flex: 1,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  column: {
    flex: 1,
  },
  listItem: {
    fontSize: 13,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  pitchBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#1F2937',
  },
  pitchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  pitchText: {
    fontSize: 14,
    color: '#F9FAFB',
    fontStyle: 'italic',
  },
});

export default BuyerTypeBadge;

