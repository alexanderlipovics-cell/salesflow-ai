/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CLOSERCLUB - AI COACH SCREEN                                              ║
 * ║  AI-gestütztes Coaching für Verkaufsgespräche                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CoachTip {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export default function AICoachScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hallo! Ich bin dein AI Sales Coach. Wie kann ich dir heute helfen? Du kannst mich nach Verkaufstipps fragen, Einwandbehandlung üben oder Gesprächsstrategien besprechen.',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [quickTips] = useState<CoachTip[]>([
    {
      id: '1',
      title: '🎯 DISC-Profile nutzen',
      description: 'Passe deine Kommunikation an den Persönlichkeitstyp des Kunden an.',
      priority: 'high',
    },
    {
      id: '2',
      title: '💬 Aktives Zuhören',
      description: 'Stelle offene Fragen und zeige echtes Interesse am Kunden.',
      priority: 'medium',
    },
    {
      id: '3',
      title: '⏰ Follow-up Timing',
      description: 'Kontaktiere warme Leads innerhalb von 24 Stunden.',
      priority: 'high',
    },
  ]);

  const [quickActions] = useState([
    { id: '1', label: 'Einwandbehandlung', icon: '🛡️' },
    { id: '2', label: 'Closing-Tipps', icon: '🎯' },
    { id: '3', label: 'DISC-Analyse', icon: '🧠' },
    { id: '4', label: 'Script-Hilfe', icon: '📜' },
  ]);

  useEffect(() => {
    // Auto-scroll bei neuen Nachrichten
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userQuestion = inputText.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userQuestion,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // TODO: API Call implementieren
      // Simuliere AI Response mit Bezug auf die Frage
      await new Promise(resolve => setTimeout(resolve, 1200));

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Zu deiner Frage: "${userQuestion}"\n\nEmpfohlene nächsten Schritte:\n1) Kläre das Ziel: Was genau willst du erreichen?\n2) Stelle 2-3 offene Fragen, um Bedarf zu verstehen.\n3) Spiegle die Haupt-Herausforderung zurück.\n4) Biete eine konkrete nächste Aktion an (Call, Demo, Angebot).\n\nWillst du ein konkretes Script oder Einwand-Response dafür?`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInputText(action);
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user';

    return (
      <View style={[styles.messageContainer, isUser && styles.messageContainerUser]}>
        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant]}>
          {!isUser && (
            <Text style={styles.messageRole}>🧠 AI Coach</Text>
          )}
          <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
            {message.content}
          </Text>
          <Text style={[styles.messageTime, isUser && styles.messageTimeUser]}>
            {message.timestamp.toLocaleTimeString('de-DE', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  const TipCard = ({ tip }: { tip: CoachTip }) => {
    const priorityColor = 
      tip.priority === 'high' ? COLORS.hot :
      tip.priority === 'medium' ? COLORS.warm : COLORS.cold;

    return (
      <TouchableOpacity style={styles.tipCard} activeOpacity={0.8}>
        <View style={[styles.tipPriorityBar, { backgroundColor: priorityColor }]} />
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>{tip.title}</Text>
          <Text style={styles.tipDescription}>{tip.description}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AI Sales Coach</Text>
            <Text style={styles.headerSubtitle}>Dein persönlicher Verkaufsberater</Text>
          </View>
          <TouchableOpacity style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsSectionTitle}>💡 Aktuelle Tipps</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tipsScroll}
          >
            {quickTips.map(tip => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </ScrollView>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>AI Coach denkt nach...</Text>
            </View>
          )}
        </ScrollView>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScroll}
          >
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionBtn}
                onPress={() => handleQuickAction(action.label)}
              >
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={styles.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Frage deinen AI Coach..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <LinearGradient
                colors={inputText.trim() 
                  ? [COLORS.primary, COLORS.primaryDark] 
                  : [COLORS.surface, COLORS.surface]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendButtonGradient}
              >
                <Text style={styles.sendButtonIcon}>✈️</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
    marginRight: SPACING.xs / 2,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
  },
  tipsSection: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tipsSectionTitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  tipsScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  tipCard: {
    width: 200,
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipPriorityBar: {
    height: 3,
  },
  tipContent: {
    padding: SPACING.sm,
  },
  tipTitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  tipDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  messageContainer: {
    marginBottom: SPACING.md,
    alignItems: 'flex-start',
  },
  messageContainerUser: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  messageBubbleAssistant: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageBubbleUser: {
    backgroundColor: COLORS.primary,
  },
  messageRole: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  messageText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 22,
  },
  messageTextUser: {
    color: COLORS.text,
  },
  messageTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  messageTimeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  loadingText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  quickActionsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  quickActionsScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionIcon: {
    fontSize: 16,
    marginRight: SPACING.xs / 2,
  },
  quickActionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonIcon: {
    fontSize: 20,
  },
});

