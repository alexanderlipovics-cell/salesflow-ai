/**
 * Beispiel-Integration: Dashboard mit Onboarding-Features
 * 
 * Zeigt wie man alle Onboarding-Komponenten zusammen nutzt
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../context/OnboardingContext';
import { useOnboardingTooltips } from '../hooks/useOnboardingTooltips';
import QuickStartChecklist from '../components/QuickStartChecklist';
import InteractiveTutorial from '../components/InteractiveTutorial';
import Tooltip from '../components/Tooltip';
import EmptyState from '../components/EmptyState';
import { Plus, MessageSquare } from 'lucide-react-native';

interface DashboardExampleProps {
  navigation: any;
}

export default function DashboardExample({ navigation }: DashboardExampleProps) {
  const { showTutorial, completeTutorial } = useOnboarding();
  const { currentTooltip, showTooltip, dismissTooltip } = useOnboardingTooltips();
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    // Zeige Tooltip für Add-Lead-Button beim ersten Besuch
    const timer = setTimeout(() => {
      showTooltip('add_lead_button');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleAddLeadPress = () => {
    // Navigiere zum Lead-Formular
    navigation.navigate('LeadForm');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sales Flow AI</Text>
        
        {/* Add Lead Button mit Tooltip */}
        <View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddLeadPress}
            nativeID="add-lead-button"
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
          
          {/* Tooltip für ersten Button-Click */}
          {currentTooltip?.id === 'add_lead_button' && (
            <Tooltip
              visible={true}
              text={currentTooltip.text}
              onDismiss={() => dismissTooltip('add_lead_button')}
              position="bottom"
            />
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Start Checklist */}
        <QuickStartChecklist navigation={navigation} />

        {/* Leads Section */}
        {leads.length === 0 ? (
          <EmptyState
            icon="Users"
            title="Noch keine Leads"
            description="Füge deinen ersten Lead hinzu und starte deine Sales-Pipeline mit KI-Unterstützung."
            actionText="Ersten Lead hinzufügen"
            onAction={handleAddLeadPress}
          />
        ) : (
          <View style={styles.leadsSection}>
            {/* Leads Liste hier */}
          </View>
        )}

        {/* AI Chat Button */}
        <View style={styles.chatButtonContainer}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('IntelligentChat')}
            nativeID="ai-chat-button"
          >
            <MessageSquare size={24} color="#fff" />
            <Text style={styles.chatButtonText}>Mit KI chatten</Text>
          </TouchableOpacity>
          
          {/* Tooltip für Chat-Button */}
          {currentTooltip?.id === 'ai_chat' && (
            <Tooltip
              visible={true}
              text={currentTooltip.text}
              onDismiss={() => dismissTooltip('ai_chat')}
              position="top"
            />
          )}
        </View>
      </ScrollView>

      {/* Interactive Tutorial Overlay */}
      <InteractiveTutorial 
        visible={showTutorial}
        onComplete={completeTutorial}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flex: 1,
  },
  leadsSection: {
    padding: 16,
  },
  chatButtonContainer: {
    padding: 20,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

