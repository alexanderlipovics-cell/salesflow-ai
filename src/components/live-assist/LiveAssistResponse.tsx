/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  LIVE ASSIST RESPONSE                                                      ║
 * ║  Zeigt eine Live Assist Antwort an                                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import type { LiveAssistResponseProps } from '../../types/liveAssist';

// Intent to emoji mapping
const INTENT_ICONS: Record<string, string> = {
  objection: '🛡️',
  facts: '📊',
  usp: '💪',
  product_info: '📦',
  science: '🔬',
  pricing: '💰',
  comparison: '🆚',
  story: '📖',
  quick_answer: '💬',
  unknown: '❓',
};

// Technique to label mapping
const TECHNIQUE_LABELS: Record<string, string> = {
  reduce_to_daily: 'Auf Tag runterbrechen',
  compare_value: 'Wertvergleich',
  question_back: 'Gegenfrage',
  empathize_then_pivot: 'Verständnis + Pivot',
  social_proof: 'Social Proof',
  reframe: 'Reframing',
  future_pace: 'Zukunftsbild',
  takeaway: 'Takeaway',
};

export function LiveAssistResponse({
  response,
  onCopy,
  onSpeak,
  onFeedback,
}: LiveAssistResponseProps) {
  const intentIcon = INTENT_ICONS[response.detected_intent] || '💬';
  const techniqueLabel = response.response_technique 
    ? TECHNIQUE_LABELS[response.response_technique] 
    : null;
  
  const handleCopy = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setString(response.response_text);
    onCopy?.();
  };
  
  const handleSpeak = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const textToSpeak = response.response_short || response.response_text;
    Speech.speak(textToSpeak, {
      language: 'de-DE',
      rate: 0.9,
    });
    onSpeak?.();
  };
  
  const handleFeedback = (helpful: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFeedback?.(helpful);
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.intentIcon}>{intentIcon}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.intentLabel}>
            {response.detected_intent.replace(/_/g, ' ').toUpperCase()}
          </Text>
          {techniqueLabel && (
            <Text style={styles.technique}>• {techniqueLabel}</Text>
          )}
        </View>
        <Text style={styles.timing}>{response.response_time_ms}ms</Text>
      </View>
      
      {/* Main Response */}
      <Text style={styles.responseText}>{response.response_text}</Text>
      
      {/* Follow-up Question */}
      {response.follow_up_question && (
        <View style={styles.followUpContainer}>
          <Ionicons name="help-circle-outline" size={16} color="#F59E0B" />
          <Text style={styles.followUpText}>{response.follow_up_question}</Text>
        </View>
      )}
      
      {/* Objection Badge */}
      {response.objection_type && (
        <View style={styles.objectionBadge}>
          <Text style={styles.objectionBadgeText}>
            Einwand: {response.objection_type.replace(/_/g, ' ')}
          </Text>
        </View>
      )}
      
      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleCopy}
        >
          <Ionicons name="copy-outline" size={18} color="#9CA3AF" />
          <Text style={styles.actionText}>Kopieren</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleSpeak}
        >
          <Ionicons name="volume-high-outline" size={18} color="#9CA3AF" />
          <Text style={styles.actionText}>Vorlesen</Text>
        </TouchableOpacity>
        
        <View style={styles.feedbackContainer}>
          <TouchableOpacity 
            style={styles.feedbackButton}
            onPress={() => handleFeedback(true)}
          >
            <Ionicons name="thumbs-up-outline" size={16} color="#22C55E" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.feedbackButton}
            onPress={() => handleFeedback(false)}
          >
            <Ionicons name="thumbs-down-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Source Info */}
      <Text style={styles.sourceInfo}>
        Quelle: {response.source.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  intentIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  intentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
    letterSpacing: 0.5,
  },
  technique: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  timing: {
    fontSize: 10,
    color: '#6B7280',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  responseText: {
    fontSize: 15,
    color: '#F3F4F6',
    lineHeight: 22,
    marginBottom: 12,
  },
  followUpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  followUpText: {
    fontSize: 13,
    color: '#F59E0B',
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
  },
  objectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  objectionBadgeText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 163, 175, 0.1)',
    paddingTop: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  feedbackContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  feedbackButton: {
    padding: 6,
    marginLeft: 8,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderRadius: 8,
  },
  sourceInfo: {
    fontSize: 10,
    color: '#4B5563',
    marginTop: 8,
    textAlign: 'right',
    textTransform: 'capitalize',
  },
});

export default LiveAssistResponse;

