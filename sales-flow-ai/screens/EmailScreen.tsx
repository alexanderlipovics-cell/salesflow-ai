import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { apiClient } from '../services/api';

interface EmailAccount {
  id: string;
  provider: string;
  email_address: string;
  sync_status: string;
  last_sync_at: string;
}

interface EmailMessage {
  id: string;
  from_address: string;
  to_addresses: string[];
  subject: string;
  body_text: string;
  body_html: string;
  direction: 'inbound' | 'outbound';
  sent_at: string;
}

export const EmailScreen = ({ route }: any) => {
  const { leadId } = route.params || {};
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [composing, setComposing] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      await loadAccounts();
      await loadMessages();
    } finally {
      setLoading(false);
    }
  };
  
  const loadAccounts = async () => {
    try {
      const response = await apiClient.get('/email/accounts');
      setAccounts(response.data);
      if (response.data.length > 0 && !selectedAccount) {
        setSelectedAccount(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };
  
  const loadMessages = async () => {
    try {
      const params = leadId ? { lead_id: leadId } : {};
      const response = await apiClient.get('/email/messages', { params });
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };
  
  const connectAccount = async (provider: 'gmail' | 'outlook') => {
    try {
      const response = await apiClient.post('/email/connect', {
        provider,
        redirect_uri: 'salesflowai://email-callback'
      });
      
      // Open auth URL
      if (typeof window !== 'undefined') {
        window.open(response.data.auth_url, '_blank');
      }
      
      Alert.alert(
        'Verbindung wird hergestellt',
        'Bitte autorisiere die Verbindung im geöffneten Fenster.'
      );
    } catch (error) {
      Alert.alert('Fehler', 'Verbindung konnte nicht hergestellt werden.');
    }
  };
  
  const sendEmail = async () => {
    if (!selectedAccount || !to || !subject) {
      Alert.alert('Fehler', 'Bitte fülle alle Pflichtfelder aus.');
      return;
    }
    
    try {
      setSending(true);
      await apiClient.post('/email/send', {
        account_id: selectedAccount.id,
        to,
        subject,
        body,
        lead_id: leadId
      });
      
      setComposing(false);
      setTo('');
      setSubject('');
      setBody('');
      
      Alert.alert('Erfolg', 'Email wurde versendet!');
      await loadMessages();
    } catch (error) {
      Alert.alert('Fehler', 'Email konnte nicht versendet werden.');
    } finally {
      setSending(false);
    }
  };
  
  const syncEmails = async () => {
    if (!selectedAccount) return;
    
    try {
      await apiClient.post(`/email/sync/${selectedAccount.id}`);
      Alert.alert('Sync gestartet', 'Emails werden synchronisiert...');
      
      // Reload after a delay
      setTimeout(loadMessages, 3000);
    } catch (error) {
      Alert.alert('Fehler', 'Sync konnte nicht gestartet werden.');
    }
  };
  
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {accounts.length === 0 ? (
          <View className="bg-white rounded-lg p-6">
            <Text className="text-2xl font-bold mb-4">Email-Account verbinden</Text>
            <Text className="text-gray-600 mb-6">
              Verbinde dein Email-Konto, um direkt aus Sales Flow AI zu kommunizieren.
            </Text>
            
            <TouchableOpacity
              onPress={() => connectAccount('gmail')}
              className="bg-red-500 p-4 rounded-lg mb-3 flex-row items-center justify-center"
            >
              <Text className="text-white font-bold text-lg">📧 Gmail verbinden</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => connectAccount('outlook')}
              className="bg-blue-600 p-4 rounded-lg flex-row items-center justify-center"
            >
              <Text className="text-white font-bold text-lg">📨 Outlook verbinden</Text>
            </TouchableOpacity>
          </View>
        ) : composing ? (
          <View className="bg-white rounded-lg p-4">
            <Text className="text-xl font-bold mb-4">Neue Email</Text>
            
            <Text className="text-sm font-medium text-gray-700 mb-1">An:</Text>
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="empfaenger@example.com"
              className="border border-gray-300 rounded-lg p-3 mb-4"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Text className="text-sm font-medium text-gray-700 mb-1">Betreff:</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Betreff"
              className="border border-gray-300 rounded-lg p-3 mb-4"
            />
            
            <Text className="text-sm font-medium text-gray-700 mb-1">Nachricht:</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Deine Nachricht..."
              className="border border-gray-300 rounded-lg p-3 mb-4 h-40"
              multiline
              textAlignVertical="top"
            />
            
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={sendEmail}
                disabled={sending}
                className={`flex-1 p-4 rounded-lg ${sending ? 'bg-gray-400' : 'bg-blue-600'}`}
              >
                <Text className="text-white text-center font-bold">
                  {sending ? 'Sende...' : '📤 Senden'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setComposing(false)}
                className="flex-1 bg-gray-300 p-4 rounded-lg"
              >
                <Text className="text-gray-700 text-center font-bold">Abbrechen</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View className="bg-white rounded-lg p-4 mb-4 flex-row justify-between items-center">
              <View>
                <Text className="text-xl font-bold">Emails</Text>
                <Text className="text-gray-600">
                  {selectedAccount?.email_address}
                </Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={syncEmails}
                  className="bg-gray-200 px-4 py-2 rounded-lg"
                >
                  <Text>🔄 Sync</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setComposing(true)}
                  className="bg-blue-600 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-bold">✍️ Verfassen</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {messages.length === 0 ? (
              <View className="bg-white rounded-lg p-6 items-center">
                <Text className="text-gray-500 text-center">
                  Keine Emails vorhanden. Klicke auf "Sync", um Emails zu laden.
                </Text>
              </View>
            ) : (
              <FlatList
                data={messages}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="font-bold text-gray-900">
                          {item.direction === 'inbound' ? `📩 ${item.from_address}` : `📤 An: ${item.to_addresses[0]}`}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-1">
                          {new Date(item.sent_at).toLocaleString('de-DE')}
                        </Text>
                      </View>
                    </View>
                    
                    <Text className="font-semibold text-gray-800 mb-2">
                      {item.subject || '(Kein Betreff)'}
                    </Text>
                    
                    <Text className="text-gray-600 text-sm" numberOfLines={3}>
                      {item.body_text || item.body_html || '(Keine Nachricht)'}
                    </Text>
                  </View>
                )}
              />
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default EmailScreen;

