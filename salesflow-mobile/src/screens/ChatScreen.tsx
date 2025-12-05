import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { API_CONFIG } from '../constants/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

const QUICK_PROMPTS = [
  { id: '1', label: '💬 Einwand "zu teuer"', prompt: 'Wie reagiere ich auf den Einwand "Das ist mir zu teuer"?' },
  { id: '2', label: '🎯 Closing Script', prompt: 'Gib mir ein effektives Closing Script für einen warmen Kontakt' },
  { id: '3', label: '👻 Ghosting', prompt: 'Ein Lead antwortet nicht mehr. Was kann ich schreiben?' },
  { id: '4', label: '📝 Opener', prompt: 'Erstelle einen Cold Opener für LinkedIn' },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: 'Hallo! 👋 Ich bin dein KI-Verkaufscoach. Frag mich alles zu:\n\n• Verkaufstechniken\n• Einwandbehandlung\n• Scripts & Formulierungen\n• Lead-Qualifizierung\n\nWie kann ich dir helfen?',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnimation.setValue(0);
    }
  }, [loading]);

  const sendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || loading) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setShowQuickPrompts(false);

    try {
      // Versuche Backend-API
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          context: 'mlm_sales',
          history: messages.slice(-5).map(m => ({
            role: m.role,
            content: m.content
          })),
        }),
      });

      let assistantContent = '';

      if (response.ok) {
        const data = await response.json();
        assistantContent = data.response || data.message || data.answer || data.content || '';
      } else {
        // Fallback: Generiere lokale Antwort
        assistantContent = generateFallbackResponse(messageText);
      }

      if (!assistantContent) {
        assistantContent = generateFallbackResponse(messageText);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      // Generiere Fallback-Antwort bei Fehler
      const fallbackResponse = generateFallbackResponse(messageText);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date(),
        isError: !fallbackResponse,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generiert eine Fallback-Antwort basierend auf Keywords
   */
  const generateFallbackResponse = (question: string): string => {
    const q = question.toLowerCase();

    // Einwand: Zu teuer
    if (q.includes('teuer') || q.includes('preis') || q.includes('geld') || q.includes('kosten')) {
      return `Hier sind bewährte Antworten auf den "Zu teuer" Einwand:

**1. Isolieren:**
"Ich verstehe. Ist es wirklich der Preis, oder gibt es noch etwas anderes?"

**2. Wert betonen:**
"Was wäre es dir wert, wenn [konkreter Nutzen]?"

**3. Vergleich:**
"Wenn du es mit [Alternative] vergleichst, zahlst du dort [X] für weniger Ergebnis."

**4. Ratenzahlung anbieten:**
"Wir können das auch in Raten aufteilen - würde das helfen?"

💡 **Tipp:** Frag immer nach dem WAHREN Einwand. "Zu teuer" ist oft ein Vorwand.`;
    }

    // Ghosting
    if (q.includes('ghost') || q.includes('antwortet nicht') || q.includes('nicht mehr')) {
      return `Anti-Ghosting Strategien:

**1. Pattern Interrupt (nach 3 Tagen):**
"Hey [Name]! Alles okay bei dir? Hab gerade an dich gedacht 🙂"

**2. Value-First (nach 5 Tagen):**
"Ich hab hier einen Artikel gefunden, der perfekt zu deiner Situation passt: [Link]"

**3. Honest Approach (nach 7 Tagen):**
"Hey, ich merke, das Timing passt gerade nicht. Kein Problem! Soll ich mich in 2-3 Monaten nochmal melden?"

**4. Fear of Missing Out (bei wichtigem Angebot):**
"Quick Update: Das Angebot läuft morgen aus. Wollte sichergehen, dass du es weißt."

💡 **Wichtig:** Nie mehr als 3 Follow-Ups ohne Antwort!`;
    }

    // Closing
    if (q.includes('closing') || q.includes('abschluss') || q.includes('abschließen')) {
      return `Effektive Closing-Techniken:

**1. Assumptive Close:**
"Super, dann machen wir das so. Startest du lieber diese Woche oder nächste?"

**2. Summary Close:**
"Lass mich zusammenfassen: Du willst [Ziel], und unser Produkt löst genau das. Der einzige Schritt jetzt ist [Aktion]. Bereit?"

**3. Soft Close:**
"Basierend auf unserem Gespräch - was hält dich noch davon ab, heute zu starten?"

**4. Urgency Close:**
"Das Starter-Paket gibt's nur diese Woche zu dem Preis. Danach steigt es auf [X]."

💡 **Regel:** Der beste Close ist der, bei dem sich der Kunde selbst überzeugt!`;
    }

    // Opener
    if (q.includes('opener') || q.includes('eröffn') || q.includes('kalt') || q.includes('linkedin')) {
      return `Cold Opener Templates:

**LinkedIn/Social:**
"Hey [Name]! Ich hab gesehen, dass du [spezifisches Detail]. Das hat mich neugierig gemacht. Was ist dein Geheimnis?"

**Warm Market:**
"Hey! 👋 Ich starte gerade ein neues Projekt und dabei hab ich an dich gedacht. Hast du 5 Minuten?"

**Event-Based:**
"Hi [Name]! Wir waren beide bei [Event]. Dein Punkt zu [Thema] hat mich echt zum Nachdenken gebracht."

**Value-First:**
"Hey! Ich habe eine Checkliste erstellt für [Problem]. Dachte, die könnte für dich interessant sein. Soll ich sie dir schicken?"

💡 **Goldene Regel:** Personalisierung schlägt Templates!`;
    }

    // Einwand allgemein
    if (q.includes('einwand') || q.includes('objection')) {
      return `Das LIRA-Framework für Einwände:

**L - Listen (Zuhören)**
Höre aktiv zu, ohne zu unterbrechen.

**I - Isolate (Isolieren)**
"Ist das der einzige Punkt, oder gibt es noch etwas?"

**R - Reframe (Umdeuten)**
Zeige eine neue Perspektive auf den Einwand.

**A - Answer & Ask (Antworten & Fragen)**
Beantworte und stelle eine Gegenfrage.

**Häufige Einwände:**
- "Keine Zeit" → "Gerade deshalb könnte das interessant sein..."
- "Muss drüber schlafen" → "Was genau beschäftigt dich noch?"
- "Ist MLM" → "Ich verstehe. Was genau ist deine Sorge dabei?"`;
    }

    // Default
    return `Gute Frage! Hier ein paar allgemeine Sales-Tipps:

**1. Fragen statt Pitchen**
Die besten Verkäufer stellen mehr Fragen, als sie reden.

**2. Problem vor Lösung**
Verstehe erst das Problem komplett, bevor du deine Lösung präsentierst.

**3. Emotionen + Logik**
Menschen kaufen emotional und rechtfertigen rational.

**4. Follow-Up ist King**
80% der Abschlüsse passieren nach dem 5. Kontakt.

Frag mich gerne spezifischer zu:
• Einwandbehandlung
• Closing Techniken
• Scripts & Formulierungen
• Lead-Qualifizierung`;
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageBubble,
      item.role === 'user' ? styles.userBubble : styles.assistantBubble,
      item.isError && styles.errorBubble,
    ]}>
      {item.role === 'assistant' && (
        <View style={styles.avatarContainer}>
          <Ionicons name="sparkles" size={16} color={COLORS.primary} />
        </View>
      )}
      <Text style={[
        styles.messageText,
        item.role === 'user' && styles.userMessageText,
      ]}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.title}>KI Sales Coach</Text>
            <Text style={styles.statusText}>
              {loading ? 'Schreibt...' : 'Online'}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={() => {
            setMessages([{
              id: Date.now().toString(),
              role: 'assistant',
              content: 'Chat wurde zurückgesetzt. Wie kann ich dir helfen?',
              timestamp: new Date(),
            }]);
            setShowQuickPrompts(true);
          }}
        >
          <Ionicons name="refresh-outline" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loading ? (
            <View style={styles.typingIndicator}>
              <Animated.View style={[styles.typingDot, { opacity: typingAnimation }]} />
              <Animated.View style={[styles.typingDot, { opacity: typingAnimation }]} />
              <Animated.View style={[styles.typingDot, { opacity: typingAnimation }]} />
            </View>
          ) : null
        }
      />

      {/* Quick Prompts */}
      {showQuickPrompts && messages.length <= 1 && (
        <View style={styles.quickPromptsContainer}>
          <Text style={styles.quickPromptsTitle}>Schnellstart</Text>
          <View style={styles.quickPrompts}>
            {QUICK_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt.id}
                style={styles.quickPromptButton}
                onPress={() => handleQuickPrompt(prompt.prompt)}
              >
                <Text style={styles.quickPromptText}>{prompt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Frag mich etwas..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage()}
            multiline
            maxLength={1000}
            editable={!loading}
          />
          <TouchableOpacity 
            style={[styles.sendButton, loading && styles.sendButtonDisabled]} 
            onPress={() => sendMessage()}
            disabled={loading || !inputText.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={inputText.trim() ? COLORS.text : COLORS.textMuted} 
              />
            )}
          </TouchableOpacity>
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
  header: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.text,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.success,
  },
  clearButton: {
    padding: SPACING.sm,
  },
  messagesList: { 
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: COLORS.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: COLORS.error + '20',
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  avatarContainer: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  messageText: { 
    color: COLORS.text, 
    fontSize: 15, 
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  quickPromptsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  quickPromptsTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  quickPrompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickPromptButton: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickPromptText: {
    color: COLORS.text,
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingRight: 50,
    color: COLORS.text,
    maxHeight: 120,
    fontSize: 15,
  },
  sendButton: {
    position: 'absolute',
    right: SPACING.md + 6,
    bottom: SPACING.md + 6,
    backgroundColor: COLORS.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { 
    backgroundColor: COLORS.card,
  },
});
