import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MessagingService } from '../../services/messagingService';
import { Message, MessageChannel } from '../../types/messaging';
import { MessageBubble } from '../../components/MessageBubble';
import { TemplateSelector } from '../../components/TemplateSelector';
import { logger } from '../../utils/logger';

interface RouteParams {
  leadId: string;
  leadName?: string;
  leadPhone?: string;
  channel?: MessageChannel;
}

const DEFAULT_CHANNEL: MessageChannel = 'whatsapp';

export default function ChatScreen() {
  const params = useLocalSearchParams<RouteParams>();
  const leadId = params.leadId;
  const leadName = params.leadName || 'Lead';
  const leadPhone = params.leadPhone || '';
  const preferredChannel = (params.channel as MessageChannel) || DEFAULT_CHANNEL;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [translating, setTranslating] = useState(false);

  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (leadId) {
      loadMessages();
    }
  }, [leadId]);

  const loadMessages = async () => {
    try {
      const history = await MessagingService.getConversation(leadId);
      setMessages(history);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 0);
    } catch (error) {
      logger.error('Failed to load messages', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) {
      return;
    }
    setLoading(true);
    try {
      const message = await MessagingService.sendMessage(
        leadId,
        preferredChannel,
        inputText
      );
      setMessages((prev) => [...prev, message]);
      setInputText('');

      if (leadPhone) {
        await MessagingService.sendViaExternalApp(
          preferredChannel,
          leadPhone,
          inputText
        );
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateContent: string) => {
    setInputText(templateContent);
    setShowTemplates(false);
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setTranslating(true);
    try {
      const translated = await MessagingService.translateMessage(
        inputText,
        'de',
        'en'
      );
      Alert.alert('Translation', translated, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Translation',
          onPress: () => setInputText(translated),
        },
      ]);
    } catch (error) {
      Alert.alert('Translation failed', 'Please try again');
    } finally {
      setTranslating(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{leadName}</Text>
        <View style={styles.channelBadge}>
          <Text style={styles.channelText}>{preferredChannel.toUpperCase()}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {showTemplates && (
        <TemplateSelector
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.templateButton}
          onPress={() => setShowTemplates(true)}
        >
          <Text style={styles.templateButtonText}>📝</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={styles.translateButton}
          onPress={handleTranslate}
          disabled={translating || !inputText.trim()}
        >
          <Text style={styles.translateButtonText}>🌐</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || loading) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
        >
          <Text style={styles.sendButtonText}>
            {loading ? '...' : '📤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  channelBadge: {
    backgroundColor: '#25D366',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  channelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  templateButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  templateButtonText: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 20,
    maxHeight: 100,
    fontSize: 16,
  },
  translateButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  translateButtonText: {
    fontSize: 24,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FF5722',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 20,
  },
});


