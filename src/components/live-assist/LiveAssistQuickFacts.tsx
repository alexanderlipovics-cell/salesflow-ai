/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  LIVE ASSIST QUICK FACTS                                                   ║
 * ║  Zeigt Quick Facts für schnellen Zugriff                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { LiveAssistQuickFactsProps, QuickFactItem } from '../../types/liveAssist';

// Fact type to icon/color mapping
const FACT_STYLES: Record<string, { icon: string; color: string }> = {
  number: { icon: '📊', color: '#3B82F6' },
  percentage: { icon: '📈', color: '#8B5CF6' },
  comparison: { icon: '⚖️', color: '#F59E0B' },
  benefit: { icon: '✨', color: '#22C55E' },
  differentiator: { icon: '💎', color: '#EC4899' },
  social_proof: { icon: '👥', color: '#06B6D4' },
};

interface FactCardProps {
  fact: QuickFactItem;
  onPress?: () => void;
}

function FactCard({ fact, onPress }: FactCardProps) {
  const style = FACT_STYLES[fact.fact_type] || FACT_STYLES.benefit;
  
  const handleCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(fact.fact_value);
  };
  
  return (
    <TouchableOpacity 
      style={[styles.factCard, { borderLeftColor: style.color }]}
      onPress={onPress}
      onLongPress={handleCopy}
      activeOpacity={0.7}
    >
      <View style={styles.factHeader}>
        <Text style={styles.factIcon}>{style.icon}</Text>
        {fact.is_key_fact && (
          <View style={styles.keyFactBadge}>
            <Ionicons name="star" size={10} color="#F59E0B" />
          </View>
        )}
      </View>
      
      <Text style={styles.factKey}>
        {fact.fact_key.replace(/_/g, ' ')}
      </Text>
      
      <Text style={styles.factValue} numberOfLines={3}>
        {fact.fact_short || fact.fact_value}
      </Text>
      
      {fact.source && (
        <Text style={styles.factSource}>
          📚 {fact.source}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function LiveAssistQuickFacts({
  facts,
  onFactClick,
}: LiveAssistQuickFactsProps) {
  if (!facts || facts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={40} color="#4B5563" />
        <Text style={styles.emptyText}>Keine Quick Facts verfügbar</Text>
      </View>
    );
  }
  
  // Separate key facts from others
  const keyFacts = facts.filter(f => f.is_key_fact);
  const otherFacts = facts.filter(f => !f.is_key_fact);
  
  return (
    <View style={styles.container}>
      {/* Key Facts Section */}
      {keyFacts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Wichtigste Fakten</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {keyFacts.map((fact, index) => (
              <FactCard 
                key={`key-${index}`}
                fact={fact}
                onPress={() => onFactClick?.(fact)}
              />
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Other Facts Section */}
      {otherFacts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={16} color="#9CA3AF" />
            <Text style={styles.sectionTitle}>Weitere Fakten</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {otherFacts.map((fact, index) => (
              <FactCard 
                key={`other-${index}`}
                fact={fact}
                onPress={() => onFactClick?.(fact)}
              />
            ))}
          </ScrollView>
        </View>
      )}
      
      <Text style={styles.hint}>
        💡 Lange drücken zum Kopieren
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginLeft: 8,
  },
  horizontalScroll: {
    paddingHorizontal: 12,
  },
  factCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    width: 200,
    borderLeftWidth: 3,
  },
  factHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  factIcon: {
    fontSize: 20,
  },
  keyFactBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 4,
    padding: 2,
  },
  factKey: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  factValue: {
    fontSize: 13,
    color: '#F3F4F6',
    lineHeight: 18,
  },
  factSource: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 8,
  },
  hint: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default LiveAssistQuickFacts;

