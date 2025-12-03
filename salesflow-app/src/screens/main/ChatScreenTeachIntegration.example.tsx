/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CHAT SCREEN - TEACH UI INTEGRATION EXAMPLE                               ║
 * ║  Zeigt wie Teach-UI in ChatScreen integriert wird                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Diese Datei zeigt die Integration des Teach-UI Systems in den ChatScreen.
 * Kopiere die relevanten Teile in deine bestehende ChatScreen.js.
 * 
 * WICHTIG: Dies ist ein TypeScript-Beispiel. Für JavaScript entferne die
 * Type-Annotationen.
 */

import React, { useState, useCallback } from 'react';
import { View, Alert } from 'react-native';

// Teach-UI Imports
import { useSendWithTeach } from '../../hooks/useTeach';
import { TeachSheet } from '../../components/teach';
import type { TeachResponse, OverrideContext } from '../../types/teach';

// =============================================================================
// INTEGRATION IN BESTEHENDEN CHATSCREEN
// =============================================================================

/**
 * Beispiel für die Integration in ChatScreen.
 * 
 * Schritt 1: Imports hinzufügen (siehe oben)
 * 
 * Schritt 2: useSendWithTeach Hook verwenden
 * 
 * Schritt 3: TeachSheet Component rendern
 */

interface ChatScreenWithTeachProps {
  navigation: any;
  leadId?: string;
  channel?: string;
}

export function ChatScreenWithTeach({ 
  navigation, 
  leadId, 
  channel = 'app' 
}: ChatScreenWithTeachProps) {
  // Bestehender State...
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [lastChiefSuggestion, setLastChiefSuggestion] = useState<string | null>(null);
  
  // User Info (aus deinem AuthContext)
  const user = { role: 'user' }; // Ersetze mit useAuth()
  
  // ==========================================================================
  // TEACH-UI INTEGRATION
  // ==========================================================================
  
  const {
    // Sheet State & Actions
    sheetState,
    dismissSheet,
    ignoreOnce,
    savePersonal,
    saveTeam,
    saveAsTemplate,
    
    // Override Detection
    checkForOverride,
    setSuggestion,
    
    // Stats
    stats,
    
    // Loading
    isSubmitting,
    error,
  } = useSendWithTeach({
    // Default Context für alle Overrides
    defaultContext: {
      channel,
      leadId,
    },
    
    // Callback wenn Teach abgeschlossen
    onTeachComplete: (response: TeachResponse) => {
      // XP Toast anzeigen
      if (response.xpEarned && response.xpEarned > 0) {
        Alert.alert('🎉 Gelernt!', `+${response.xpEarned} XP\n${response.message}`);
      }
      
      // Pattern Notification
      if (response.patternDetected?.willBecomeRule) {
        Alert.alert(
          '🎯 Pattern erkannt!',
          `Du machst das oft: ${response.patternDetected.patternType}\nSoll das zur Regel werden?`
        );
      }
    },
    
    // Callback für Fehler
    onError: (err: Error) => {
      console.error('Teach error:', err);
    },
    
    // Deine Send-Funktion
    onSend: async (text: string) => {
      // Hier kommt deine bestehende sendMessage Logik
      await sendMessageToBackend(text);
    },
  });
  
  // ==========================================================================
  // CHIEF RESPONSE HANDLER (angepasst)
  // ==========================================================================
  
  const handleChiefResponse = useCallback((data: any) => {
    const content = data.reply || data.response || data.message || '';
    
    // Wenn CHIEF einen Vorschlag macht, speichere ihn für Override-Detection
    if (data.suggestion || data.draft) {
      const suggestion = data.suggestion || data.draft;
      setLastChiefSuggestion(suggestion);
      setSuggestion(suggestion); // Für Teach-UI
    }
    
    // Normale Message-Verarbeitung...
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content,
    }]);
  }, [setSuggestion]);
  
  // ==========================================================================
  // SEND MESSAGE (angepasst)
  // ==========================================================================
  
  const sendMessageToBackend = async (text: string) => {
    // Deine bestehende API-Call Logik
    // ...
  };
  
  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    
    const userText = input.trim();
    setInput('');
    
    // User Message hinzufügen
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
    }]);
    
    // TEACH-UI: Prüfe ob User den CHIEF-Vorschlag geändert hat
    if (lastChiefSuggestion && lastChiefSuggestion !== userText) {
      // Build context für Override
      const context: OverrideContext = {
        channel,
        leadId,
        // Weitere Context-Infos...
      };
      
      // Trigger Override Detection
      checkForOverride(lastChiefSuggestion, userText, context);
    }
    
    // Clear suggestion
    setLastChiefSuggestion(null);
    
    // Send to backend
    await sendMessageToBackend(userText);
  }, [input, lastChiefSuggestion, channel, leadId, checkForOverride]);
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  return (
    <View style={{ flex: 1 }}>
      {/* Dein bestehender Chat-Content */}
      {/* ... Messages, Input, etc. ... */}
      
      {/* TEACH-UI: TeachSheet */}
      <TeachSheet
        state={sheetState}
        onDismiss={dismissSheet}
        onIgnore={ignoreOnce}
        onSavePersonal={savePersonal}
        onSaveTeam={saveTeam}
        onSaveTemplate={saveAsTemplate}
        isLeader={user.role === 'leader' || user.role === 'admin'}
        showTemplateOption={true}
        error={error}
      />
    </View>
  );
}

// =============================================================================
// ALTERNATIVE: MINIMALE INTEGRATION
// =============================================================================

/**
 * Wenn du nur die Override-Detection ohne das Sheet willst,
 * kannst du den bestehenden useTeachDetection Hook verwenden:
 */

import { useTeachDetection } from '../../hooks/useTeachDetection';
import { TeachFeedbackModal } from '../../components/brain/TeachFeedbackModal';

export function ChatScreenMinimalTeach() {
  const {
    checkCorrection,
    showModal,
    modalData,
    closeModal,
    handleFeedbackComplete,
  } = useTeachDetection({
    onRuleCreated: (ruleTitle) => {
      Alert.alert('Gelernt!', `Neue Regel: ${ruleTitle}`);
    },
  });
  
  // Nach dem Senden einer Nachricht:
  const afterSend = async (chiefSuggestion: string, userFinalText: string) => {
    await checkCorrection(chiefSuggestion, userFinalText, {
      channel: 'whatsapp',
      messageType: 'follow_up',
    });
  };
  
  return (
    <View style={{ flex: 1 }}>
      {/* Chat Content */}
      
      {/* Teach Modal */}
      {showModal && modalData && (
        <TeachFeedbackModal
          visible={showModal}
          correctionId={modalData.correctionId}
          originalText={modalData.originalText}
          correctedText={modalData.correctedText}
          suggestedRule={modalData.suggestedRule}
          changeSummary={modalData.changeSummary}
          onClose={closeModal}
          onComplete={handleFeedbackComplete}
        />
      )}
    </View>
  );
}

// =============================================================================
// JAVASCRIPT VERSION (ohne Types)
// =============================================================================

/*
// Für JavaScript, entferne die Type-Annotationen:

import React, { useState, useCallback } from 'react';
import { View, Alert } from 'react-native';
import { useSendWithTeach } from '../../hooks/useTeach';
import { TeachSheet } from '../../components/teach';

export function ChatScreenWithTeach({ navigation, leadId, channel = 'app' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [lastChiefSuggestion, setLastChiefSuggestion] = useState(null);
  
  const {
    sheetState,
    dismissSheet,
    ignoreOnce,
    savePersonal,
    saveTeam,
    saveAsTemplate,
    checkForOverride,
    setSuggestion,
    error,
  } = useSendWithTeach({
    defaultContext: { channel, leadId },
    onTeachComplete: (response) => {
      if (response.xpEarned > 0) {
        Alert.alert('🎉 Gelernt!', `+${response.xpEarned} XP`);
      }
    },
    onSend: async (text) => {
      // Deine send Logik
    },
  });
  
  // ... Rest der Logik ...
  
  return (
    <View style={{ flex: 1 }}>
      {/ * Chat Content * /}
      
      <TeachSheet
        state={sheetState}
        onDismiss={dismissSheet}
        onIgnore={ignoreOnce}
        onSavePersonal={savePersonal}
        onSaveTeam={saveTeam}
        onSaveTemplate={saveAsTemplate}
        isLeader={false}
        error={error}
      />
    </View>
  );
}
*/

export default ChatScreenWithTeach;

