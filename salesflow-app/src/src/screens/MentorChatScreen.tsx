/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  MENTOR Chat Screen                                                         ║
 * ║  KI-Assistent für Vertriebscoaching                                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../services/apiConfig';
import { MessageBubble, QuickActions } from '../components/mentor';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  complianceWarning?: {
    has_violations: boolean;
    risk_score?: number;
    violation_count?: number;
    message?: string;
  } | null;
}

const getMentorApiUrl = () => `${API_CONFIG.baseUrl.replace('/api/v1', '')}/api/v2/mentor`;

export default function MentorChatScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hallo! Ich bin MENTOR, dein KI-Vertriebscoach. Wie kann ich dir heute helfen?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const contactId = route?.params?.contactId;

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setTyping(true);

    try {
      const response = await fetch(`${getMentorApiUrl()}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.access_token && { Authorization: `Bearer ${user.access_token}` }),
        },
        body: JSON.stringify({
          message: messageText,
          include_context: true,
          ...(contactId && { context: { contactId } }),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const mentorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'Entschuldigung, ich konnte keine Antwort generieren.',
        isUser: false,
        timestamp: new Date(),
        complianceWarning: data.compliance_warning || null,
      };

      setMessages((prev) => [...prev, mentorMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTyping(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
    const actionMessages: Record<string, string> = {
      followup: 'Hilf mir, ein Follow-up zu formulieren',
      objection: 'Ich brauche Hilfe bei einem Einwand',
      compliance: 'Prüfe diese Nachricht auf Compliance',
      opener: 'Schlage mir einen Gesprächseinstieg vor',
      ghostbuster: contactId 
        ? `Hilf mir, diesen Lead wieder zu aktivieren (Ghostbuster). Kontakt-ID: ${contactId}`
        : 'Hilf mir, einen inaktiven Lead wieder zu aktivieren (Ghostbuster)',
      price_defense: 'Wie kann ich den Preis verteidigen?',
      outreach: 'Schreibe einen Outreach-Text für mich',
      analyze_contact: contactId 
        ? `Analysiere diesen Kontakt für mich (ID: ${contactId})`
        : 'Analysiere einen Kontakt für mich',
      linkedin_post: 'Erstelle einen LinkedIn Post für mich',
    };

    const message = actionMessages[actionId] || '';
    if (message) {
      setInput(message);
      // Auto-send for actions that should trigger immediately
      const autoSendActions = [
        'followup', 
        'opener', 
        'ghostbuster', 
        'analyze_contact', 
        'outreach', 
        'linkedin_post'
      ];
      if (autoSendActions.includes(actionId)) {
        sendMessage(message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>🤖</Text>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>MENTOR</Text>
              <Text style={styles.headerSubtitle}>KI-Vertriebscoach</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message.text}
              isUser={message.isUser}
              timestamp={message.timestamp}
              complianceWarning={message.complianceWarning}
            />
          ))}

          {/* Typing Indicator */}
          {typing && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.typingText}>MENTOR denkt...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Actions */}
        <QuickActions 
          onActionPress={handleQuickAction} 
          contactId={contactId}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nachricht an MENTOR..."
            placeholderTextColor="#94A3B8"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            editable={!loading}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || loading) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messagesContent: {
    paddingVertical: 16,
  },
  typingContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    alignItems: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  sendButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
});

