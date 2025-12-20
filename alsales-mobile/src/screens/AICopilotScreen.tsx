import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = 'https://salesflow-ai.onrender.com';
const { width } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isFirst?: boolean;
}

const quickActions = [
  { icon: '🔍', label: 'Lead analysieren' },
  { icon: '✏️', label: 'Follow-up schreiben' },
  { icon: '💪', label: 'Einwand behandeln' },
  { icon: '🎯', label: 'Abschluss-Strategie' },
  { icon: '📊', label: 'Performance' },
  { icon: '⚠️', label: 'Gefährdete Leads' },
];

export default function AICopilotScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Was können wir heute in deiner Pipeline bewegen?',
      timestamp: new Date(),
      isFirst: true,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  // Pulse animation for avatar when loading
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading]);

  // Glow animation for status dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const sendMessage = async (customText?: string) => {
    const messageText = customText || inputText.trim();
    if (!messageText || loading) return;

    // KRITISCH: Tastatur sofort schließen!
    Keyboard.dismiss();
    inputRef.current?.blur();

    setShowSuggestions(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('access_token');
      
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageText,
          include_context: true,
          conversation_history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
        }),
      });

      const data = await response.json();
      const reply = data?.message || data?.reply || data?.response || generateFallback(messageText);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const fallbackResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateFallback(messageText),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setLoading(false);
    }
  };

  const generateFallback = (input: string): string => {
    const lower = input.toLowerCase();
    if (lower.includes('follow')) return '📝 Hier ist ein Follow-up Vorschlag:\n\n"Hallo,\n\nich wollte kurz nachhaken, ob du Zeit hattest, über unser Gespräch nachzudenken.\n\nGibt es noch Fragen?\n\nBeste Grüße"';
    if (lower.includes('einwand')) return '💪 Bei Preiseinwänden:\n\n1. Wert betonen\n2. ROI aufzeigen\n3. Vergleiche nutzen';
    if (lower.includes('lead')) return '🎯 Fokussiere dich auf deine Hot Leads. Sie haben die höchste Conversion-Rate.';
    return '👍 Verstanden! Ich helfe dir gerne. Gib mir mehr Details.';
  };

  const handleVoiceInput = () => {
    Keyboard.dismiss();
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => setIsListening(false), 3000);
    }
  };

  const handleScreenshot = async () => {
    Keyboard.dismiss();
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: '📸 Screenshot zur Analyse...',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setShowSuggestions(false);
        setLoading(true);

        setTimeout(() => {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '✅ Kontakt erkannt!\n\n👤 Max Mustermann\n📱 +49 151 12345678\n📧 max@beispiel.de\n\nSoll ich diesen Lead speichern?',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMsg]);
          setLoading(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Screenshot error:', error);
    }
  };

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <View style={[
      styles.messageRow,
      item.role === 'user' ? styles.userRow : styles.assistantRow,
    ]}>
      {item.role === 'assistant' && (
        <Animated.View style={[
          styles.avatarContainer,
          loading && index === messages.length - 1 && { transform: [{ scale: pulseAnim }] }
        ]}>
          <View style={styles.avatarGradient}>
            <Text style={styles.avatarIcon}>⬡</Text>
          </View>
        </Animated.View>
      )}
      <View style={[
        styles.bubble,
        item.role === 'user' ? styles.userBubble : styles.assistantBubble,
      ]}>
        {item.isFirst && (
          <Text style={styles.greeting}>Hey! 👋 Ich bin CHIEF.</Text>
        )}
        <Text style={[
          styles.bubbleText,
          item.isFirst && styles.bubbleTextAfterGreeting
        ]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Glassmorphism Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>CHIEF</Text>
          <Text style={styles.subtitle}>AI Sales Assistant</Text>
        </View>
        <View style={styles.statusContainer}>
          <Animated.View style={[styles.statusGlow, { opacity: glowAnim }]} />
          <View style={styles.statusDot} />
        </View>
      </View>

      {/* Quick Actions Carousel */}
      <View style={styles.actionsWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionChip}
              onPress={() => sendMessage(action.label)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messages - Tap to dismiss keyboard */}
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.messagesWrapper}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={true}
            inverted={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            style={{ flex: 1 }}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingRow}>
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.avatarGradient}>
              <Text style={styles.avatarIcon}>⬡</Text>
            </View>
          </Animated.View>
          <View style={styles.loadingBubble}>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        </View>
      )}

      {/* Smart Suggestions */}
      {showSuggestions && messages.length <= 1 && (
        <View style={styles.suggestionsRow}>
          <TouchableOpacity 
            style={styles.suggestionChip}
            onPress={() => sendMessage('Was soll ich heute tun?')}
          >
            <Text style={styles.suggestionText}>🎯 Was soll ich tun?</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.suggestionChip}
            onPress={() => sendMessage('Zeig mir meine Performance')}
          >
            <Text style={styles.suggestionText}>📊 Meine Performance</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Input Bar */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputBar}>
          <TouchableOpacity 
            style={[styles.iconBtn, isListening && styles.iconBtnActive]}
            onPress={handleVoiceInput}
          >
            <Text style={styles.iconBtnText}>{isListening ? '🔴' : '🎤'}</Text>
          </TouchableOpacity>
          
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Nachricht an CHIEF..."
            placeholderTextColor="#6B7280"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={true}
            onSubmitEditing={() => sendMessage()}
          />

          <TouchableOpacity 
            style={styles.iconBtn}
            onPress={handleScreenshot}
          >
            <Text style={styles.iconBtnText}>📸</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || loading}
          >
            <Text style={styles.sendBtnIcon}>✨</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  // Glassmorphism Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statusContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  // Quick Actions Carousel
  actionsWrapper: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  actionsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.4)',
    marginRight: 10,
  },
  actionIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  actionLabel: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '500',
  },
  // Messages
  messagesWrapper: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarIcon: {
    fontSize: 22,
    color: '#06B6D4',
  },
  bubble: {
    maxWidth: '75%',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#06B6D4',
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: '#1F2937',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.6)',
  },
  greeting: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 24,
  },
  bubbleTextAfterGreeting: {
    color: '#D1D5DB',
  },
  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  loadingBubble: {
    backgroundColor: '#1F2937',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.6)',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#06B6D4',
    opacity: 0.4,
  },
  dot1: { opacity: 1 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.3 },
  // Suggestions
  suggestionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  suggestionChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  suggestionText: {
    color: '#06B6D4',
    fontSize: 13,
    fontWeight: '500',
  },
  // Floating Input
  inputWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 34,
    paddingTop: 10,
    backgroundColor: '#0B0F19',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(55, 65, 81, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  iconBtnText: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  sendBtnDisabled: {
    backgroundColor: '#374151',
    shadowOpacity: 0,
  },
  sendBtnIcon: {
    fontSize: 18,
  },
});
