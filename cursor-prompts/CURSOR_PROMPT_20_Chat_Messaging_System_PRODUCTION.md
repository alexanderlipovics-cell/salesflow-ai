# REACT NATIVE - CHAT/MESSAGING SYSTEM (PRODUCTION-READY)

**⚠️ ANALYSIS REPORT:**
No messaging system exists. Critical for MLM apps:
1. No in-app chat (users can't see message history)
2. No WhatsApp/Telegram integration (users leave app to message)
3. No message templates (repetitive typing)
4. No quick send (multiple taps required)
5. No auto-translate (language barrier for international teams)
6. No message status tracking (sent/delivered/read)
7. No media support (can't send images/files)
8. No message search (can't find old messages)
9. No scheduled messages (can't plan follow-ups)
10. No bulk messaging (can't message multiple leads)

---

## PART 1: MESSAGE TYPES

```typescript
// types/messaging.ts

export type MessageChannel = 'whatsapp' | 'telegram' | 'instagram_dm' | 'facebook_messenger' | 'sms' | 'email';

export type MessageStatus = 'draft' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  lead_id: string;
  user_id: string;
  channel: MessageChannel;
  direction: 'inbound' | 'outbound';
  content: string;
  translated_content?: string;
  template_id?: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'document';
  status: MessageStatus;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_reason?: string;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: 'greeting' | 'follow_up' | 'objection' | 'close' | 'custom';
  variables: string[]; // e.g. ['name', 'product']
  channel?: MessageChannel;
  language: string;
  translations?: Record<string, string>;
  usage_count: number;
  success_rate?: number;
}

export interface Conversation {
  lead_id: string;
  lead_name: string;
  lead_avatar?: string;
  last_message: Message;
  unread_count: number;
  messages: Message[];
}
```

---

## PART 2: MESSAGING SERVICE

```typescript
// services/messagingService.ts

import { Linking } from 'react-native';
import { Message, MessageChannel, MessageTemplate } from '../types/messaging';
import { apiClient } from '../api/client';

export class MessagingService {
  
  // Send via native app (WhatsApp, Telegram, etc)
  static async sendViaExternalApp(
    channel: MessageChannel,
    phoneNumber: string,
    message: string
  ): Promise<void> {
    let url = '';
    
    switch (channel) {
      case 'whatsapp':
        // Remove + and spaces from phone
        const cleanPhone = phoneNumber.replace(/[+\s]/g, '');
        url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        break;
        
      case 'telegram':
        // Telegram uses username or phone
        url = `tg://msg?to=${phoneNumber}&text=${encodeURIComponent(message)}`;
        break;
        
      case 'sms':
        url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
        break;
        
      default:
        throw new Error(`Channel ${channel} not supported for external app`);
    }
    
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      throw new Error(`Cannot open ${channel} app. Please install it first.`);
    }
  }
  
  // Send via API (for tracking and history)
  static async sendMessage(
    leadId: string,
    channel: MessageChannel,
    content: string,
    options?: {
      templateId?: string;
      mediaUrl?: string;
      scheduled?: string;
    }
  ): Promise<Message> {
    const response = await apiClient<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: leadId,
        channel,
        content,
        template_id: options?.templateId,
        media_url: options?.mediaUrl,
        scheduled_at: options?.scheduled
      })
    });
    
    return response;
  }
  
  // Get conversation history
  static async getConversation(leadId: string): Promise<Message[]> {
    const response = await apiClient<{ messages: Message[] }>(
      `/api/messages/lead/${leadId}`
    );
    
    return response.messages;
  }
  
  // Translate message
  static async translateMessage(
    content: string,
    fromLang: string,
    toLang: string
  ): Promise<string> {
    const response = await apiClient<{ translated: string }>(
      '/api/messages/translate',
      {
        method: 'POST',
        body: JSON.stringify({ content, from: fromLang, to: toLang })
      }
    );
    
    return response.translated;
  }
  
  // Apply template variables
  static applyTemplate(
    template: MessageTemplate,
    variables: Record<string, string>
  ): string {
    let content = template.content;
    
    template.variables.forEach(varName => {
      const value = variables[varName] || `[${varName}]`;
      content = content.replace(new RegExp(`{${varName}}`, 'g'), value);
    });
    
    return content;
  }
  
  // Get templates
  static async getTemplates(
    category?: string,
    channel?: MessageChannel
  ): Promise<MessageTemplate[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (channel) params.append('channel', channel);
    
    const response = await apiClient<{ templates: MessageTemplate[] }>(
      `/api/templates?${params}`
    );
    
    return response.templates;
  }
}
```

---

## PART 3: CHAT SCREEN

```tsx
// screens/ChatScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { MessagingService } from '../services/messagingService';
import { Message, MessageChannel } from '../types/messaging';
import { MessageBubble } from '../components/MessageBubble';
import { TemplateSelector } from '../components/TemplateSelector';

interface Props {
  route: {
    params: {
      leadId: string;
      leadName: string;
      leadPhone: string;
      preferredChannel: MessageChannel;
    };
  };
}

export const ChatScreen: React.FC<Props> = ({ route }) => {
  const { leadId, leadName, leadPhone, preferredChannel } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [translating, setTranslating] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    loadMessages();
  }, [leadId]);
  
  const loadMessages = async () => {
    try {
      const history = await MessagingService.getConversation(leadId);
      setMessages(history);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };
  
  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    
    try {
      // Save to backend
      const message = await MessagingService.sendMessage(
        leadId,
        preferredChannel,
        inputText
      );
      
      setMessages(prev => [...prev, message]);
      setInputText('');
      
      // Open external app
      await MessagingService.sendViaExternalApp(
        preferredChannel,
        leadPhone,
        inputText
      );
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
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
        'de', // From German
        'en'  // To English
      );
      
      Alert.alert(
        'Translation',
        translated,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Use Translation',
            onPress: () => setInputText(translated)
          }
        ]
      );
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{leadName}</Text>
        <View style={styles.channelBadge}>
          <Text style={styles.channelText}>
            {preferredChannel.toUpperCase()}
          </Text>
        </View>
      </View>
      
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />
      
      {/* Template Selector Modal */}
      {showTemplates && (
        <TemplateSelector
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
      
      {/* Input Area */}
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
            (!inputText.trim() || loading) && styles.sendButtonDisabled
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  channelBadge: {
    backgroundColor: '#25D366',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  channelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff'
  },
  messagesList: {
    padding: 16
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  templateButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  templateButtonText: {
    fontSize: 24
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 20,
    maxHeight: 100,
    fontSize: 16
  },
  translateButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  translateButtonText: {
    fontSize: 24
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FF5722',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonText: {
    fontSize: 20
  }
});
```

---

## PART 4: MESSAGE BUBBLE COMPONENT

```tsx
// components/MessageBubble.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Message } from '../types/messaging';

interface Props {
  message: Message;
  onLongPress?: () => void;
}

export const MessageBubble: React.FC<Props> = ({ message, onLongPress }) => {
  const isOutbound = message.direction === 'outbound';
  
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓'; // Blue in actual implementation
      case 'failed': return '❌';
      default: return '';
    }
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOutbound ? styles.outbound : styles.inbound
      ]}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.content,
        isOutbound ? styles.contentOutbound : styles.contentInbound
      ]}>
        {message.content}
      </Text>
      
      <View style={styles.footer}>
        <Text style={styles.time}>
          {new Date(message.created_at).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        
        {isOutbound && (
          <Text style={styles.status}> {getStatusIcon()}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16
  },
  outbound: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF5722',
    borderBottomRightRadius: 4
  },
  inbound: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4
  },
  content: {
    fontSize: 16,
    lineHeight: 22
  },
  contentOutbound: {
    color: '#fff'
  },
  contentInbound: {
    color: '#1A1A1A'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4
  },
  time: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)'
  },
  status: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)'
  }
});
```

---

## PART 5: TEMPLATE SELECTOR

```tsx
// components/TemplateSelector.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput
} from 'react-native';
import { MessagingService } from '../services/messagingService';
import { MessageTemplate } from '../types/messaging';

interface Props {
  onSelect: (content: string) => void;
  onClose: () => void;
}

export const TemplateSelector: React.FC<Props> = ({ onSelect, onClose }) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categories = ['all', 'greeting', 'follow_up', 'objection', 'close'];
  
  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);
  
  const loadTemplates = async () => {
    const category = selectedCategory === 'all' ? undefined : selectedCategory;
    const data = await MessagingService.getTemplates(category);
    setTemplates(data);
  };
  
  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.content.toLowerCase().includes(search.toLowerCase())
  );
  
  const renderTemplate = ({ item }: { item: MessageTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => onSelect(item.content)}
    >
      <View style={styles.templateHeader}>
        <Text style={styles.templateName}>{item.name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.templateContent} numberOfLines={2}>
        {item.content}
      </Text>
      <View style={styles.templateStats}>
        <Text style={styles.statText}>📊 {item.usage_count} uses</Text>
        {item.success_rate && (
          <Text style={styles.statText}>
            ✓ {Math.round(item.success_rate * 100)}% success
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
  
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Message Templates</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {/* Search */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates..."
          value={search}
          onChangeText={setSearch}
        />
        
        {/* Category Filter */}
        <View style={styles.categories}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Templates List */}
        <FlatList
          data={filteredTemplates}
          renderItem={renderTemplate}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  closeButton: {
    fontSize: 24,
    color: '#999'
  },
  searchInput: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    fontSize: 16
  },
  categories: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8
  },
  categoryChipActive: {
    backgroundColor: '#FF5722'
  },
  categoryChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600'
  },
  categoryChipTextActive: {
    color: '#fff'
  },
  list: {
    padding: 16
  },
  templateCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1
  },
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  categoryText: {
    fontSize: 10,
    color: '#2196F3',
    fontWeight: '600'
  },
  templateContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  templateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statText: {
    fontSize: 12,
    color: '#999'
  }
});
```

---

## IMPLEMENTATION CHECKLIST

**Backend API:**
- [ ] POST `/api/messages` - Send message
- [ ] GET `/api/messages/lead/:id` - Get conversation
- [ ] POST `/api/messages/translate` - Translate message
- [ ] GET `/api/templates` - Get templates
- [ ] POST `/api/templates` - Create template

**Services:**
- [ ] Create `services/messagingService.ts`
- [ ] Test WhatsApp deep linking
- [ ] Test Telegram deep linking
- [ ] Test translation API

**Components:**
- [ ] Create `components/MessageBubble.tsx`
- [ ] Create `components/TemplateSelector.tsx`
- [ ] Add status icons (sent, delivered, read)

**Screens:**
- [ ] Create `screens/ChatScreen.tsx`
- [ ] Add to navigation stack
- [ ] Test keyboard behavior

**Testing:**
- [ ] Test send message (WhatsApp)
- [ ] Test send message (Telegram)
- [ ] Test template selection
- [ ] Test translation
- [ ] Test message history
- [ ] Test status updates

---

BEGIN IMPLEMENTATION.
