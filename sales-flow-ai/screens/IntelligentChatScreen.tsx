/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INTELLIGENT CHAT SCREEN
 * ═══════════════════════════════════════════════════════════════════════════
 * AI-Chat mit Auto-Extraktion und automatischen Aktionen.
 * 
 * Features:
 * - Echtzeit Chat mit GPT-4
 * - Automatische Lead-Erstellung
 * - BANT-Scoring
 * - Einwand-Erkennung
 * - Smart Suggestions
 * - Action Notifications
 * 
 * Version: 1.0.0 (Premium Feature)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { apiClient } from '../services/api';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions_taken?: string[];
  suggestions?: string[];
  timestamp: Date;
}

interface ChatScreenProps {
  route?: {
    params?: {
      leadId?: string;
    };
  };
}

export const IntelligentChatScreen: React.FC<ChatScreenProps> = ({ route }) => {
  const { leadId } = route?.params || {};
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string | undefined>(leadId);
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  useEffect(() => {
    // Load chat history
    loadChatHistory();
  }, [currentLeadId]);
  
  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);
  
  const loadChatHistory = async () => {
    try {
      const params = currentLeadId ? `?lead_id=${currentLeadId}` : '';
      const response = await apiClient.get(`/api/intelligent-chat/history${params}`);
      
      if (response.data.messages) {
        const formattedMessages = response.data.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.message,
          actions_taken: msg.actions_taken,
          suggestions: msg.suggestions,
          timestamp: new Date(msg.created_at),
        }));
        
        // Reverse to show oldest first
        setMessages(formattedMessages.reverse());
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };
  
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await apiClient.post('/api/intelligent-chat/message', {
        message: input,
        lead_id: currentLeadId,
        conversation_history: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });
      
      const { ai_response, actions_taken, suggestions, lead_id } = response.data;
      
      // Update lead ID if a new lead was created
      if (lead_id && !currentLeadId) {
        setCurrentLeadId(lead_id);
      }
      
      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: ai_response,
        actions_taken,
        suggestions,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Show action notifications
      if (actions_taken && actions_taken.length > 0) {
        showActionNotifications(actions_taken);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Show error message
      const errorMessage: Message = {
        role: 'assistant',
        content: error.response?.data?.detail || 'Es gab einen Fehler. Bitte versuche es erneut.',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  const showActionNotifications = (actions: string[]) => {
    const actionsText = actions.join('\n');
    Alert.alert(
      '✅ Aktionen durchgeführt',
      actionsText,
      [{ text: 'OK' }]
    );
  };
  
  const renderMessage = (msg: Message, index: number) => {
    const isUser = msg.role === 'user';
    
    return (
      <View
        key={index}
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.assistantText,
          ]}
        >
          {msg.content}
        </Text>
        
        {/* Actions Taken */}
        {msg.actions_taken && msg.actions_taken.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>Aktionen:</Text>
            {msg.actions_taken.map((action, i) => (
              <Text key={i} style={styles.actionItem}>
                {action}
              </Text>
            ))}
          </View>
        )}
        
        {/* Suggestions */}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>💡 Vorschläge:</Text>
            {msg.suggestions.map((suggestion, i) => (
              <Text key={i} style={styles.suggestionItem}>
                {suggestion}
              </Text>
            ))}
          </View>
        )}
        
        <Text style={styles.timestamp}>
          {msg.timestamp.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {currentLeadId ? '💬 Lead Chat' : '🤖 AI Assistant'}
        </Text>
        <Text style={styles.headerSubtitle}>
          Intelligent Chat mit Auto-Extraction
        </Text>
      </View>
      
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>👋 Hallo!</Text>
            <Text style={styles.emptyStateText}>
              Ich bin dein intelligenter Sales Assistant. Du kannst mir:
            </Text>
            <Text style={styles.emptyStateBullet}>
              • Gespräche mit Leads schildern
            </Text>
            <Text style={styles.emptyStateBullet}>
              • Lead-Daten einfügen (ich extrahiere automatisch)
            </Text>
            <Text style={styles.emptyStateBullet}>
              • Nach Best Practices fragen
            </Text>
            <Text style={styles.emptyStateBullet}>
              • Einwände besprechen
            </Text>
          </View>
        ) : (
          messages.map((msg, index) => renderMessage(msg, index))
        )}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Denkt nach...</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Nachricht oder Gespräch einfügen..."
          placeholderTextColor="#999"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!input.trim() || loading}
          style={[
            styles.sendButton,
            (!input.trim() || loading) && styles.sendButtonDisabled,
          ]}
        >
          <Text style={styles.sendButtonText}>
            {loading ? '⏳' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E0E0E0',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 32,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateBullet: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  actionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 6,
  },
  actionItem: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
  suggestionsContainer: {
    marginTop: 12,
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 6,
  },
  suggestionItem: {
    fontSize: 12,
    color: '#92400E',
    marginVertical: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#F9F9F9',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  sendButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default IntelligentChatScreen;

