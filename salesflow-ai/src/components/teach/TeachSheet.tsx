/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  TEACH SHEET COMPONENT                                                     ║
 * ║  Bottom Sheet für Teach-UI                                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Wird angezeigt wenn der User einen CHIEF-Vorschlag ändert.
 * Ermöglicht dem User zu entscheiden ob Sales Flow AI daraus lernen soll.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import type { 
  TeachSheetState, 
  RuleScope, 
  ChangeType,
  Significance,
} from '../../types/teach';
import { CHANGE_LABELS } from '../../types/teach';

// Try to import optional dependencies
let BlurView: React.ComponentType<any> | null = null;
let Ionicons: React.ComponentType<any> | null = null;
let Haptics: any = null;

try {
  BlurView = require('expo-blur').BlurView;
} catch {
  // expo-blur not available
}

try {
  Ionicons = require('@expo/vector-icons').Ionicons;
} catch {
  // @expo/vector-icons not available
}

try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available
}

// =============================================================================
// PROPS
// =============================================================================

export interface TeachSheetProps {
  state: TeachSheetState;
  
  // Actions
  onDismiss: () => void;
  onIgnore: () => void;
  onSavePersonal: () => Promise<void>;
  onSaveTeam: () => Promise<void>;
  onSaveTemplate?: () => Promise<void>;
  
  // Optional
  isLeader?: boolean;
  showTemplateOption?: boolean;
  error?: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;

// =============================================================================
// HAPTIC HELPERS
// =============================================================================

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

// =============================================================================
// ICON COMPONENT (Fallback wenn Ionicons nicht verfügbar)
// =============================================================================

interface IconProps {
  name: string;
  size: number;
  color: string;
}

const Icon: React.FC<IconProps> = ({ name, size, color }) => {
  if (Ionicons) {
    return <Ionicons name={name} size={size} color={color} />;
  }
  
  // Fallback: Emoji-basierte Icons
  const emojiMap: Record<string, string> = {
    'school': '🎓',
    'person': '👤',
    'people': '👥',
    'document-text': '📄',
    'chevron-up': '▲',
    'chevron-down': '▼',
    'arrow-down': '↓',
    'close': '✕',
  };
  
  return (
    <Text style={{ fontSize: size, color }}>
      {emojiMap[name] || '•'}
    </Text>
  );
};

// =============================================================================
// COMPONENT
// =============================================================================

export const TeachSheet: React.FC<TeachSheetProps> = ({
  state,
  onDismiss,
  onIgnore,
  onSavePersonal,
  onSaveTeam,
  onSaveTemplate,
  isLeader = false,
  showTemplateOption = true,
  error,
}) => {
  // Local State
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // Animation
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Animate in/out
  useEffect(() => {
    if (state.visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 150,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
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
      setNote('');
      setSelectedTags([]);
      setShowComparison(false);
    }
  }, [state.visible, translateY, fadeAnim]);
  
  // =============================================================================
  // HANDLERS
  // =============================================================================
  
  const handleSavePersonal = useCallback(async () => {
    hapticImpact('medium');
    await onSavePersonal();
  }, [onSavePersonal]);
  
  const handleSaveTeam = useCallback(async () => {
    hapticImpact('medium');
    await onSaveTeam();
  }, [onSaveTeam]);
  
  const handleIgnore = useCallback(() => {
    hapticImpact('light');
    onIgnore();
  }, [onIgnore]);
  
  const handleDismiss = useCallback(() => {
    hapticImpact('light');
    onDismiss();
  }, [onDismiss]);
  
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);
  
  // =============================================================================
  // COMPUTED
  // =============================================================================
  
  const detectedChanges = state.event?.detectedChanges.changes ?? [];
  const significance = state.event?.detectedChanges.significance ?? 'low';
  
  // Suggested tags based on context
  const suggestedTags = useMemo(() => {
    const tags: string[] = [];
    
    if (state.event?.context.messageType) {
      tags.push(state.event.context.messageType);
    }
    if (state.event?.context.objectionType) {
      tags.push(`einwand:${state.event.context.objectionType}`);
    }
    if (state.event?.context.channel) {
      tags.push(state.event.context.channel);
    }
    
    return tags;
  }, [state.event]);
  
  // Truncate text for preview
  const truncate = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // =============================================================================
  // RENDER
  // =============================================================================
  
  if (!state.visible && !state.event) return null;
  
  const BackdropComponent = BlurView || View;
  const backdropProps = BlurView 
    ? { intensity: 30, style: StyleSheet.absoluteFill }
    : { style: [StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }] };
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={state.visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleDismiss}
        >
          <BackdropComponent {...backdropProps} />
        </TouchableOpacity>
      </Animated.View>
      
      {/* Sheet */}
      <Animated.View 
        style={[
          styles.sheet,
          { transform: [{ translateY }] },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContent}
        >
          {/* Handle */}
          <View style={styles.handle} />
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Icon name="school" size={24} color="#FFD700" />
            </View>
            <Text style={styles.title}>
              Das war anders als mein Vorschlag
            </Text>
            <Text style={styles.subtitle}>
              Soll ich das als neue Regel lernen?
            </Text>
          </View>
          
          <ScrollView 
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Detected Changes */}
            {detectedChanges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Erkannte Änderungen</Text>
                <View style={styles.changesRow}>
                  {detectedChanges.map((change, i) => (
                    <View key={i} style={styles.changeBadge}>
                      <Text style={styles.changeBadgeText}>
                        {CHANGE_LABELS[change] || change}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Comparison Toggle */}
            <TouchableOpacity 
              style={styles.comparisonToggle}
              onPress={() => setShowComparison(!showComparison)}
            >
              <Icon 
                name={showComparison ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color="#8E8E93" 
              />
              <Text style={styles.comparisonToggleText}>
                {showComparison ? 'Vergleich ausblenden' : 'Vergleich anzeigen'}
              </Text>
            </TouchableOpacity>
            
            {/* Comparison */}
            {showComparison && state.event && (
              <View style={styles.comparison}>
                <View style={styles.comparisonBox}>
                  <Text style={styles.comparisonLabel}>CHIEF's Vorschlag</Text>
                  <Text style={styles.comparisonText} numberOfLines={3}>
                    {truncate(state.event.originalText, 150)}
                  </Text>
                </View>
                <View style={styles.arrowContainer}>
                  <Icon name="arrow-down" size={20} color="#8E8E93" />
                </View>
                <View style={[styles.comparisonBox, styles.comparisonBoxFinal]}>
                  <Text style={styles.comparisonLabel}>Deine Version</Text>
                  <Text style={styles.comparisonText} numberOfLines={3}>
                    {truncate(state.event.finalText, 150)}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Tags */}
            {suggestedTags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tags hinzufügen</Text>
                <View style={styles.tagsRow}>
                  {suggestedTags.map((tag, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.tagButton,
                        selectedTags.includes(tag) && styles.tagButtonSelected,
                      ]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text style={[
                        styles.tagButtonText,
                        selectedTags.includes(tag) && styles.tagButtonTextSelected,
                      ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            {/* Note Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notiz (optional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="z.B. 'Bei Einwand zu teuer immer so'"
                placeholderTextColor="#8E8E93"
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={200}
              />
            </View>
            
            {/* Error Message */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>
          
          {/* Actions */}
          <View style={styles.actions}>
            {/* Ignore */}
            <TouchableOpacity 
              style={styles.ignoreButton}
              onPress={handleIgnore}
              disabled={state.isLoading}
            >
              <Text style={styles.ignoreButtonText}>Ignorieren</Text>
            </TouchableOpacity>
            
            {/* Save Options */}
            <View style={styles.saveButtons}>
              <TouchableOpacity 
                style={[styles.saveButton, styles.saveButtonPersonal]}
                onPress={handleSavePersonal}
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="person" size={18} color="#FFF" />
                    <Text style={styles.saveButtonText}>Nur für mich</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {isLeader && (
                <TouchableOpacity 
                  style={[styles.saveButton, styles.saveButtonTeam]}
                  onPress={handleSaveTeam}
                  disabled={state.isLoading}
                >
                  {state.isLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Icon name="people" size={18} color="#FFF" />
                      <Text style={styles.saveButtonText}>Fürs Team</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            {/* Template Option */}
            {showTemplateOption && onSaveTemplate && (
              <TouchableOpacity 
                style={styles.templateButton}
                onPress={onSaveTemplate}
                disabled={state.isLoading}
              >
                <Icon name="document-text" size={16} color="#8E8E93" />
                <Text style={styles.templateButtonText}>
                  Als Template speichern
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetContent: {
    flex: 1,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: '#3A3A3C',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  changesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  changeBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeBadgeText: {
    fontSize: 13,
    color: '#FFD700',
  },
  comparisonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  comparisonToggleText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  comparison: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  comparisonBox: {
    width: '100%',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
  },
  comparisonBoxFinal: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
    borderWidth: 1,
  },
  comparisonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  comparisonText: {
    fontSize: 14,
    color: '#FFF',
    lineHeight: 20,
  },
  arrowContainer: {
    paddingVertical: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  tagButtonSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderColor: '#007AFF',
  },
  tagButtonText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  tagButtonTextSelected: {
    color: '#007AFF',
  },
  noteInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#FFF',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    padding: 20,
    paddingBottom: 34, // Safe area
    gap: 12,
  },
  ignoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  ignoreButtonText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  saveButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonPersonal: {
    backgroundColor: '#007AFF',
  },
  saveButtonTeam: {
    backgroundColor: '#34C759',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  templateButtonText: {
    fontSize: 13,
    color: '#8E8E93',
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default TeachSheet;

