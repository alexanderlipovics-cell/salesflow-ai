/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  Quick Log Buttons Component                                                ║
 * ║  Schnelle Buttons zum Loggen von Interaktionen                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../../services/apiConfig';
import { useAuth } from '../../context/AuthContext';

interface QuickLogButtonsProps {
  contactId: string;
  onLogged?: () => void;
}

interface LogModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  onSubmit: (content: string, metadata?: any) => Promise<void>;
  placeholder?: string;
  showChannelSelector?: boolean;
}

const getApiUrl = (contactId: string) => 
  `${API_CONFIG.baseUrl.replace('/api/v1', '')}/api/v2/contacts/${contactId}/timeline`;

const LogModal: React.FC<LogModalProps> = ({
  visible,
  onClose,
  title,
  icon,
  onSubmit,
  placeholder = 'Nachricht eingeben...',
  showChannelSelector = false,
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('email');

  const channels = [
    { key: 'email', label: '📧 Email', icon: 'mail-outline' },
    { key: 'whatsapp', label: '💬 WhatsApp', icon: 'chatbubble-outline' },
    { key: 'sms', label: '📱 SMS', icon: 'phone-portrait-outline' },
    { key: 'linkedin', label: '💼 LinkedIn', icon: 'business-outline' },
  ];

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Inhalt ein.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(content, showChannelSelector ? { channel: selectedChannel } : {});
      setContent('');
      onClose();
    } catch (error) {
      Alert.alert('Fehler', 'Eintrag konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{icon} {title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          {showChannelSelector && (
            <View style={styles.channelSelector}>
              <Text style={styles.channelLabel}>Kanal:</Text>
              <View style={styles.channelButtons}>
                {channels.map((channel) => (
                  <Pressable
                    key={channel.key}
                    style={[
                      styles.channelButton,
                      selectedChannel === channel.key && styles.channelButtonActive,
                    ]}
                    onPress={() => setSelectedChannel(channel.key)}
                  >
                    <Ionicons
                      name={channel.icon as any}
                      size={18}
                      color={selectedChannel === channel.key ? 'white' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.channelButtonText,
                        selectedChannel === channel.key && styles.channelButtonTextActive,
                      ]}
                    >
                      {channel.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <TextInput
            style={styles.textInput}
            value={content}
            onChangeText={setContent}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Speichern</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const QuickLogButtons: React.FC<QuickLogButtonsProps> = ({
  contactId,
  onLogged,
}) => {
  const { user } = useAuth();
  const [messageSentModal, setMessageSentModal] = useState(false);
  const [replyReceivedModal, setReplyReceivedModal] = useState(false);
  const [callModal, setCallModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);

  const logMessageSent = async (content: string, metadata?: any) => {
    const channel = metadata?.channel || 'email';
    const response = await fetch(`${getApiUrl(contactId)}/log-message-sent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(user?.access_token && { Authorization: `Bearer ${user.access_token}` }),
      },
      body: JSON.stringify({
        channel,
        content,
        metadata: {},
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to log message');
    }

    if (onLogged) {
      onLogged();
    }
  };

  const logReplyReceived = async (content: string, metadata?: any) => {
    const channel = metadata?.channel || 'email';
    const response = await fetch(`${getApiUrl(contactId)}/log-reply-received`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(user?.access_token && { Authorization: `Bearer ${user.access_token}` }),
      },
      body: JSON.stringify({
        channel,
        content,
        metadata: {},
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to log reply');
    }

    if (onLogged) {
      onLogged();
    }
  };

  const logCall = async (content: string) => {
    const response = await fetch(`${getApiUrl(contactId)}/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(user?.access_token && { Authorization: `Bearer ${user.access_token}` }),
      },
      body: JSON.stringify({
        type: 'call',
        channel: 'phone',
        direction: 'outbound',
        content,
        metadata: {},
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to log call');
    }

    if (onLogged) {
      onLogged();
    }
  };

  const logNote = async (content: string) => {
    const response = await fetch(`${getApiUrl(contactId)}/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(user?.access_token && { Authorization: `Bearer ${user.access_token}` }),
      },
      body: JSON.stringify({
        type: 'note',
        channel: 'in_person',
        direction: 'outbound',
        content,
        metadata: {},
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to log note');
    }

    if (onLogged) {
      onLogged();
    }
  };

  const buttons = [
    {
      key: 'sent',
      label: 'Gesendet',
      icon: 'send-outline',
      color: '#3B82F6',
      onPress: () => setMessageSentModal(true),
    },
    {
      key: 'received',
      label: 'Antwort erhalten',
      icon: 'mail-outline',
      color: '#10B981',
      onPress: () => setReplyReceivedModal(true),
    },
    {
      key: 'call',
      label: 'Angerufen',
      icon: 'call-outline',
      color: '#F59E0B',
      onPress: () => setCallModal(true),
    },
    {
      key: 'note',
      label: 'Notiz',
      icon: 'create-outline',
      color: '#8B5CF6',
      onPress: () => setNoteModal(true),
    },
  ];

  return (
    <>
      <View style={styles.container}>
        {buttons.map((button) => (
          <Pressable
            key={button.key}
            style={[styles.button, { borderColor: button.color }]}
            onPress={button.onPress}
          >
            <Ionicons name={button.icon as any} size={20} color={button.color} />
            <Text style={[styles.buttonText, { color: button.color }]}>
              {button.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <LogModal
        visible={messageSentModal}
        onClose={() => setMessageSentModal(false)}
        title="Nachricht gesendet"
        icon="📤"
        onSubmit={logMessageSent}
        placeholder="Was hast du gesendet?"
        showChannelSelector={true}
      />

      <LogModal
        visible={replyReceivedModal}
        onClose={() => setReplyReceivedModal(false)}
        title="Antwort erhalten"
        icon="📥"
        onSubmit={logReplyReceived}
        placeholder="Was war die Antwort?"
        showChannelSelector={true}
      />

      <LogModal
        visible={callModal}
        onClose={() => setCallModal(false)}
        title="Anruf"
        icon="📞"
        onSubmit={logCall}
        placeholder="Notizen zum Anruf..."
      />

      <LogModal
        visible={noteModal}
        onClose={() => setNoteModal(false)}
        title="Notiz"
        icon="📝"
        onSubmit={logNote}
        placeholder="Notiz eingeben..."
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'white',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  channelSelector: {
    marginBottom: 16,
  },
  channelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  channelButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  channelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  channelButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  channelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  channelButtonTextActive: {
    color: 'white',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
    minHeight: 120,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
});

