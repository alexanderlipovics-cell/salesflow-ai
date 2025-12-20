import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  FlatList,
} from 'react-native';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://salesflow-ai.onrender.com';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: string;
  bant_score: number;
  temperature: string;
  instagram: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  platform: string;
  notes: string | null;
  created_at: string;
  last_contacted?: string;
  next_follow_up?: string;
}

interface TimelineItem {
  id: string;
  type: 'message_sent' | 'message_received' | 'call' | 'note' | 'status_change' | 'follow_up';
  content: string;
  timestamp: Date;
  platform?: string;
}

interface Props {
  leadId: string;
  onBack: () => void;
}

const getScoreColor = (score: number): string => {
  if (score >= 70) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
};

const MESSAGE_TEMPLATES = [
  { icon: '👋', label: 'Erstkontakt', key: 'first_contact' },
  { icon: '🔄', label: 'Follow-up', key: 'follow_up' },
  { icon: '↩️', label: 'Antwort', key: 'reply' },
  { icon: '📅', label: 'Termin', key: 'meeting' },
  { icon: '🎁', label: 'Angebot', key: 'offer' },
];

export default function LeadDetailScreen({ leadId, onBack }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageType, setMessageType] = useState<string>('follow_up');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [commandText, setCommandText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState<Lead | null>(null);
  
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLead();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadLead = async () => {
    try {
      const leads = await api.getLeads();
      const found = leads.find((l: Lead) => l.id === leadId);
      if (found) {
        setLead(found);
        setEditedLead(found);
        loadTimeline(found);
      }
    } catch (error) {
      console.log('Error loading lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = (leadData: Lead) => {
    // Generate sample timeline based on lead data
    const items: TimelineItem[] = [];
    
    // Add creation event
    items.push({
      id: '1',
      type: 'note',
      content: `Lead erstellt via ${leadData.platform || 'Web'}`,
      timestamp: new Date(leadData.created_at),
    });

    // If there are notes, add them
    if (leadData.notes) {
      items.push({
        id: '2',
        type: 'note',
        content: leadData.notes,
        timestamp: new Date(Date.now() - 86400000),
      });
    }

    setTimeline(items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  };

  const showFeedbackToast = (message: string) => {
    setFeedbackMessage(message);
    setShowFeedback(true);
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(feedbackAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowFeedback(false));
  };

  const addToTimeline = (type: TimelineItem['type'], content: string, platform?: string) => {
    const newItem: TimelineItem = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      platform,
    };
    setTimeline(prev => [newItem, ...prev]);
    
    // Update last_contacted
    if (lead) {
      setLead({ ...lead, last_contacted: new Date().toISOString() });
    }
  };

  const generateMessage = async (type: string, context?: string) => {
    setGenerating(true);
    setMessageType(type);
    
    const lastMessage = timeline.find(t => t.type === 'message_received')?.content || '';
    
    let prompt = '';
    switch (type) {
      case 'first_contact':
        prompt = `Schreibe eine freundliche Erstkontakt-Nachricht für ${lead?.name}${lead?.company ? ` von ${lead.company}` : ''}. Plattform: ${lead?.platform || 'WhatsApp'}. Kurz und persönlich, max 3 Sätze.`;
        break;
      case 'follow_up':
        prompt = `Schreibe eine Follow-up Nachricht für ${lead?.name}. Wir hatten bereits Kontakt aber keine Antwort erhalten. Freundlich nachfassen, max 2-3 Sätze.`;
        break;
      case 'reply':
        prompt = `Schreibe eine Antwort für ${lead?.name}. ${lastMessage ? `Seine letzte Nachricht war: "${lastMessage}". ` : ''}${context ? `Kontext: ${context}. ` : ''}Natürlich und hilfreich, max 3 Sätze.`;
        break;
      case 'meeting':
        prompt = `Schreibe eine Nachricht um einen Termin mit ${lead?.name} zu vereinbaren. Schlage 2-3 Zeitfenster vor, professionell aber freundlich.`;
        break;
      case 'offer':
        prompt = `Schreibe eine Nachricht mit einem Angebot für ${lead?.name}${lead?.company ? ` (${lead.company})` : ''}. Wecke Interesse ohne zu pushy zu sein.`;
        break;
      default:
        prompt = `Schreibe eine Nachricht für ${lead?.name}. ${context || ''}`;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await response.json();
      setGeneratedMessage(data?.message || data?.reply || getFallbackMessage(type));
    } catch (error) {
      setGeneratedMessage(getFallbackMessage(type));
    } finally {
      setGenerating(false);
    }
  };

  const getFallbackMessage = (type: string): string => {
    switch (type) {
      case 'first_contact':
        return `Hallo ${lead?.name}! 👋\n\nIch bin auf dein Profil aufmerksam geworden und finde deinen Werdegang spannend. Hättest du Interesse an einem kurzen Austausch?\n\nBeste Grüße`;
      case 'follow_up':
        return `Hey ${lead?.name}!\n\nIch wollte kurz nachhaken - hattest du Zeit, über unser letztes Gespräch nachzudenken? Bin gespannt auf dein Feedback!\n\nLG`;
      case 'reply':
        return `Danke für deine Nachricht, ${lead?.name}!\n\nDas klingt super interessant. Lass uns gerne vertiefen - wann passt es dir am besten?\n\nLG`;
      case 'meeting':
        return `Hi ${lead?.name}!\n\nWie wäre es mit einem kurzen Call? Ich hätte Zeit:\n• Morgen 10-12 Uhr\n• Übermorgen 14-16 Uhr\n\nWas passt dir besser?`;
      default:
        return `Hallo ${lead?.name}!\n\nIch hoffe, es geht dir gut. Melde dich gerne, wenn du Fragen hast!\n\nLG`;
    }
  };

  const handleSendMessage = async (platform: string) => {
    if (!generatedMessage.trim()) return;

    // Add to timeline
    addToTimeline('message_sent', generatedMessage, platform);

    // Open the app
    const num = lead?.whatsapp || lead?.phone;
    if (platform === 'whatsapp' && num) {
      const encoded = encodeURIComponent(generatedMessage);
      Linking.openURL(`whatsapp://send?phone=${num.replace(/[^0-9]/g, '')}&text=${encoded}`);
    } else if (platform === 'instagram' && lead?.instagram) {
      Linking.openURL(`instagram://user?username=${lead.instagram}`);
    } else if (platform === 'email' && lead?.email) {
      const encoded = encodeURIComponent(generatedMessage);
      Linking.openURL(`mailto:${lead.email}?body=${encoded}`);
    }

    // Update status
    if (lead && lead.status === 'new') {
      setLead({ ...lead, status: 'contacted', last_contacted: new Date().toISOString() });
    }

    showFeedbackToast('✅ Nachricht gesendet & Timeline aktualisiert');
    setShowMessageModal(false);
    setGeneratedMessage('');
  };

  const processCommand = async (command: string) => {
    if (!command.trim()) return;
    Keyboard.dismiss();
    
    const lower = command.toLowerCase();

    if (lower.includes('nachricht') || lower.includes('schreib') || lower.includes('message')) {
      if (lower.includes('antwort') || lower.includes('reply')) {
        setShowMessageModal(true);
        generateMessage('reply', command);
      } else if (lower.includes('follow')) {
        setShowMessageModal(true);
        generateMessage('follow_up');
      } else if (lower.includes('erst') || lower.includes('intro')) {
        setShowMessageModal(true);
        generateMessage('first_contact');
      } else {
        setShowMessageModal(true);
        generateMessage('follow_up', command);
      }
    } else if (lower.includes('anruf') || lower.includes('call')) {
      addToTimeline('call', `Anruf protokolliert`);
      showFeedbackToast('📞 Anruf in Timeline gespeichert');
    } else if (lower.includes('notiz') || lower.includes('note')) {
      const note = command.replace(/notiz:?|note:?/gi, '').trim();
      addToTimeline('note', note || 'Notiz hinzugefügt');
      showFeedbackToast('📝 Notiz gespeichert');
    } else if (lower.includes('hot') || lower.includes('heiß')) {
      if (lead) setLead({ ...lead, temperature: 'hot', bant_score: 80 });
      addToTimeline('status_change', 'Lead als HOT markiert 🔥');
      showFeedbackToast('🔥 Lead ist jetzt HOT');
    } else if (lower.includes('termin') || lower.includes('meeting')) {
      setShowMessageModal(true);
      generateMessage('meeting');
    } else if (lower.includes('gewonnen') || lower.includes('won') || lower.includes('deal')) {
      if (lead) setLead({ ...lead, status: 'won', temperature: 'hot' });
      addToTimeline('status_change', '🎉 Deal gewonnen!');
      showFeedbackToast('🎉 Herzlichen Glückwunsch zum Deal!');
    } else {
      addToTimeline('note', command);
      showFeedbackToast('📝 Gespeichert');
    }

    setCommandText('');
  };

  const handleAction = (type: string) => {
    if (!lead) return;
    switch (type) {
      case 'call':
        if (lead.phone) {
          Linking.openURL(`tel:${lead.phone}`);
          addToTimeline('call', 'Ausgehender Anruf');
        } else {
          Alert.alert('Keine Nummer');
        }
        break;
      case 'whatsapp':
        const num = lead.whatsapp || lead.phone;
        if (num) {
          setShowMessageModal(true);
          generateMessage('follow_up');
        } else {
          Alert.alert('Keine Nummer');
        }
        break;
      case 'email':
        if (lead.email) {
          setShowMessageModal(true);
          generateMessage('follow_up');
        } else {
          Alert.alert('Keine Email');
        }
        break;
      case 'instagram':
        if (lead.instagram) {
          setShowMessageModal(true);
          generateMessage('first_contact');
        } else {
          Alert.alert('Kein Instagram');
        }
        break;
    }
  };

  const handleSaveLead = async () => {
    if (!editedLead) return;
    setLead(editedLead);
    setEditMode(false);
    addToTimeline('note', 'Kontaktdaten aktualisiert');
    showFeedbackToast('✅ Lead gespeichert');
  };

  const renderTimelineItem = ({ item }: { item: TimelineItem }) => {
    const icons: Record<string, string> = {
      message_sent: '📤',
      message_received: '📥',
      call: '📞',
      note: '📝',
      status_change: '🔄',
      follow_up: '🔔',
    };

    const colors: Record<string, string> = {
      message_sent: '#06B6D4',
      message_received: '#10B981',
      call: '#8B5CF6',
      note: '#F59E0B',
      status_change: '#EC4899',
      follow_up: '#EF4444',
    };

    return (
      <View style={styles.timelineItem}>
        <View style={[styles.timelineDot, { backgroundColor: colors[item.type] + '30' }]}>
          <Text style={styles.timelineIcon}>{icons[item.type]}</Text>
        </View>
        <View style={styles.timelineContent}>
          <Text style={styles.timelineText}>{item.content}</Text>
          <Text style={styles.timelineTime}>
            {item.timestamp.toLocaleDateString('de-DE')} {item.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            {item.platform && ` • ${item.platform}`}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Lead nicht gefunden</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const score = lead.bant_score || 30;
  const scoreColor = getScoreColor(score);

  return (
    <View style={styles.container}>
      {/* Feedback Toast */}
      {showFeedback && (
        <Animated.View style={[styles.feedbackToast, { opacity: feedbackAnim }]}>
          <Text style={styles.feedbackText}>{feedbackMessage}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Zurück</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => editMode ? handleSaveLead() : setEditMode(true)}>
          <Text style={styles.editBtnText}>{editMode ? '💾 Speichern' : '✏️'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
              <View style={styles.avatarInner}>
                <Text style={[styles.avatarText, { color: scoreColor }]}>
                  {(lead.name?.[0] || '?').toUpperCase()}
                </Text>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                <Text style={styles.scoreBadgeText}>{score}</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              {editMode ? (
                <TextInput
                  style={styles.editInput}
                  value={editedLead?.name || ''}
                  onChangeText={(t) => setEditedLead(prev => prev ? {...prev, name: t} : null)}
                  placeholder="Name"
                  placeholderTextColor="#6B7280"
                />
              ) : (
                <Text style={styles.profileName}>{lead.name}</Text>
              )}
              {editMode ? (
                <TextInput
                  style={[styles.editInput, styles.editInputSmall]}
                  value={editedLead?.company || ''}
                  onChangeText={(t) => setEditedLead(prev => prev ? {...prev, company: t} : null)}
                  placeholder="Firma"
                  placeholderTextColor="#6B7280"
                />
              ) : (
                lead.company && <Text style={styles.profileCompany}>{lead.company}</Text>
              )}
              <View style={styles.badges}>
                <View style={[styles.tempBadge, { backgroundColor: lead.temperature === 'hot' ? '#EF444430' : lead.temperature === 'warm' ? '#F59E0B30' : '#3B82F630' }]}>
                  <Text style={styles.tempText}>
                    {lead.temperature === 'hot' ? '🔥 Hot' : lead.temperature === 'warm' ? '☀️ Warm' : '❄️ Cold'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#06B6D430' }]}>
                  <Text style={styles.statusText}>{lead.status}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <Animated.View style={{ transform: [{ scale: lead.phone ? pulseAnim : 1 }] }}>
            <TouchableOpacity 
              style={[styles.actionBtn, lead.phone && styles.actionBtnActive]}
              onPress={() => handleAction('call')}
            >
              <Text style={styles.actionIcon}>📞</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity 
            style={[styles.actionBtn, (lead.phone || lead.whatsapp) && styles.actionBtnActive]}
            onPress={() => handleAction('whatsapp')}
          >
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, lead.email && styles.actionBtnActive]}
            onPress={() => handleAction('email')}
          >
            <Text style={styles.actionIcon}>📧</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, lead.instagram && styles.actionBtnActive]}
            onPress={() => handleAction('instagram')}
          >
            <Text style={styles.actionIcon}>📷</Text>
          </TouchableOpacity>
        </View>

        {/* Message Templates */}
        <View style={styles.templatesSection}>
          <Text style={styles.sectionTitle}>🪄 Nachricht generieren</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.templatesRow}>
              {MESSAGE_TEMPLATES.map((tmpl) => (
                <TouchableOpacity
                  key={tmpl.key}
                  style={styles.templateChip}
                  onPress={() => {
                    setShowMessageModal(true);
                    generateMessage(tmpl.key);
                  }}
                >
                  <Text style={styles.templateIcon}>{tmpl.icon}</Text>
                  <Text style={styles.templateLabel}>{tmpl.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Contact Data - Editable */}
        {editMode && (
          <View style={styles.editSection}>
            <Text style={styles.sectionTitle}>📇 Kontaktdaten bearbeiten</Text>
            <View style={styles.editGrid}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>📱 Telefon</Text>
                <TextInput
                  style={styles.editInputField}
                  value={editedLead?.phone || ''}
                  onChangeText={(t) => setEditedLead(prev => prev ? {...prev, phone: t} : null)}
                  placeholder="+49..."
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>📧 Email</Text>
                <TextInput
                  style={styles.editInputField}
                  value={editedLead?.email || ''}
                  onChangeText={(t) => setEditedLead(prev => prev ? {...prev, email: t} : null)}
                  placeholder="email@..."
                  placeholderTextColor="#6B7280"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>📷 Instagram</Text>
                <TextInput
                  style={styles.editInputField}
                  value={editedLead?.instagram || ''}
                  onChangeText={(t) => setEditedLead(prev => prev ? {...prev, instagram: t} : null)}
                  placeholder="@username"
                  placeholderTextColor="#6B7280"
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>💬 WhatsApp</Text>
                <TextInput
                  style={styles.editInputField}
                  value={editedLead?.whatsapp || ''}
                  onChangeText={(t) => setEditedLead(prev => prev ? {...prev, whatsapp: t} : null)}
                  placeholder="+49..."
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>📜 Timeline</Text>
          {timeline.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Text style={styles.emptyTimelineText}>Noch keine Aktivitäten</Text>
            </View>
          ) : (
            timeline.map((item) => (
              <View key={item.id}>
                {renderTimelineItem({ item })}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 180 }} />
      </ScrollView>

      {/* Chief Command Bar */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.commandBarWrapper}
      >
        <View style={styles.commandBar}>
          <TouchableOpacity 
            style={[styles.voiceBtn, isListening && styles.voiceBtnActive]}
            onPress={() => setIsListening(!isListening)}
          >
            <Text style={styles.voiceBtnIcon}>{isListening ? '🔴' : '🎤'}</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.commandInput}
            placeholder="Sag dem Chief was zu tun ist..."
            placeholderTextColor="#6B7280"
            value={commandText}
            onChangeText={setCommandText}
            onSubmitEditing={() => processCommand(commandText)}
            returnKeyType="send"
            blurOnSubmit={true}
          />

          <TouchableOpacity 
            style={[styles.sendBtn, !commandText.trim() && styles.sendBtnDisabled]}
            onPress={() => processCommand(commandText)}
            disabled={!commandText.trim()}
          >
            <Text style={styles.sendBtnIcon}>✨</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Message Generator Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🪄 Nachricht für {lead.name}</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {generating ? (
              <View style={styles.generatingBox}>
                <ActivityIndicator color="#06B6D4" />
                <Text style={styles.generatingText}>Chief schreibt...</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.messageInput}
                  value={generatedMessage}
                  onChangeText={setGeneratedMessage}
                  multiline
                  placeholder="Nachricht hier..."
                  placeholderTextColor="#6B7280"
                />

                <View style={styles.regenerateRow}>
                  {MESSAGE_TEMPLATES.slice(0, 4).map((tmpl) => (
                    <TouchableOpacity
                      key={tmpl.key}
                      style={styles.regenerateChip}
                      onPress={() => generateMessage(tmpl.key)}
                    >
                      <Text style={styles.regenerateText}>{tmpl.icon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.sendOptions}>
                  {(lead.whatsapp || lead.phone) && (
                    <TouchableOpacity 
                      style={[styles.sendOptionBtn, styles.sendOptionWhatsapp]}
                      onPress={() => handleSendMessage('whatsapp')}
                    >
                      <Text style={styles.sendOptionText}>💬 WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                  {lead.instagram && (
                    <TouchableOpacity 
                      style={[styles.sendOptionBtn, styles.sendOptionInstagram]}
                      onPress={() => handleSendMessage('instagram')}
                    >
                      <Text style={styles.sendOptionText}>📷 Instagram</Text>
                    </TouchableOpacity>
                  )}
                  {lead.email && (
                    <TouchableOpacity 
                      style={[styles.sendOptionBtn, styles.sendOptionEmail]}
                      onPress={() => handleSendMessage('email')}
                    >
                      <Text style={styles.sendOptionText}>📧 Email</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.copyBtn}
                  onPress={() => {
                    showFeedbackToast('📋 Kopiert!');
                  }}
                >
                  <Text style={styles.copyBtnText}>📋 Nur kopieren</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 16,
  },
  backLink: {
    color: '#06B6D4',
    fontSize: 16,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    color: '#06B6D4',
    fontSize: 16,
    fontWeight: '600',
  },
  editBtnText: {
    color: '#06B6D4',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  // Feedback
  feedbackToast: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    zIndex: 1000,
    alignItems: 'center',
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Profile
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  avatarInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scoreBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileCompany: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  tempBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tempText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#06B6D4',
    fontSize: 12,
    fontWeight: '600',
  },
  editInput: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(55, 65, 81, 0.4)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  editInputSmall: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(55, 65, 81, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  actionIcon: {
    fontSize: 24,
  },
  // Templates
  templatesSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  templatesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  templateIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  templateLabel: {
    color: '#06B6D4',
    fontSize: 13,
    fontWeight: '500',
  },
  // Edit Section
  editSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  editGrid: {
    gap: 12,
  },
  editField: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 12,
    padding: 12,
  },
  editLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 6,
  },
  editInputField: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  // Timeline
  timelineSection: {
    paddingHorizontal: 16,
  },
  emptyTimeline: {
    backgroundColor: 'rgba(31, 41, 55, 0.3)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyTimelineText: {
    color: '#6B7280',
    fontSize: 14,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineIcon: {
    fontSize: 18,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: 'rgba(31, 41, 55, 0.4)',
    borderRadius: 12,
    padding: 12,
  },
  timelineText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  timelineTime: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 6,
  },
  // Command Bar
  commandBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 30,
    paddingTop: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.3)',
  },
  commandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(55, 65, 81, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  voiceBtnIcon: {
    fontSize: 20,
  },
  commandInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#374151',
  },
  sendBtnIcon: {
    fontSize: 18,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A202C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalClose: {
    fontSize: 22,
    color: '#6B7280',
  },
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  generatingText: {
    color: '#06B6D4',
    marginLeft: 12,
    fontSize: 14,
  },
  messageInput: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 16,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  regenerateRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  regenerateChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  regenerateText: {
    fontSize: 18,
  },
  sendOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  sendOptionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendOptionWhatsapp: {
    backgroundColor: '#25D366',
  },
  sendOptionInstagram: {
    backgroundColor: '#E4405F',
  },
  sendOptionEmail: {
    backgroundColor: '#3B82F6',
  },
  sendOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  copyBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    marginBottom: 20,
  },
  copyBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
