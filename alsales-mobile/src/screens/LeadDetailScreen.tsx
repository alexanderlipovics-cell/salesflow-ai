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
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { activityLogger } from '../services/activityLogger';

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
  image_url?: string;
  next_follow_up?: string;
}

interface TimelineItem {
  id: string;
  type: 'message_sent' | 'message_received' | 'call' | 'note' | 'status_change' | 'follow_up' | 'ai_analysis';
  content: string;
  timestamp: Date;
  platform?: string;
}

interface ChiefMessage {
  role: 'user' | 'chief';
  content: string;
  timestamp: Date;
}

interface Props {
  leadId: string;
  onBack: () => void;
  onNextLead?: () => void;
}

const getScoreColor = (score: number): string => {
  if (score >= 70) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    new: 'Neu',
    contacted: 'Kontaktiert',
    qualified: 'Qualifiziert',
    won: 'Gewonnen',
    lost: 'Verloren',
  };
  return labels[status] || status;
};

export default function LeadDetailScreen({ leadId, onBack, onNextLead }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [messageType, setMessageType] = useState<string>('follow_up');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [chiefInput, setChiefInput] = useState('');
  const [chiefMessages, setChiefMessages] = useState<ChiefMessage[]>([]);
  const [chiefThinking, setChiefThinking] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [responseInput, setResponseInput] = useState('');
  const [editedLead, setEditedLead] = useState<Lead | null>(null);

  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLead();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
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
        activityLogger.logLeadViewed(found.id, found.name);
        await loadTimeline(found);
      }
    } catch (error) {
      console.log('Error loading lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async (leadData: Lead) => {
    const items: TimelineItem[] = [];
    items.push({
      id: 'created',
      type: 'note',
      content: `Lead erstellt via ${leadData.platform || 'Import'}`,
      timestamp: new Date(leadData.created_at),
    });

    try {
      const key = `timeline_${leadData.id}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const storedItems = JSON.parse(stored);
        storedItems.forEach((item: any) => {
          items.push({ ...item, timestamp: new Date(item.timestamp) });
        });
      }
    } catch (e) {
      console.log('Timeline load error:', e);
    }

    const unique = items.filter((item, idx, self) => idx === self.findIndex(i => i.id === item.id));
    setTimeline(unique.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  };

  const addToTimeline = async (type: TimelineItem['type'], content: string, platform?: string) => {
    const newItem: TimelineItem = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      platform,
    };
    
    setTimeline(prev => [newItem, ...prev]);
    
    try {
      const key = `timeline_${leadId}`;
      const existing = await AsyncStorage.getItem(key);
      const items = existing ? JSON.parse(existing) : [];
      items.unshift({ ...newItem, timestamp: newItem.timestamp.toISOString() });
      await AsyncStorage.setItem(key, JSON.stringify(items.slice(0, 50)));
    } catch (e) {
      console.log('Timeline save error:', e);
    }
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

  // ============ STATUS MANAGEMENT ============
  const updateTemperature = async (temp: string) => {
    if (!lead) return;
    const oldTemp = lead.temperature;
    const newScore = temp === 'hot' ? Math.max(lead.bant_score || 30, 70) : temp === 'warm' ? Math.max(lead.bant_score || 30, 50) : lead.bant_score;
    setLead({ ...lead, temperature: temp, bant_score: newScore });
    activityLogger.logTempChanged(lead.id, lead.name, oldTemp || 'cold', temp);
    addToTimeline('status_change', `🌡️ Temperatur: ${temp.toUpperCase()}`);
    showFeedbackToast(`${temp === 'hot' ? '🔥' : temp === 'warm' ? '☀️' : '❄️'} ${temp.toUpperCase()}`);
  };

  const updateStatus = async (status: string) => {
    if (!lead) return;
    const oldStatus = lead.status;
    setLead({ ...lead, status: status });
    activityLogger.logStatusChanged(lead.id, lead.name, oldStatus, status);
    addToTimeline('status_change', `📊 Status: ${getStatusLabel(status)}`);
    showFeedbackToast(status === 'won' ? '🎉 Deal gewonnen!' : `Status: ${getStatusLabel(status)}`);
  };

  // ============ CHIEF AI INTEGRATION ============
  const processChiefInput = async (input: string) => {
    if (!input.trim() || !lead) return;
    
    setChiefThinking(true);
    const userMessage: ChiefMessage = { role: 'user', content: input, timestamp: new Date() };
    setChiefMessages(prev => [...prev, userMessage]);
    setChiefInput('');
    Keyboard.dismiss();

    try {
      const token = await AsyncStorage.getItem('access_token');
      
      // Build context for CHIEF
      const context = `
Du bist CHIEF, der AI Sales Assistant. Du hilfst bei Lead "${lead.name}".

AKTUELLER LEAD STATUS:
- Name: ${lead.name}
- Status: ${lead.status}
- Temperatur: ${lead.temperature || 'cold'}
- Telefon: ${lead.phone || 'keine'}
- Email: ${lead.email || 'keine'}
- Instagram: ${lead.instagram || 'keine'}
- WhatsApp: ${lead.whatsapp || 'keine'}
- Firma: ${lead.company || 'keine'}
- Letzte Kontaktaufnahme: ${lead.last_contacted || 'keine'}

TIMELINE (letzte 5):
${timeline.slice(0, 5).map(t => `- ${t.content}`).join('\n')}

USER INPUT: ${input}

AUFGABEN:
1. Analysiere den Input (kann sein: Chat-Verlauf, Antwort vom Lead, Statusupdate, Frage)
2. Extrahiere wichtige Infos für die Timeline
3. Erkenne ob sich der Status ändern sollte
4. Gib eine hilfreiche Antwort

ANTWORTE IM FORMAT:
[ANALYSE]
Was hast du erkannt?

[STATUS_UPDATE]
Neuer Status: (new/contacted/qualified/won/lost oder KEINE_ÄNDERUNG)
Neue Temperatur: (cold/warm/hot oder KEINE_ÄNDERUNG)

[TIMELINE_EINTRAG]
Kurzer Eintrag für Timeline (max 50 Zeichen) oder KEIN_EINTRAG

[ANTWORT]
Deine Antwort an den User

[NÄCHSTE_AKTION]
Was sollte der User als nächstes tun?
`;

      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: context }),
      });

      const data = await response.json();
      const aiResponse = data?.message || data?.reply || 'Ich konnte das nicht verarbeiten.';

      // Parse CHIEF response
      parseChiefResponse(aiResponse, input);

      const chiefReply: ChiefMessage = { role: 'chief', content: aiResponse, timestamp: new Date() };
      setChiefMessages(prev => [...prev, chiefReply]);

    } catch (error) {
      console.log('CHIEF error:', error);
      const errorReply: ChiefMessage = { 
        role: 'chief', 
        content: 'Entschuldigung, ich konnte das nicht verarbeiten. Versuche es nochmal.', 
        timestamp: new Date() 
      };
      setChiefMessages(prev => [...prev, errorReply]);
    } finally {
      setChiefThinking(false);
    }
  };

  const parseChiefResponse = (response: string, originalInput: string) => {
    if (!lead) return;

    // Extract status update
    const statusMatch = response.match(/Neuer Status:\s*(new|contacted|qualified|won|lost)/i);
    if (statusMatch && statusMatch[1].toLowerCase() !== 'keine_änderung') {
      const newStatus = statusMatch[1].toLowerCase();
      if (newStatus !== lead.status) {
        setLead(prev => prev ? { ...prev, status: newStatus } : prev);
        activityLogger.logStatusChanged(lead.id, lead.name, lead.status, newStatus);
      }
    }

    // Extract temperature update
    const tempMatch = response.match(/Neue Temperatur:\s*(cold|warm|hot)/i);
    if (tempMatch && tempMatch[1].toLowerCase() !== 'keine_änderung') {
      const newTemp = tempMatch[1].toLowerCase();
      if (newTemp !== lead.temperature) {
        setLead(prev => prev ? { ...prev, temperature: newTemp } : prev);
        activityLogger.logTempChanged(lead.id, lead.name, lead.temperature || 'cold', newTemp);
      }
    }

    // Extract timeline entry
    const timelineMatch = response.match(/\[TIMELINE_EINTRAG\]\s*(.+?)(?=\[|$)/s);
    if (timelineMatch) {
      const entry = timelineMatch[1].trim();
      if (entry && !entry.includes('KEIN_EINTRAG')) {
        addToTimeline('ai_analysis', entry.substring(0, 100));
      }
    }
  };

  // ============ MESSAGE GENERATION ============
  const generateMessage = async (type: string) => {
    if (!lead) return;
    setGenerating(true);
    setMessageType(type);

    const prompts: Record<string, string> = {
      first_contact: `Schreibe eine freundliche Erstkontakt-Nachricht für ${lead.name}${lead.company ? ` von ${lead.company}` : ''}. Kurz und persönlich, max 3 Sätze. Plattform: WhatsApp.`,
      follow_up: `Schreibe eine Follow-up Nachricht für ${lead.name}. Wir hatten bereits Kontakt aber keine Antwort. Freundlich nachfassen, max 2-3 Sätze.`,
      reply: `Schreibe eine Antwort für ${lead.name} basierend auf dem bisherigen Kontakt. Natürlich und hilfreich.`,
    };

    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: prompts[type] || prompts.follow_up }),
      });
      const data = await response.json();
      setGeneratedMessage(data?.message || data?.reply || `Hallo ${lead.name}! 👋\n\nWie geht's dir?`);
    } catch (error) {
      setGeneratedMessage(`Hallo ${lead.name}! 👋\n\nIch wollte kurz nachfragen wie es aussieht. Hast du kurz Zeit für einen Austausch?`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendMessage = async (platform: string) => {
    if (!generatedMessage.trim() || !lead) return;

    await activityLogger.saveMessage(lead.id, lead.name, 'sent', platform, generatedMessage, messageType, 'chief');
    activityLogger.logMessageSent(lead.id, lead.name, platform);
    addToTimeline('message_sent', `📤 Nachricht via ${platform}`);

    const num = lead.whatsapp || lead.phone;
    if (platform === 'whatsapp' && num) {
      Linking.openURL(`whatsapp://send?phone=${num.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(generatedMessage)}`);
    } else if (platform === 'instagram' && lead.instagram) {
      Linking.openURL(`instagram://user?username=${lead.instagram}`);
    } else if (platform === 'email' && lead.email) {
      Linking.openURL(`mailto:${lead.email}?body=${encodeURIComponent(generatedMessage)}`);
    }

    if (lead.status === 'new') {
      setLead({ ...lead, status: 'contacted' });
      activityLogger.logStatusChanged(lead.id, lead.name, 'new', 'contacted');
    }

    showFeedbackToast('✅ Nachricht gesendet!');
    setShowMessageModal(false);
    setGeneratedMessage('');

    if (onNextLead) setTimeout(() => onNextLead(), 1500);
  };

  // ============ RESPONSE INPUT (Lead hat geantwortet) ============
  const handleResponseInput = async () => {
    if (!responseInput.trim() || !lead) return;
    
    // Add to timeline
    addToTimeline('message_received', `📥 ${responseInput.substring(0, 80)}...`);
    
    // Let CHIEF analyze
    await processChiefInput(`Lead ${lead.name} hat geantwortet: "${responseInput}"\n\nAnalysiere die Antwort und schlage vor was ich tun soll.`);
    
    setShowResponseModal(false);
    setResponseInput('');
    showFeedbackToast('📥 Antwort verarbeitet!');
  };

  // ============ EDIT LEAD ============
  const handleSaveEdit = async () => {
    if (!editedLead) return;
    setLead(editedLead);
    setShowEditModal(false);
    addToTimeline('note', '✏️ Kontaktdaten aktualisiert');
    showFeedbackToast('✅ Gespeichert!');
    // TODO: API call
  };

  // ============ ACTIONS ============
  const handleAction = (type: string) => {
    if (!lead) return;
    switch (type) {
      case 'call':
        if (lead.phone) {
          Linking.openURL(`tel:${lead.phone}`);
          addToTimeline('call', '📞 Ausgehender Anruf');
          activityLogger.logCall(lead.id, lead.name);
        } else Alert.alert('Keine Telefonnummer');
        break;
      case 'whatsapp':
      case 'email':
      case 'sms':
        setShowMessageModal(true);
        generateMessage(lead.status === 'new' ? 'first_contact' : 'follow_up');
        break;
      case 'response':
        setShowResponseModal(true);
        break;
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#06B6D4" /></View>;
  }

  if (!lead) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Lead nicht gefunden</Text>
        <TouchableOpacity onPress={onBack}><Text style={styles.backLink}>← Zurück</Text></TouchableOpacity>
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
        <Text style={styles.headerTitle}>Command Center</Text>
        <TouchableOpacity onPress={() => setShowEditModal(true)}>
          <Text style={styles.editBtn}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.avatarRing, { borderColor: scoreColor }]}>
              <View style={styles.avatarInner}>
                <Text style={[styles.avatarText, { color: scoreColor }]}>
                  {(lead.name?.[0] || '?').toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreText}>{score}</Text>
            </View>
          </Animated.View>

          <Text style={styles.profileName}>{lead.name}</Text>
          {lead.company && <Text style={styles.profileCompany}>{lead.position ? `${lead.position}, ` : ''}{lead.company}</Text>}

          {/* Temperature Badges */}
          <View style={styles.badgeRow}>
            {['cold', 'warm', 'hot'].map((temp) => (
              <TouchableOpacity
                key={temp}
                style={[styles.tempBadge, lead.temperature === temp && styles.tempBadgeActive]}
                onPress={() => updateTemperature(temp)}
              >
                <Text style={styles.badgeText}>
                  {temp === 'cold' ? '❄️' : temp === 'warm' ? '☀️' : '🔥'} {temp.charAt(0).toUpperCase() + temp.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status Badges */}
          <View style={styles.statusRow}>
            {['new', 'contacted', 'qualified', 'won'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.statusBadge, lead.status === status && styles.statusBadgeActive]}
                onPress={() => updateStatus(status)}
              >
                <Text style={[styles.statusBadgeText, lead.status === status && styles.statusBadgeTextActive]}>
                  {status === 'won' ? '🎉 ' : ''}{getStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={[styles.actionButton, lead.phone && styles.actionButtonActive]} onPress={() => handleAction('call')}>
            <Text style={styles.actionButtonIcon}>📞</Text>
            <Text style={styles.actionButtonLabel}>Anrufen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, (lead.whatsapp || lead.phone) && styles.actionButtonActive]} onPress={() => handleAction('whatsapp')}>
            <Text style={styles.actionButtonIcon}>💬</Text>
            <Text style={styles.actionButtonLabel}>Nachricht</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonHighlight]} onPress={() => handleAction('response')}>
            <Text style={styles.actionButtonIcon}>📥</Text>
            <Text style={styles.actionButtonLabel}>Antwort</Text>
          </TouchableOpacity>
        </View>

        {/* CHIEF Mini-Chat */}
        <View style={styles.chiefSection}>
          <Text style={styles.sectionTitle}>🤖 CHIEF Chat</Text>
          <View style={styles.chiefChat}>
            {chiefMessages.length === 0 ? (
              <Text style={styles.chiefPlaceholder}>
                Frag mich was über {lead.name}!{'\n'}
                • "Lead hat geantwortet: Ja, klingt interessant"{'\n'}
                • "Markiere als hot"{'\n'}
                • "Was soll ich als nächstes tun?"
              </Text>
            ) : (
              chiefMessages.slice(-4).map((msg, idx) => (
                <View key={idx} style={[styles.chiefMessage, msg.role === 'user' ? styles.chiefMessageUser : styles.chiefMessageAI]}>
                  <Text style={styles.chiefMessageText}>{msg.content.substring(0, 300)}{msg.content.length > 300 ? '...' : ''}</Text>
                </View>
              ))
            )}
            {chiefThinking && (
              <View style={styles.chiefThinking}>
                <ActivityIndicator size="small" color="#06B6D4" />
                <Text style={styles.chiefThinkingText}>CHIEF denkt...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📜 Timeline</Text>
          {timeline.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                <Text style={styles.timelineIcon}>
                  {item.type === 'message_sent' ? '📤' : 
                   item.type === 'message_received' ? '📥' :
                   item.type === 'call' ? '📞' : 
                   item.type === 'ai_analysis' ? '🤖' :
                   item.type === 'status_change' ? '📊' : '📝'}
                </Text>
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineText} numberOfLines={2}>{item.content}</Text>
                <Text style={styles.timelineTime}>
                  {item.timestamp.toLocaleDateString('de-DE')} {item.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* CHIEF Input Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chiefBar}>
        <View style={styles.chiefInputContainer}>
          <TextInput
            style={styles.chiefInput}
            placeholder="Frag CHIEF..."
            placeholderTextColor="#6B7280"
            value={chiefInput}
            onChangeText={setChiefInput}
            onSubmitEditing={() => processChiefInput(chiefInput)}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => processChiefInput(chiefInput)}>
            <Text style={styles.sendIcon}>✨</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Message Modal */}
      <Modal visible={showMessageModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                <ScrollView keyboardShouldPersistTaps="handled">
                  <TextInput
                    style={styles.messageInput}
                    value={generatedMessage}
                    onChangeText={setGeneratedMessage}
                    multiline
                    placeholder="Nachricht..."
                    placeholderTextColor="#6B7280"
                  />
                  <View style={styles.templateRow}>
                    <TouchableOpacity style={styles.templateChip} onPress={() => generateMessage('first_contact')}>
                      <Text style={styles.templateText}>👋 Intro</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.templateChip} onPress={() => generateMessage('follow_up')}>
                      <Text style={styles.templateText}>🔄 Follow-up</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.sendOptionsRow}>
                    {(lead.whatsapp || lead.phone) && (
                      <TouchableOpacity style={[styles.sendOption, { backgroundColor: '#25D366' }]} onPress={() => handleSendMessage('whatsapp')}>
                        <Text style={styles.sendOptionText}>💬 WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                    {lead.email && (
                      <TouchableOpacity style={[styles.sendOption, { backgroundColor: '#3B82F6' }]} onPress={() => handleSendMessage('email')}>
                        <Text style={styles.sendOptionText}>📧 Email</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Response Modal (Lead hat geantwortet) */}
      <Modal visible={showResponseModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📥 {lead.name} hat geantwortet</Text>
                <TouchableOpacity onPress={() => setShowResponseModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Füge die Antwort ein (Text oder Screenshot-Beschreibung)</Text>
              <TextInput
                style={styles.responseInput}
                value={responseInput}
                onChangeText={setResponseInput}
                multiline
                placeholder="Was hat der Lead geantwortet?..."
                placeholderTextColor="#6B7280"
              />
              <TouchableOpacity style={styles.processButton} onPress={handleResponseInput}>
                <Text style={styles.processButtonText}>🤖 CHIEF analysieren lassen</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>✏️ Lead bearbeiten</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {['name', 'company', 'position', 'phone', 'email', 'instagram', 'whatsapp'].map((field) => (
                  <View key={field} style={styles.editRow}>
                    <Text style={styles.editLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={(editedLead as any)?.[field] || ''}
                      onChangeText={(text) => setEditedLead(prev => prev ? { ...prev, [field]: text } : prev)}
                      placeholder={`${field}...`}
                      placeholderTextColor="#6B7280"
                    />
                  </View>
                ))}
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                  <Text style={styles.saveButtonText}>💾 Speichern</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  errorText: { color: '#EF4444', fontSize: 16, marginBottom: 16 },
  backLink: { color: '#06B6D4', fontSize: 16 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { padding: 8 },
  backBtnText: { color: '#06B6D4', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  editBtn: { fontSize: 20, padding: 8 },

  scrollView: { flex: 1 },

  feedbackToast: { position: 'absolute', top: 120, left: 20, right: 20, backgroundColor: '#10B981', padding: 16, borderRadius: 12, zIndex: 1000, alignItems: 'center' },
  feedbackText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  // Profile Card
  profileCard: { alignItems: 'center', paddingVertical: 24, marginHorizontal: 16, backgroundColor: 'rgba(20, 20, 30, 0.8)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.2)', marginBottom: 16 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatarRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  avatarInner: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '700' },
  scoreBadge: { position: 'absolute', bottom: -4, right: -4, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  scoreText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  profileName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  profileCompany: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },

  // Badges
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tempBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(75, 85, 99, 0.3)', borderWidth: 1, borderColor: 'rgba(75, 85, 99, 0.5)' },
  tempBadgeActive: { backgroundColor: 'rgba(6, 182, 212, 0.2)', borderColor: '#06B6D4' },
  badgeText: { color: '#D1D5DB', fontSize: 12, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(75, 85, 99, 0.3)' },
  statusBadgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1, borderColor: '#10B981' },
  statusBadgeText: { color: '#9CA3AF', fontSize: 11 },
  statusBadgeTextActive: { color: '#10B981' },

  // Action Buttons
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 20 },
  actionButton: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(30, 30, 45, 0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(75, 85, 99, 0.3)' },
  actionButtonActive: { borderColor: 'rgba(6, 182, 212, 0.4)' },
  actionButtonHighlight: { backgroundColor: 'rgba(6, 182, 212, 0.15)', borderColor: '#06B6D4' },
  actionButtonIcon: { fontSize: 28, marginBottom: 4 },
  actionButtonLabel: { fontSize: 11, color: '#9CA3AF' },

  // CHIEF Section
  chiefSection: { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
  chiefChat: { backgroundColor: 'rgba(20, 20, 30, 0.8)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.2)', minHeight: 120 },
  chiefPlaceholder: { color: '#6B7280', fontSize: 13, lineHeight: 22 },
  chiefMessage: { marginBottom: 10, padding: 12, borderRadius: 12 },
  chiefMessageUser: { backgroundColor: 'rgba(6, 182, 212, 0.15)', alignSelf: 'flex-end', maxWidth: '85%' },
  chiefMessageAI: { backgroundColor: 'rgba(75, 85, 99, 0.3)', alignSelf: 'flex-start', maxWidth: '85%' },
  chiefMessageText: { color: '#D1D5DB', fontSize: 13, lineHeight: 20 },
  chiefThinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chiefThinkingText: { color: '#06B6D4', fontSize: 12 },

  // Timeline
  section: { marginHorizontal: 16, marginBottom: 20 },
  timelineItem: { flexDirection: 'row', marginBottom: 12 },
  timelineDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(6, 182, 212, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  timelineIcon: { fontSize: 16 },
  timelineContent: { flex: 1, backgroundColor: 'rgba(30, 30, 45, 0.6)', borderRadius: 12, padding: 12 },
  timelineText: { fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
  timelineTime: { fontSize: 11, color: '#6B7280', marginTop: 6 },

  // CHIEF Bar
  chiefBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(10, 10, 15, 0.95)', paddingBottom: 34, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: 'rgba(6, 182, 212, 0.2)' },
  chiefInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 30, 45, 0.8)', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.3)', paddingHorizontal: 16, paddingVertical: 4 },
  chiefInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#FFFFFF' },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#06B6D4', justifyContent: 'center', alignItems: 'center' },
  sendIcon: { fontSize: 18 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#14141e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  modalSubtitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  modalClose: { fontSize: 24, color: '#6B7280', padding: 4 },
  
  generatingBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  generatingText: { color: '#06B6D4', marginLeft: 12 },
  
  messageInput: { backgroundColor: 'rgba(30, 30, 45, 0.8)', borderRadius: 16, padding: 16, color: '#FFFFFF', fontSize: 15, lineHeight: 24, minHeight: 140, textAlignVertical: 'top', marginBottom: 16 },
  templateRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  templateChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(6, 182, 212, 0.15)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.3)' },
  templateText: { color: '#06B6D4', fontSize: 13 },
  sendOptionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  sendOption: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  sendOptionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Response Modal
  responseInput: { backgroundColor: 'rgba(30, 30, 45, 0.8)', borderRadius: 16, padding: 16, color: '#FFFFFF', fontSize: 15, lineHeight: 24, minHeight: 120, textAlignVertical: 'top', marginBottom: 16 },
  processButton: { backgroundColor: '#06B6D4', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  processButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },

  // Edit Modal
  editRow: { marginBottom: 16 },
  editLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 6 },
  editInput: { backgroundColor: 'rgba(30, 30, 45, 0.8)', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(75, 85, 99, 0.3)' },
  saveButton: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});