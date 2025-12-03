/**
 * AutopilotSetupChecklist - Zeigt was der User einrichten muss
 * 
 * Damit der Autopilot funktioniert braucht er:
 * 1. ✅ Profil vollständig (Name, Branche, Level)
 * 2. ❓ Mindestens 1 Lead
 * 3. ❓ Knowledge Base gefüllt (optional aber empfohlen)
 * 4. ❓ Channel verbunden (optional für Auto-Send)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_CONFIG } from '../../services/apiConfig';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SetupItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  completed: boolean;
  action?: string;
  screen?: string;
}

interface Props {
  onItemPress?: (item: SetupItem) => void;
  onComplete?: () => void;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AutopilotSetupChecklist({ 
  onItemPress, 
  onComplete,
  compact = false 
}: Props) {
  const [items, setItems] = useState<SetupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  
  // Check Setup Status
  const checkSetupStatus = useCallback(async () => {
    try {
      // Default items - in Production würde das vom Backend kommen
      const setupItems: SetupItem[] = [
        {
          id: 'profile',
          title: 'Profil vervollständigen',
          description: 'Name, Branche und Sales-Level angeben',
          icon: '👤',
          required: true,
          completed: true, // Vom Onboarding
          screen: 'Profile',
        },
        {
          id: 'leads',
          title: 'Ersten Lead hinzufügen',
          description: 'Importiere oder erstelle deinen ersten Kontakt',
          icon: '👥',
          required: true,
          completed: false,
          action: 'add_lead',
          screen: 'LeadList',
        },
        {
          id: 'knowledge',
          title: 'Wissen hochladen',
          description: 'Produkt-Infos, Preise, FAQs für den KI-Assistenten',
          icon: '📚',
          required: false,
          completed: false,
          screen: 'Knowledge',
        },
        {
          id: 'channel',
          title: 'Kanal verbinden',
          description: 'Instagram, WhatsApp oder Email für Auto-Send',
          icon: '📱',
          required: false,
          completed: false,
          screen: 'ChannelSettings',
        },
        {
          id: 'autopilot_settings',
          title: 'Autopilot konfigurieren',
          description: 'Autonomie-Level und Präferenzen einstellen',
          icon: '🤖',
          required: false,
          completed: false,
          screen: 'AutopilotSettings',
        },
      ];
      
      // Check real status from API
      try {
        // Check leads
        const leadsResponse = await fetch(`${API_CONFIG.baseUrl}/leads?limit=1`);
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          if (leadsData.length > 0) {
            const leadItem = setupItems.find(i => i.id === 'leads');
            if (leadItem) leadItem.completed = true;
          }
        }
        
        // Check knowledge
        const knowledgeResponse = await fetch(`${API_CONFIG.baseUrl}/knowledge/items?limit=1`);
        if (knowledgeResponse.ok) {
          const knowledgeData = await knowledgeResponse.json();
          if (knowledgeData.items && knowledgeData.items.length > 0) {
            const knowledgeItem = setupItems.find(i => i.id === 'knowledge');
            if (knowledgeItem) knowledgeItem.completed = true;
          }
        }
      } catch (e) {
        // API nicht verfügbar - Demo-Modus
        console.log('Setup check: API not available');
      }
      
      setItems(setupItems);
      
      // Calculate progress
      const requiredItems = setupItems.filter(i => i.required);
      const completedRequired = requiredItems.filter(i => i.completed);
      const newProgress = Math.round((completedRequired.length / requiredItems.length) * 100);
      setProgress(newProgress);
      
      // All required completed?
      if (newProgress === 100 && onComplete) {
        onComplete();
      }
      
    } catch (error) {
      console.error('Setup check error:', error);
    } finally {
      setLoading(false);
    }
  }, [onComplete]);
  
  useEffect(() => {
    checkSetupStatus();
  }, [checkSetupStatus]);
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#3B82F6" />
      </View>
    );
  }
  
  const requiredItems = items.filter(i => i.required);
  const optionalItems = items.filter(i => !i.required);
  const allRequiredComplete = requiredItems.every(i => i.completed);
  
  // Kompakte Version - nur Progress
  if (compact && allRequiredComplete) {
    return null; // Nicht anzeigen wenn alles erledigt
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={allRequiredComplete ? ['#10B981', '#059669'] : ['#3B82F6', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>
            {allRequiredComplete ? '🚀' : '⚙️'}
          </Text>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {allRequiredComplete ? 'Autopilot bereit!' : 'Autopilot Setup'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {allRequiredComplete 
                ? 'Dein System ist einsatzbereit'
                : `${progress}% abgeschlossen`
              }
            </Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </LinearGradient>
      
      {/* Required Items */}
      {!compact && requiredItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Pflicht-Setup</Text>
          {requiredItems.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.item,
                item.completed && styles.itemCompleted
              ]}
              onPress={() => onItemPress?.(item)}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <View style={styles.itemContent}>
                <Text style={[
                  styles.itemTitle,
                  item.completed && styles.itemTitleCompleted
                ]}>
                  {item.title}
                </Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
              <Text style={styles.itemStatus}>
                {item.completed ? '✅' : '⏳'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      
      {/* Optional Items */}
      {!compact && optionalItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Empfohlen (optional)</Text>
          {optionalItems.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.item,
                item.completed && styles.itemCompleted
              ]}
              onPress={() => onItemPress?.(item)}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <View style={styles.itemContent}>
                <Text style={[
                  styles.itemTitle,
                  item.completed && styles.itemTitleCompleted
                ]}>
                  {item.title}
                </Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
              <Text style={styles.itemStatus}>
                {item.completed ? '✅' : '➕'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      
      {/* Status Message */}
      {allRequiredComplete && !compact && (
        <View style={styles.readyMessage}>
          <Text style={styles.readyEmoji}>🎉</Text>
          <Text style={styles.readyText}>
            Super! Der Autopilot kann jetzt für dich arbeiten.
          </Text>
          <Text style={styles.readySubtext}>
            Je mehr Wissen und Kanäle du hinzufügst, desto besser wird er!
          </Text>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  
  // Header
  header: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  
  // Section
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
  },
  
  // Items
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  itemCompleted: {
    backgroundColor: '#F0FDF4',
  },
  itemIcon: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemTitleCompleted: {
    color: '#16A34A',
  },
  itemDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  itemStatus: {
    fontSize: 20,
  },
  
  // Ready Message
  readyMessage: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
  },
  readyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  readyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16A34A',
    textAlign: 'center',
  },
  readySubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
});

