import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Animated,
  Alert,
  Clipboard,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../services/apiConfig';
import { useDailyFlowStatus } from '../../hooks/useDailyFlowStatus';
import { 
  speakText, 
  stopSpeaking, 
  pauseSpeaking,
  resumeSpeaking,
  startListening, 
  stopListening, 
  isVoiceSupported,
  handleVoiceCommand,
  initVoices,
  setAutoRead,
  isAutoReadEnabled,
  autoReadMessage,
  SoundEffects,
  VOICE_CONFIG,
} from '../../services/voiceService';
// 🆕 Live Assist Integration
import { useLiveAssist, detectActivation, detectDeactivation } from '../../hooks/useLiveAssist';
import { LiveAssistBanner, CoachOverlay, ComplianceBadge } from '../../components/live-assist';
import { DISCBadge } from '../../components/live-assist/DISCBadge';
// 📚 Quick Templates
import { QuickTemplatesModal } from '../../components/templates';

// API URLs - MENTOR (ehemals CHIEF)
const getMentorApiUrl = () => `${API_CONFIG.baseUrl.replace('/api/v1', '')}/api/v2/mentor`;
const getChiefApiUrl = () => `${API_CONFIG.baseUrl}/ai/chief`; // Legacy fallback
const getLegacyApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

// =============================================================================
// ACTION TAG PARSER - Parse [[ACTION:...]] Tags aus MENTOR Responses
// =============================================================================

const ACTION_TAG_CONFIG = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Backend-Actions (aus /api/v2/mentor/chat Response)
  // ═══════════════════════════════════════════════════════════════════════════
  FOLLOWUP_LEADS: {
    icon: '📞',
    label: 'Check-ins öffnen',
    color: '#8B5CF6',
  },
  NEW_CONTACT_LIST: {
    icon: '➕',
    label: 'Neue Kontakte',
    color: '#10B981',
  },
  COMPOSE_MESSAGE: {
    icon: '✉️',
    label: 'Nachricht schreiben',
    color: '#06B6D4',
  },
  LOG_ACTIVITY: {
    icon: '✅',
    label: 'Aktivität loggen',
    color: '#F59E0B',
    autoExecute: true, // Wird automatisch ausgeführt + Bestätigung
  },
  OBJECTION_HELP: {
    icon: '🛡️',
    label: 'Einwand-Hilfe',
    color: '#EF4444',
  },
  SHOW_LEAD: {
    icon: '👤',
    label: 'Kontakt öffnen',
    color: '#3B82F6',
  },
  COMPLETE_TASK: {
    icon: '✓',
    label: 'Erledigt markieren',
    color: '#22C55E',
  },
  OPEN_SCRIPT: {
    icon: '📝',
    label: 'Script öffnen',
    color: '#A855F7',
  },
  START_DMO: {
    icon: '📊',
    label: 'DMO starten',
    color: '#22D3EE',
  },
  CELEBRATE: {
    icon: '🎉',
    label: 'Feiern!',
    color: '#F59E0B',
    autoExecute: true,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Frontend-spezifische Actions (User-Request)
  // ═══════════════════════════════════════════════════════════════════════════
  SCRIPT_SUGGEST: {
    icon: '📝',
    label: 'Script anzeigen',
    color: '#10B981',
  },
  SHOW_PROSPECT: {
    icon: '👤',
    label: 'Kontakt öffnen',
    color: '#3B82F6',
  },
  START_ROLEPLAY: {
    icon: '🎭',
    label: 'Üben',
    color: '#A855F7',
  },
};

/**
 * Extrahiert ACTION Tags aus einer MENTOR Response
 * Format: [[ACTION:TYPE:params]] oder [[ACTION:TYPE]]
 */
const extractActionTags = (responseText) => {
  const actionRegex = /\[\[ACTION:(\w+)(?::([^\]]+))?\]\]/g;
  const actions = [];
  let match;
  
  while ((match = actionRegex.exec(responseText)) !== null) {
    const type = match[1];
    const params = match[2] ? match[2].split(',').map(p => p.trim()) : [];
    const config = ACTION_TAG_CONFIG[type];
    
    if (config) {
      actions.push({
        type,
        params,
        icon: config.icon,
        label: config.label,
        color: config.color,
        autoExecute: config.autoExecute || false,
        raw: match[0],
      });
    }
  }
  
  return actions;
};

/**
 * Entfernt ACTION Tags aus dem sichtbaren Text
 */
const stripActionTags = (text) => {
  return text.replace(/\[\[ACTION:\w+(?::[^\]]+)?\]\]/g, '').trim();
};

export default function ChatScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { status, overallProgress, missingActivities } = useDailyFlowStatus();
  
  // 🆕 Live Assist Hook
  const liveAssist = useLiveAssist({
    companyId: user?.company_id,
    vertical: 'network_marketing',
    onActivate: () => {
      SoundEffects.success?.();
    },
    onDeactivate: () => {
      SoundEffects.command?.();
    },
    onResponse: (response) => {
      // Auto-Read wenn aktiviert
      if (autoRead && voiceSupport.tts) {
        autoReadMessage(response.response_short || response.response_text);
      }
    },
    onError: (error) => {
      console.log('Live Assist Error:', error);
    },
  });
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const scrollViewRef = useRef();
  
  // Voice State - Premium
  const [voiceState, setVoiceState] = useState('idle'); // idle, listening, hearing, processing, speaking, paused
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [voiceSupport, setVoiceSupport] = useState({ tts: false, stt: false, wakeWord: false });
  const [partialTranscript, setPartialTranscript] = useState('');
  const [autoRead, setAutoReadState] = useState(false);
  const [voiceMode, setVoiceMode] = useState('normal'); // normal, continuous, wake-word
  const [lastCommand, setLastCommand] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // 🆕 DISC Profiler State
  const [discProfile, setDiscProfile] = useState(null);
  
  // 📚 Quick Templates Modal State
  const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
  
  // Initialize with translated greeting
  useEffect(() => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: t('chat.chief_intro'),
      contextUsed: false,
      actions: [],
    }]);
  }, [t]);
  
  // Check Voice Support & Init Voices on mount
  useEffect(() => {
    setVoiceSupport(isVoiceSupported());
    initVoices();
  }, []);
  
  // Pulse Animation für Voice-Aktivität
  useEffect(() => {
    if (voiceState === 'listening' || voiceState === 'hearing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState]);
  
  // ═══════════════════════════════════════════════════════════════════════
  // ACTION TAG HANDLER - Verarbeitet MENTOR Action Tags
  // ═══════════════════════════════════════════════════════════════════════
  
  const handleAction = useCallback((action) => {
    const { type, params } = action;
    const paramValue = Array.isArray(params) ? params[0] : params;
    
    switch (type) {
      // 📝 Script anzeigen
      case 'SCRIPT_SUGGEST':
        Alert.alert(
          '📝 Script',
          paramValue || 'Script wird geladen...',
          [
            { text: 'Kopieren', onPress: () => Clipboard.setString(paramValue) },
            { text: 'OK' },
          ]
        );
        break;
        
      // 👤 Kontakt öffnen
      case 'SHOW_PROSPECT':
        navigation.navigate('Kontakte', { showLeadId: paramValue });
        break;
        
      // 🎭 Roleplay starten
      case 'START_ROLEPLAY':
        const roleplayTopic = paramValue || 'Einwandbehandlung';
        setInput(`Lass uns "${roleplayTopic}" üben. Du spielst den Kunden.`);
        setTimeout(() => sendMessage(), 100);
        break;
        
      // ✅ Aktivität loggen (automatisch)
      case 'LOG_ACTIVITY':
        const activityType = paramValue || 'contact';
        logActivityToBackend(activityType);
        break;
        
      // 📞 Check-ins öffnen
      case 'FOLLOWUP_LEADS':
        const leadIds = Array.isArray(params) ? params : [params];
        navigation.navigate('FollowUps', { highlightLeads: leadIds });
        break;
        
      // ➕ Neue Kontakte
      case 'NEW_CONTACTS':
        navigation.navigate('Kontakte', { mode: 'new_contact', target: parseInt(paramValue) || 3 });
        break;
        
      // 📊 DMO Status
      case 'START_DMO':
        navigation.navigate('DMO');
        break;
        
      // ✉️ Nachricht schreiben
      case 'COMPOSE_MESSAGE':
        navigation.navigate('Kontakte', { 
          showLeadId: paramValue,
          openComposer: true 
        });
        break;
        
      // 📝 Script öffnen
      case 'OPEN_SCRIPT':
        Alert.alert(
          '📝 Script',
          paramValue || 'Welches Script möchtest du?',
          [
            { text: 'Opener', onPress: () => setInput('Gib mir einen Opener Script') },
            { text: 'Follow-up', onPress: () => setInput('Gib mir einen Follow-up Script') },
            { text: 'Abbrechen', style: 'cancel' },
          ]
        );
        break;
        
      // 🎉 Erfolg feiern
      case 'CELEBRATE':
        Alert.alert('🎉 Super gemacht!', paramValue || 'Weiter so!');
        break;
        
      // 🛡️ Einwand-Hilfe
      case 'OBJECTION_HELP':
        setInput(`Hilf mir bei dem Einwand: "${paramValue || 'zu teuer'}"`);
        setTimeout(() => sendMessage(), 100);
        break;
        
      // ➕ Neue Kontaktliste
      case 'NEW_CONTACT_LIST':
        navigation.navigate('Kontakte', { mode: 'new_contact' });
        break;
        
      // Legacy: Lead anzeigen
      case 'SHOW_LEAD':
        navigation.navigate('Kontakte', { showLeadId: paramValue });
        break;
        
      // Legacy: Objection
      case 'OPEN_OBJECTION':
        navigation.navigate('ObjectionBrain', { topic: paramValue });
        break;
        
      // Legacy: Task abschließen
      case 'COMPLETE_TASK':
        Alert.alert(
          t('followups.mark_complete') + '?',
          `${paramValue}`,
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: `${t('common.done')} ✓`, onPress: () => completeTask(paramValue) },
          ]
        );
        break;
        
      default:
        console.log('Unknown action:', type, params);
    }
  }, [navigation, t]);
  
  // Hilfsfunktion: Aktivität zum Backend loggen
  const logActivityToBackend = async (activityType) => {
    try {
      await fetch(`${getMentorApiUrl()}/log-activity`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': user?.access_token ? `Bearer ${user.access_token}` : '',
        },
        body: JSON.stringify({
          activity_type: activityType,
          date: new Date().toISOString().split('T')[0],
        }),
      });
      
      // Bestätigung anzeigen
      Alert.alert('✅ Aktivität geloggt', `${activityType} wurde erfasst!`);
    } catch (error) {
      console.log('Log activity error:', error);
    }
  };
  
  const completeTask = async (taskType) => {
    // TODO: Call Daily Flow API to mark task as complete
    Alert.alert(`${t('common.done')} ✓`, `${taskType} ${t('followups.completed')}`);
  };
  
  // Helper: Action Labels für UI
  const getActionLabel = (action) => {
    const labels = {
      'FOLLOWUP_LEADS': `📞 ${t('actions.followups')}`,
      'NEW_CONTACTS': `➕ ${t('leads.add_lead')}`,
      'SHOW_LEAD': `👤 ${t('leads.title')}`,
      'OPEN_OBJECTION': `🛡️ ${t('playbooks.categories.objections')}`,
      'COMPLETE_TASK': `✓ ${t('common.done')}`,
    };
    return labels[action.type] || action.type;
  };
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🎤 PREMIUM VOICE FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════
  
  // Voice Command Handler
  const voiceCommandHandlers = useCallback(() => ({
    onNewLead: () => navigation.navigate('Leads', { mode: 'create' }),
    onOpenFollowups: () => navigation.navigate('FollowUps'),
    onObjectionHelp: () => {
      setInput('Hilf mir bei einem Einwand');
      sendMessageRef.current?.();
    },
    onOpenDailyFlow: () => navigation.navigate('DailyFlow'),
    onStopListening: () => setVoiceState('idle'),
    onCancel: () => {
      setInput('');
      setPartialTranscript('');
    },
    onClearInput: () => setInput(''),
    onSendMessage: () => sendMessageRef.current?.(),
  }), [navigation]);
  
  // Starte Spracherkennung - Premium
  const toggleListening = useCallback((mode = voiceMode) => {
    if (voiceState === 'listening' || voiceState === 'hearing') {
      stopListening();
      setVoiceState('idle');
      setPartialTranscript('');
    } else {
      const started = startListening({
        mode,
        onResult: (transcript, confidence) => {
          console.log(`🎤 Erkannt (${Math.round(confidence * 100)}%):`, transcript);
          setInput(prev => prev + (prev ? ' ' : '') + transcript);
          setPartialTranscript('');
          
          // Bei normalem Modus nach Ergebnis stoppen
          if (mode === 'normal') {
            setVoiceState('idle');
          }
        },
        onPartialResult: (partial) => {
          setPartialTranscript(partial);
        },
        onCommand: (command) => {
          console.log('🎯 Voice Command:', command);
          setLastCommand(command);
          handleVoiceCommand(command, voiceCommandHandlers());
        },
        onWakeWord: (result) => {
          console.log('👋 Wake Word:', result);
          Alert.alert('Hey CHIEF! 👋', result.followingText || 'Wie kann ich helfen?');
        },
        onError: (error) => {
          console.log('Voice error:', error);
          setVoiceState('idle');
          if (error === 'not-allowed' || error === 'Mikrofon-Zugriff verweigert') {
            Alert.alert(
              '🎤 Mikrofon-Zugriff',
              'Bitte erlaube den Mikrofon-Zugriff in deinen Browser-Einstellungen.',
              [{ text: 'OK' }]
            );
          }
        },
        onStateChange: (state) => {
          setVoiceState(state);
        },
        onEnd: () => {
          if (mode === 'normal') {
            setVoiceState('idle');
          }
        },
      });
      
      if (started) {
        setVoiceState('listening');
        setVoiceMode(mode);
      }
    }
  }, [voiceState, voiceMode, voiceCommandHandlers]);
  
  // CHIEF-Nachricht vorlesen - Premium
  const speakMessage = useCallback(async (messageId, text) => {
    if (voiceState === 'speaking' && speakingMessageId === messageId) {
      // Pause/Resume Toggle
      pauseSpeaking();
      setVoiceState('paused');
    } else if (voiceState === 'paused' && speakingMessageId === messageId) {
      resumeSpeaking();
      setVoiceState('speaking');
    } else {
      // Neue Nachricht vorlesen
      stopSpeaking();
      setSpeakingMessageId(messageId);
      
      try {
        await speakText(text, {
          onStart: () => setVoiceState('speaking'),
          onEnd: () => {
            setVoiceState('idle');
            setSpeakingMessageId(null);
          },
          onError: () => {
            setVoiceState('idle');
            setSpeakingMessageId(null);
          },
        });
      } catch (e) {
        setVoiceState('idle');
        setSpeakingMessageId(null);
      }
    }
  }, [voiceState, speakingMessageId]);
  
  // Auto-Read Toggle
  const toggleAutoRead = useCallback(() => {
    const newState = !autoRead;
    setAutoReadState(newState);
    setAutoRead(newState);
    SoundEffects.success();
  }, [autoRead]);
  
  // Voice Mode Cycle: normal → continuous → wake-word → normal
  const cycleVoiceMode = useCallback(() => {
    const modes = ['normal', 'continuous', 'wake-word'];
    const currentIndex = modes.indexOf(voiceMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setVoiceMode(nextMode);
    SoundEffects.command();
    
    const modeLabels = {
      'normal': 'Einmal-Modus',
      'continuous': 'Dauer-Modus',
      'wake-word': 'Hey CHIEF Modus',
    };
    Alert.alert('🎤 Voice-Modus', modeLabels[nextMode]);
  }, [voiceMode]);
  
  // Ref für sendMessage (für Voice Commands)
  const sendMessageRef = useRef(null);
  
  // Stoppe Sprache wenn Screen verlassen wird
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);
  
  // sendMessage Ref für Voice Commands
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const messageText = input.trim();
    const messageId = Date.now().toString();
    
    // ═══════════════════════════════════════════════════════════════════════
    // 🆕 LIVE ASSIST INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════
    
    // Prüfen ob Live Assist aktiviert werden soll
    if (detectActivation(messageText)) {
      const userMessage = { id: messageId, role: 'user', content: messageText };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      
      try {
        await liveAssist.activate();
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `🟢 **Live Assist aktiviert!**\n\n🎯 Ich bin bereit für dein Kundengespräch.\n\nFrag mich:\n• "Kunde sagt zu teuer"\n• "Warum ${liveAssist.companyName || 'wir'}?"\n• "Gib mir Zahlen"\n• "Welche Studien?"\n\n💡 Sage "Gespräch vorbei" wenn du fertig bist.`,
          isLiveAssist: true,
          contextUsed: true,
          actions: [],
        }]);
      } catch (error) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ Live Assist konnte nicht gestartet werden. Versuche es erneut.',
          contextUsed: false,
          actions: [],
        }]);
      }
      setLoading(false);
      return;
    }
    
    // Prüfen ob Live Assist deaktiviert werden soll
    if (detectDeactivation(messageText)) {
      const userMessage = { id: messageId, role: 'user', content: messageText };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      
      await liveAssist.deactivate();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '🔴 **Live Assist beendet.**\n\nZurück im normalen Modus. Wie kann ich dir sonst helfen?',
        isLiveAssist: false,
        contextUsed: false,
        actions: [],
      }]);
      return;
    }
    
    // Wenn Live Assist aktiv ist, dort verarbeiten
    if (liveAssist.isActive) {
      const userMessage = { id: messageId, role: 'user', content: messageText };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      
      try {
        const response = await liveAssist.query(messageText);
        
        // 🆕 Update DISC Profile wenn vorhanden
        if (response.disc_profile) {
          setDiscProfile({
            primaryType: response.disc_profile.primary_type || '?',
            secondaryType: response.disc_profile.secondary_type,
            confidence: response.disc_profile.confidence || 0,
            communicationStyle: response.disc_profile.communication_style || '',
            toneRecommendation: response.disc_profile.tone_recommendation || 'neutral',
          });
        }
        
        // Live Assist Response formatieren
        let formattedContent = response.response_text;
        
        // Follow-up Frage anhängen wenn vorhanden
        if (response.follow_up_question) {
          formattedContent += `\n\n💡 *${response.follow_up_question}*`;
        }
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: formattedContent,
          isLiveAssist: true,
          liveAssistData: response,
          contextUsed: true,
          actions: [],
          // Zusätzliche Metadaten für UI
          objectionType: response.objection_type,
          responseTechnique: response.response_technique,
          responseTimeMs: response.response_time_ms,
          // 🆕 Compliance-Daten
          complianceScore: response.compliance_score,
          complianceIssues: response.compliance_issues,
        }]);
        
      } catch (error) {
        console.log('Live Assist Query Error:', error);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ Live Assist Fehler. Versuch es nochmal oder sage "Assist aus" für normalen Modus.',
          isLiveAssist: true,
          contextUsed: false,
          actions: [],
        }]);
      }
      setLoading(false);
      return;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // NORMALER CHIEF CHAT FLOW
    // ═══════════════════════════════════════════════════════════════════════
    
    const userMessage = { 
      id: messageId,
      role: 'user', 
      content: messageText 
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Konversationshistorie für den API-Call vorbereiten (nur letzte 10)
      const conversationHistory = updatedMessages
        .slice(-11, -1) // Letzte 10 ohne aktuelle Message
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // MENTOR API Endpoint (neu) mit vollem Kontext
      const response = await fetch(`${getMentorApiUrl()}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': user?.access_token ? `Bearer ${user.access_token}` : '',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation_history: conversationHistory,
          include_context: true,
          company_id: user?.company_id,
          include_dmo: true, // DMO Status für Kontext
          include_suggestions: true, // Lead-Vorschläge
        })
      });
      
      if (!response.ok) {
        // Fallback auf Demo-Endpoint wenn Auth fehlschlägt
        const demoResponse = await fetch(`${getChiefApiUrl()}/chat/demo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage.content,
            conversation_history: conversationHistory,
            include_context: true,
          })
        });
        
        if (!demoResponse.ok) {
          throw new Error('API Fehler');
        }
        
        const demoData = await demoResponse.json();
        handleChiefResponse(demoData);
        return;
      }
      
      const data = await response.json();
      handleChiefResponse(data);
      
    } catch (error) {
      console.log('CHIEF API Fehler:', error);
      
      // Fallback auf Legacy-Endpoint
      try {
        const legacyResponse = await fetch(`${getLegacyApiUrl()}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText,
            user_id: user?.id
          })
        });
        
        if (legacyResponse.ok) {
          const legacyData = await legacyResponse.json();
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: legacyData.response || legacyData.message || 'Keine Antwort erhalten.',
            contextUsed: false,
            actions: [],
          }]);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Ignore legacy fallback errors
      }
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: '⚠️ Verbindungsfehler. Bitte stelle sicher, dass das Backend läuft und versuche es erneut.',
        contextUsed: false,
        actions: [],
      }]);
    }
    setLoading(false);
  };
  
  const handleChiefResponse = (data) => {
    const rawContent = data.reply || data.response || data.message || 'Keine Antwort erhalten.';
    
    // Parse ACTION Tags aus der Response
    const extractedActions = extractActionTags(rawContent);
    const cleanContent = stripActionTags(rawContent);
    
    // Kombiniere Backend-Actions mit extrahierten Actions
    const allActions = [...(data.actions || []), ...extractedActions];
    
    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: cleanContent,
      contextUsed: data.context_used || false,
      actions: allActions,
      // MENTOR-spezifische Daten
      dmoProgress: data.dmo_progress,
      suggestedLeads: data.suggested_leads,
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setLoading(false);
    
    // Auto-Execute Actions (z.B. LOG_ACTIVITY)
    extractedActions
      .filter(a => a.autoExecute)
      .forEach(action => {
        handleAction(action);
      });
    
    // 🔊 Auto-Read wenn aktiviert
    if (autoRead && voiceSupport.tts) {
      autoReadMessage(cleanContent);
    }
  };

  const sendFeedback = async (messageId, userMessage, aiResponse, feedbackType) => {
    if (feedbackGiven[messageId]) return;
    
    setFeedbackGiven(prev => ({ ...prev, [messageId]: feedbackType }));
    
    try {
      // Versuche neuen Learning-Endpoint
      await fetch(`${API_CONFIG.baseUrl}/learning/events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': user?.access_token ? `Bearer ${user.access_token}` : '',
        },
        body: JSON.stringify({
          event_type: feedbackType === 'positive' ? 'feedback_positive' : 'feedback_negative',
          metadata: {
            user_message: userMessage,
            ai_response: aiResponse?.substring(0, 500), // Limit size
          },
        })
      });
    } catch (error) {
      // Fallback auf Legacy
      try {
        await fetch(`${getLegacyApiUrl()}/api/ai/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            response: aiResponse,
            feedback: feedbackType,
            pattern_type: 'general',
            user_id: user?.id
          })
        });
      } catch (e) {
        console.log('Feedback API Fehler:', e);
      }
    }
  };

  const sendQuickAction = async (actionType, context) => {
    if (loading) return;
    
    setInput('');
    setLoading(true);
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: context
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch(`${getApiUrl()}/api/ai/quick-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          context: context,
          user_id: user?.id
        })
      });
      
      if (!response.ok) throw new Error('Quick Action Fehler');
      
      const data = await response.json();
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.suggestion || 'Keine Antwort erhalten.',
        memories: 0,
        patterns: 0,
        tokens: data.tokens_used || 0,
        isQuickAction: true
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Fallback auf normalen Chat
      setMessages(prev => prev.slice(0, -1));
      setInput(context);
    }
    setLoading(false);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // ═══════════════════════════════════════════════════════════════════════
  // MENTOR Quick Reply Buttons
  // ═══════════════════════════════════════════════════════════════════════
  
  const mentorQuickReplies = [
    { 
      label: '💪 Motivation', 
      prompt: 'Ich brauche Motivation für heute. Push mich!',
      color: '#10B981',
    },
    { 
      label: '❓ Einwand-Hilfe', 
      prompt: 'Hilf mir bei einem Einwand. Mein Interessent sagt...',
      color: '#EF4444',
    },
    { 
      label: '📋 Script für heute', 
      prompt: 'Gib mir ein passendes Script für meine heutigen Gespräche.',
      color: '#A855F7',
    },
    { 
      label: '📊 Mein DMO Status', 
      prompt: 'Wie ist mein DMO Status heute? Was fehlt mir noch?',
      color: '#22D3EE',
    },
  ];
  
  // Legacy Quick Actions (für Rückwärtskompatibilität)
  const quickActions = [
    { 
      label: '🟢 Kundengespräch starten', 
      type: 'live_assist_start',
      prompt: 'Bin mit Kunde',
      isLiveAssist: true,
    },
    ...mentorQuickReplies.map(q => ({ label: q.label, prompt: q.prompt })),
  ];
  
  // 🆕 Live Assist Quick Actions (wenn aktiv)
  const liveAssistQuickActions = [
    { label: '💰 Zu teuer', prompt: 'Kunde sagt zu teuer' },
    { label: '⏰ Keine Zeit', prompt: 'Kunde sagt keine Zeit' },
    { label: '🤔 Muss überlegen', prompt: 'Kunde will überlegen' },
    { label: '📊 Zahlen', prompt: 'Gib mir Zahlen und Fakten' },
    { label: '❓ Warum wir', prompt: 'Warum sollte der Kunde bei uns kaufen?' },
  ];

  // Finde die letzte User-Nachricht vor einer AI-Antwort
  const findPreviousUserMessage = (index) => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return '';
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLogoContainer}>
            <Text style={styles.headerEmoji}>🧠</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>MENTOR</Text>
            <View style={styles.headerSubtitleRow}>
              <Text style={styles.headerSubtitle}>KI-Coach</Text>
              <Text style={styles.headerAuraText}>NetworkerOS</Text>
            </View>
          </View>
        </View>
        
        {/* Daily Flow Mini-Status */}
        {status && (
          <View style={styles.headerStatusContainer}>
            <View style={styles.headerProgressBadge}>
              <Text style={styles.headerProgressText}>
                📊 {overallProgress}%
              </Text>
            </View>
            {missingActivities.total > 0 && (
              <Text style={styles.headerRemainingText}>
                {missingActivities.total} Tasks offen
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>🎯 Context</Text>
        </View>
        
        {/* 📚 Quick Templates Button */}
        <Pressable 
          style={styles.templatesButton}
          onPress={() => setTemplatesModalVisible(true)}
        >
          <Text style={styles.templatesButtonText}>📚</Text>
        </Pressable>
        
        {/* 🆕 DISC Badge - Zeigt erkannten Kunden-Typ */}
        {liveAssist.isActive && discProfile && (
          <DISCBadge 
            profile={discProfile}
            size="small"
            showLabel={true}
          />
        )}
      </View>
      
      {/* 🆕 Live Assist Banner */}
      <LiveAssistBanner 
        isActive={liveAssist.isActive}
        companyName={liveAssist.companyName}
        keyFacts={liveAssist.keyFacts}
        onDeactivate={() => liveAssist.deactivate()}
        onQuickQuery={(query) => {
          setInput(query);
          // Optional: Direkt senden
          // sendMessage();
        }}
      />
      
      {/* 🆕 Coach Overlay - Zeigt personalisierte Tipps */}
      {liveAssist.isActive && user?.company_id && (
        <CoachOverlay
          userId={user?.id}
          companyId={user?.company_id}
          companyName={liveAssist.companyName}
          vertical="network_marketing"
          days={30}
          position="bottom-right"
          initialMinimized={true}
          onApplyTip={(tip) => {
            // Tipp in den Chat einfügen
            setInput(`Zeige mir wie ich "${tip.title}" umsetze`);
          }}
          onDismissTip={(tipId) => {
            console.log('Tipp geschlossen:', tipId);
          }}
        />
      )}
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, index) => (
          <View key={msg.id}>
            <View 
              style={[
                styles.messageBubble, 
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                msg.isLiveAssist && styles.liveAssistBubble
              ]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.botLabelRow}>
                  <Text style={styles.botLabel}>
                    {msg.isLiveAssist ? '🎯 LIVE ASSIST' : '🧠 MENTOR'}
                  </Text>
                  {msg.isLiveAssist && msg.objectionType && (
                    <View style={styles.objectionBadge}>
                      <Text style={styles.objectionBadgeText}>
                        🛡️ {msg.objectionType}
                      </Text>
                    </View>
                  )}
                  {msg.contextUsed && !msg.isLiveAssist && (
                    <View style={styles.contextBadge}>
                      <Text style={styles.contextBadgeText}>🎯 Kontext</Text>
                    </View>
                  )}
                  {msg.isLiveAssist && msg.responseTimeMs && (
                    <Text style={styles.responseTimeText}>{msg.responseTimeMs}ms</Text>
                  )}
                  {/* 🆕 Compliance Badge */}
                  {msg.isLiveAssist && msg.complianceScore !== undefined && msg.complianceScore < 100 && (
                    <ComplianceBadge 
                      score={msg.complianceScore} 
                      issues={msg.complianceIssues || 0}
                      showDetails={true}
                    />
                  )}
                  {/* 🔊 Premium Lautsprecher Button - TTS */}
                  {voiceSupport.tts && (
                    <Pressable
                      style={[
                        styles.speakerButton,
                        speakingMessageId === msg.id && voiceState === 'speaking' && styles.speakerButtonActive,
                        speakingMessageId === msg.id && voiceState === 'paused' && styles.speakerButtonPaused,
                      ]}
                      onPress={() => speakMessage(msg.id, msg.content)}
                      onLongPress={() => {
                        stopSpeaking();
                        setSpeakingMessageId(null);
                        setVoiceState('idle');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        speakingMessageId === msg.id && voiceState === 'speaking' ? "Pausieren" :
                        speakingMessageId === msg.id && voiceState === 'paused' ? "Fortsetzen" :
                        "Vorlesen"
                      }
                    >
                      <Text style={styles.speakerButtonText}>
                        {speakingMessageId === msg.id && voiceState === 'speaking' ? '⏸️' : 
                         speakingMessageId === msg.id && voiceState === 'paused' ? '▶️' : '🔊'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
              <Text style={[
                styles.messageText, 
                msg.role === 'user' && styles.userText
              ]}>
                {msg.content}
              </Text>
              
              {/* Action Buttons - wenn MENTOR Actions vorschlägt */}
              {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                <View style={styles.actionButtonsContainer}>
                  {msg.actions
                    .filter(action => !action.autoExecute) // Keine Auto-Execute Actions zeigen
                    .map((action, actionIndex) => (
                    <Pressable
                      key={actionIndex}
                      style={[
                        styles.actionButton,
                        action.color && { borderColor: action.color }
                      ]}
                      onPress={() => handleAction(action)}
                    >
                      <Text style={styles.actionButtonText}>
                        {action.icon || '▶️'} {action.label || getActionLabel(action)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              
              {/* Feedback Buttons für AI-Antworten */}
              {msg.role === 'assistant' && msg.id !== '1' && (
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackLabel}>War das hilfreich?</Text>
                  <View style={styles.feedbackButtons}>
                    <Pressable 
                      style={[
                        styles.feedbackButton,
                        feedbackGiven[msg.id] === 'positive' && styles.feedbackButtonActive
                      ]}
                      onPress={() => sendFeedback(
                        msg.id,
                        findPreviousUserMessage(index),
                        msg.content,
                        'positive'
                      )}
                      disabled={!!feedbackGiven[msg.id]}
                    >
                      <Text style={styles.feedbackEmoji}>👍</Text>
                    </Pressable>
                    <Pressable 
                      style={[
                        styles.feedbackButton,
                        feedbackGiven[msg.id] === 'negative' && styles.feedbackButtonNegative
                      ]}
                      onPress={() => sendFeedback(
                        msg.id,
                        findPreviousUserMessage(index),
                        msg.content,
                        'negative'
                      )}
                      disabled={!!feedbackGiven[msg.id]}
                    >
                      <Text style={styles.feedbackEmoji}>👎</Text>
                    </Pressable>
                  </View>
                  {feedbackGiven[msg.id] && (
                    <Text style={styles.feedbackThanks}>
                      ✓ Danke! Ich lerne dazu.
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#22d3ee" />
            <Text style={styles.loadingText}>MENTOR denkt nach...</Text>
          </View>
        )}

        {/* MENTOR Quick Replies - immer unter dem Chat sichtbar */}
        {!loading && !liveAssist.isActive && (
          <View style={styles.mentorQuickRepliesContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mentorQuickRepliesScroll}
            >
              {mentorQuickReplies.map((reply, index) => (
                <Pressable 
                  key={index}
                  style={[
                    styles.mentorQuickReplyButton,
                    { borderColor: reply.color + '60' }
                  ]}
                  onPress={() => {
                    setInput(reply.prompt);
                    setTimeout(() => sendMessage(), 100);
                  }}
                >
                  <Text style={styles.mentorQuickReplyText}>{reply.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions - nur beim Start anzeigen */}
        {messages.length === 1 && !loading && !liveAssist.isActive && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>⚡ Schnellstart:</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <Pressable 
                  key={index}
                  style={[
                    styles.quickActionButton,
                    action.isLiveAssist && styles.liveAssistQuickActionButton
                  ]}
                  onPress={() => {
                    setInput(action.prompt);
                    setTimeout(() => sendMessage(), 100);
                  }}
                >
                  <Text style={[
                    styles.quickActionText,
                    action.isLiveAssist && styles.liveAssistQuickActionText
                  ]}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        
        {/* 🆕 Live Assist Quick Actions - wenn Live Assist aktiv */}
        {liveAssist.isActive && !loading && (
          <View style={styles.liveAssistQuickActionsContainer}>
            <Text style={styles.liveAssistQuickActionsTitle}>⚡ Schnell-Hilfe:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.liveAssistQuickActionsScroll}
            >
              {liveAssistQuickActions.map((action, index) => (
                <Pressable 
                  key={index}
                  style={styles.liveAssistQuickActionChip}
                  onPress={() => {
                    setInput(action.prompt);
                    setTimeout(() => sendMessage(), 100);
                  }}
                >
                  <Text style={styles.liveAssistQuickActionChipText}>{action.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* 🎤 Premium Voice Status Bar */}
      {(voiceState !== 'idle' || partialTranscript) && (
        <View style={[
          styles.voiceStatusBar,
          voiceState === 'listening' && styles.voiceStatusListening,
          voiceState === 'hearing' && styles.voiceStatusHearing,
          voiceState === 'speaking' && styles.voiceStatusSpeaking,
        ]}>
          <View style={styles.voiceStatusContent}>
            <Animated.Text style={[
              styles.voiceStatusIcon,
              { transform: [{ scale: pulseAnim }] }
            ]}>
              {voiceState === 'listening' ? '🎤' : 
               voiceState === 'hearing' ? '👂' : 
               voiceState === 'speaking' ? '🔊' :
               voiceState === 'paused' ? '⏸️' :
               voiceState === 'processing' ? '⏳' : '🎤'}
            </Animated.Text>
            <View style={styles.voiceStatusTextContainer}>
              <Text style={styles.voiceStatusLabel}>
                {voiceState === 'listening' ? 'Ich höre zu...' : 
                 voiceState === 'hearing' ? 'Sprache erkannt...' :
                 voiceState === 'speaking' ? 'MENTOR spricht...' :
                 voiceState === 'paused' ? 'Pausiert' :
                 voiceState === 'processing' ? 'Verarbeite...' : 'Voice'}
              </Text>
              {partialTranscript ? (
                <Text style={styles.voiceStatusTranscript} numberOfLines={1}>
                  "{partialTranscript}"
                </Text>
              ) : null}
            </View>
            {lastCommand && (
              <View style={styles.commandBadge}>
                <Text style={styles.commandBadgeText}>⚡ {lastCommand.phrase}</Text>
              </View>
            )}
          </View>
          <Pressable 
            style={styles.voiceStatusClose}
            onPress={() => {
              stopListening();
              stopSpeaking();
              setVoiceState('idle');
              setPartialTranscript('');
              setLastCommand(null);
            }}
          >
            <Text style={styles.voiceStatusCloseText}>✕</Text>
          </Pressable>
        </View>
      )}
      
      {/* 🎛️ Premium Voice Controls */}
      {voiceSupport.stt && (
        <View style={styles.voiceControlsBar}>
          {/* Voice Mode Indicator */}
          <Pressable 
            style={styles.voiceModeButton}
            onPress={cycleVoiceMode}
            onLongPress={() => Alert.alert(
              '🎤 Voice-Modi',
              '• Einmal: Hört einmal zu\n• Dauer: Hört dauerhaft\n• Wake: Reagiert auf "Hey MENTOR"'
            )}
          >
            <Text style={styles.voiceModeIcon}>
              {voiceMode === 'normal' ? '1️⃣' : 
               voiceMode === 'continuous' ? '🔄' : '👋'}
            </Text>
            <Text style={styles.voiceModeLabel}>
              {voiceMode === 'normal' ? 'Einmal' : 
               voiceMode === 'continuous' ? 'Dauer' : 'Hey MENTOR'}
            </Text>
          </Pressable>
          
          {/* Auto-Read Toggle */}
          <Pressable 
            style={[styles.autoReadButton, autoRead && styles.autoReadActive]}
            onPress={toggleAutoRead}
          >
            <Text style={styles.autoReadIcon}>{autoRead ? '🔊' : '🔇'}</Text>
            <Text style={[styles.autoReadLabel, autoRead && styles.autoReadLabelActive]}>
              Auto
            </Text>
          </Pressable>
          
          {/* Voice Commands Info */}
          <Pressable 
            style={styles.voiceHelpButton}
            onPress={() => Alert.alert(
              '🎯 Sprachbefehle',
              Object.keys(VOICE_CONFIG.commands).map(cmd => `• "${cmd}"`).join('\n'),
              [{ text: 'Cool!' }]
            )}
          >
            <Text style={styles.voiceHelpIcon}>❓</Text>
          </Pressable>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            (voiceState === 'listening' || voiceState === 'hearing') && styles.inputListening
          ]}
          value={input}
          onChangeText={setInput}
          placeholder={
            voiceState === 'listening' ? "🎤 Sprich jetzt..." :
            voiceState === 'hearing' ? "👂 Sprache erkannt..." :
            "Schreibe eine Nachricht..."
          }
          placeholderTextColor={
            (voiceState === 'listening' || voiceState === 'hearing') ? "#3b82f6" : "#94a3b8"
          }
          multiline={Platform.OS !== 'web'}
          maxLength={1000}
          onSubmitEditing={() => {
            sendMessage();
          }}
          blurOnSubmit={false}
          returnKeyType="send"
          accessibilityLabel="Nachricht eingeben"
        />
        
        {/* 🎤 Premium Mikrofon Button */}
        {voiceSupport.stt && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable 
              style={({ pressed }) => [
                styles.voiceButton, 
                pressed && styles.voiceButtonPressed,
                (voiceState === 'listening' || voiceState === 'hearing') && styles.voiceButtonActive
              ]} 
              onPress={() => toggleListening()}
              onLongPress={() => toggleListening('continuous')}
              accessibilityRole="button"
              accessibilityLabel={voiceState !== 'idle' ? "Spracherkennung stoppen" : "Spracherkennung starten"}
            >
              <Text style={styles.voiceButtonText}>
                {voiceState === 'listening' ? '🔴' : 
                 voiceState === 'hearing' ? '🟢' :
                 voiceState === 'processing' ? '⏳' : '🎤'}
              </Text>
            </Pressable>
          </Animated.View>
        )}
        
        {/* Send Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.sendButton, 
            pressed && styles.sendButtonPressed, 
            (!input.trim() || loading) && styles.sendButtonDisabled
          ]} 
          onPress={sendMessage}
          disabled={!input.trim() || loading}
          accessibilityRole="button"
          accessibilityLabel="Nachricht senden"
          testID="send-button"
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </Pressable>
      </View>
      
      {/* 📚 Quick Templates Modal */}
      <QuickTemplatesModal
        visible={templatesModalVisible}
        onClose={() => setTemplatesModalVisible(false)}
        onSendToChief={(content) => {
          setInput(content);
          setTemplatesModalVisible(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    backgroundColor: '#3b82f6', 
    padding: 16, 
    paddingTop: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerEmoji: {
    fontSize: 32,
    marginRight: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  headerStatusContainer: {
    alignItems: 'flex-end',
  },
  headerProgressBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerProgressText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  headerRemainingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  headerBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  templatesButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  templatesButtonText: {
    fontSize: 18,
  },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 20 },
  messageBubble: { 
    maxWidth: '85%', 
    padding: 14, 
    borderRadius: 18, 
    marginBottom: 12 
  },
  userBubble: { 
    backgroundColor: '#3b82f6', 
    alignSelf: 'flex-end', 
    borderBottomRightRadius: 4 
  },
  assistantBubble: { 
    backgroundColor: 'white', 
    alignSelf: 'flex-start', 
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  // 🆕 Live Assist Bubble Style
  liveAssistBubble: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  botLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  botLabel: { 
    fontSize: 11, 
    color: '#3b82f6', 
    fontWeight: '600'
  },
  contextBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  contextBadgeText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  // 🆕 Live Assist Styles
  objectionBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  objectionBadgeText: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  responseTimeText: {
    fontSize: 9,
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(34, 211, 238, 0.15)',
  },
  actionButton: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: '#0891B2',
    fontSize: 13,
    fontWeight: '600',
  },
  messageText: { 
    fontSize: 16, 
    color: '#1e293b', 
    lineHeight: 24 
  },
  userText: { color: 'white' },
  feedbackContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  feedbackLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginRight: 10
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 6
  },
  feedbackButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  feedbackButtonActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e'
  },
  feedbackButtonNegative: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444'
  },
  feedbackEmoji: {
    fontSize: 16
  },
  feedbackThanks: {
    fontSize: 11,
    color: '#22c55e',
    marginLeft: 10,
    fontWeight: '500'
  },
  loadingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  loadingText: { marginLeft: 10, color: '#64748b', fontSize: 14 },
  quickActionsContainer: { 
    marginTop: 16, 
    padding: 16, 
    backgroundColor: 'white', 
    borderRadius: 16 
  },
  quickActionsTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#64748b', 
    marginBottom: 12 
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  quickActionButton: { 
    backgroundColor: '#f1f5f9', 
    paddingHorizontal: 14,
    paddingVertical: 12, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  quickActionText: { 
    fontSize: 14, 
    color: '#1e293b' 
  },
  // 🆕 Live Assist Quick Action Styles
  liveAssistQuickActionButton: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  liveAssistQuickActionText: {
    color: '#15803d',
    fontWeight: '600',
  },
  liveAssistQuickActionsContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  liveAssistQuickActionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 8,
    marginLeft: 4,
  },
  liveAssistQuickActionsScroll: {
    paddingHorizontal: 4,
    gap: 8,
  },
  liveAssistQuickActionChip: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    marginRight: 8,
  },
  liveAssistQuickActionChipText: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '500',
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // MENTOR Quick Replies Styles
  // ═══════════════════════════════════════════════════════════════════════
  mentorQuickRepliesContainer: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(34, 211, 238, 0.2)',
  },
  mentorQuickRepliesScroll: {
    paddingHorizontal: 8,
    gap: 10,
  },
  mentorQuickReplyButton: {
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    marginRight: 10,
  },
  mentorQuickReplyText: {
    fontSize: 14,
    color: '#0891B2',
    fontWeight: '600',
  },
  
  inputContainer: { 
    flexDirection: 'row', 
    padding: 16, 
    backgroundColor: 'white', 
    borderTopWidth: 1, 
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end'
  },
  input: { 
    flex: 1, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 24, 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    fontSize: 16, 
    maxHeight: 120, 
    color: '#1e293b' 
  },
  sendButton: { 
    width: 48, 
    height: 48, 
    backgroundColor: '#3b82f6', 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 10 
  },
  sendButtonPressed: { backgroundColor: '#2563eb' },
  sendButtonDisabled: { backgroundColor: '#cbd5e1' },
  sendButtonText: { fontSize: 20, color: 'white' },
  
  // Voice Styles
  voiceButton: {
    width: 48,
    height: 48,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  voiceButtonPressed: {
    backgroundColor: '#e2e8f0',
  },
  voiceButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  voiceButtonText: {
    fontSize: 20,
  },
  speakerButton: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  speakerButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  speakerButtonPaused: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  speakerButtonText: {
    fontSize: 18,
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🎤 PREMIUM VOICE STYLES
  // ═══════════════════════════════════════════════════════════════════════
  
  voiceStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  voiceStatusListening: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  voiceStatusHearing: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  voiceStatusSpeaking: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  voiceStatusContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceStatusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  voiceStatusTextContainer: {
    flex: 1,
  },
  voiceStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  voiceStatusTranscript: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  voiceStatusClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  voiceStatusCloseText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 'bold',
  },
  commandBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  commandBadgeText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  
  voiceControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  voiceModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  voiceModeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  voiceModeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  autoReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  autoReadActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  autoReadIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  autoReadLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  autoReadLabelActive: {
    color: '#3b82f6',
  },
  voiceHelpButton: {
    width: 36,
    height: 36,
    backgroundColor: 'white',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  voiceHelpIcon: {
    fontSize: 16,
  },
  
  inputListening: {
    borderWidth: 2,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  
  partialTranscriptContainer: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  partialTranscriptText: {
    color: '#1e40af',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

