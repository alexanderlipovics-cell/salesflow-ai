import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  RefreshControl, 
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Clipboard,
  Linking,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../services/apiConfig';
import { useFollowUps } from '../../hooks/useFollowUps';
import { useDailyFlow } from '../../hooks/useDailyFlow';

// API URL aus zentraler Config
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');
const getChiefApiUrl = () => `${API_CONFIG.baseUrl}/ai/chief`;

const PRIORITY_CONFIG = {
  high: { label: '🔥 Hoch', color: '#ef4444', bgColor: '#fee2e2' },
  medium: { label: '⚡ Mittel', color: '#f59e0b', bgColor: '#fef3c7' },
  low: { label: '📌 Niedrig', color: '#64748b', bgColor: '#f1f5f9' },
};

const ACTION_TYPES = {
  call: { label: '📞 Anrufen', icon: '📞' },
  email: { label: '📧 E-Mail', icon: '📧' },
  meeting: { label: '🤝 Meeting', icon: '🤝' },
  message: { label: '💬 Nachricht', icon: '💬' },
  follow_up: { label: '📋 Follow-up', icon: '📋' },
};

// Demo-Daten falls API nicht verfügbar
const SAMPLE_FOLLOWUPS = [
  {
    id: '1',
    lead_name: 'Max Mustermann',
    lead_id: '1',
    action: 'call',
    description: 'Angebot besprechen',
    due_date: new Date().toISOString().split('T')[0], // Heute
    priority: 'high',
    completed: false
  },
  {
    id: '2',
    lead_name: 'Anna Schmidt',
    lead_id: '2',
    action: 'email',
    description: 'Demo-Unterlagen senden',
    due_date: new Date().toISOString().split('T')[0], // Heute
    priority: 'medium',
    completed: false
  },
  {
    id: '3',
    lead_name: 'Thomas Weber',
    lead_id: '3',
    action: 'meeting',
    description: 'Abschlussgespräch',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // In 2 Tagen
    priority: 'high',
    completed: false
  },
  {
    id: '4',
    lead_name: 'Lisa Müller',
    lead_id: '4',
    action: 'message',
    description: 'Interesse nachfragen',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // In 5 Tagen
    priority: 'low',
    completed: false
  },
  {
    id: '5',
    lead_name: 'Peter Becker',
    lead_id: '5',
    action: 'follow_up',
    description: 'Nachfassen wegen Entscheidung',
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Gestern (überfällig)
    priority: 'high',
    completed: false
  },
  {
    id: '6',
    lead_name: 'Sarah Koch',
    lead_id: '6',
    action: 'call',
    description: 'Onboarding-Call',
    due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // In 10 Tagen
    priority: 'medium',
    completed: true
  }
];

export default function FollowUpsScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Translated configs
  const PRIORITY_CONFIG_T = {
    high: { label: t('followups.priority.high'), color: '#ef4444', bgColor: '#fee2e2' },
    medium: { label: t('followups.priority.medium'), color: '#f59e0b', bgColor: '#fef3c7' },
    low: { label: t('followups.priority.low'), color: '#64748b', bgColor: '#f1f5f9' },
  };
  
  const ACTION_TYPES_T = {
    call: { label: t('followups.action_types.call'), icon: '📞' },
    email: { label: t('followups.action_types.email'), icon: '📧' },
    meeting: { label: t('followups.action_types.meeting'), icon: '🤝' },
    message: { label: t('followups.action_types.message'), icon: '💬' },
    follow_up: { label: t('followups.action_types.follow_up'), icon: '📋' },
  };
  
  // User-Name aus Supabase Metadaten holen
  const getUserName = () => {
    if (!user) return '';
    return user.user_metadata?.full_name 
      || user.user_metadata?.name 
      || user.email?.split('@')[0] 
      || '';
  };
  
  // Use the unified Follow-ups Hook (with Daily Flow sync)
  const {
    followUps,
    grouped: groupedFollowUps,
    stats: followUpStats,
    loading,
    toggleComplete,
    createFollowUp: createFollowUpApi,
    refetch,
  } = useFollowUps({ userId: user?.id });
  
  // Daily Flow Hook for sync
  const { 
    plan: dailyPlan, 
    progress: dailyProgress,
    refetch: refetchDailyFlow,
  } = useDailyFlow({ autoGenerate: false });
  
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Suggestion Modal State
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Formular-State für neues Follow-up
  const [newFollowUp, setNewFollowUp] = useState({
    lead_name: '',
    action: 'call',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'medium'
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    await refetchDailyFlow();
    setRefreshing(false);
  };
  
  // Wrapper für toggleComplete mit Daily Flow Sync
  const handleToggleComplete = useCallback(async (followUpId) => {
    await toggleComplete(followUpId);
    // Refresh Daily Flow to update stats
    setTimeout(() => refetchDailyFlow(), 500);
  }, [toggleComplete, refetchDailyFlow]);

  // ==========================================================================
  // FOLLOW-UP VORSCHLAG VON CHIEF HOLEN
  // ==========================================================================
  
  const openFollowUpWithSuggestion = async (followUp) => {
    setSelectedFollowUp(followUp);
    setSuggestionModalVisible(true);
    setSuggestionLoading(true);
    setSuggestion('');
    setCopied(false);
    
    try {
      // Generiere Nachrichtenvorschlag von CHIEF
      const response = await fetch(`${getChiefApiUrl()}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': user?.access_token ? `Bearer ${user.access_token}` : '',
        },
        body: JSON.stringify({
          message: `Schreibe eine ${getActionLabel(followUp)} Nachricht für ${followUp.lead_name}. 
Kontext: ${followUp.description}
Priorität: ${followUp.priority}
Fällig: ${formatDate(followUp.due_date)}
Absender-Name: ${getUserName()}

Generiere NUR die Nachricht, ohne Erklärung. Kurz, direkt, persönlich. Unterschreibe mit dem echten Namen des Absenders (${getUserName()}), nicht mit Platzhaltern wie "[Dein Name]".`,
          include_context: true,
          company_id: user?.company_id,
          context: {
            type: 'follow_up_suggestion',
            lead_name: followUp.lead_name,
            action: followUp.action,
            description: followUp.description,
            sender_name: getUserName(),
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestion(data.reply || data.response || data.message || '');
      } else {
        // Fallback auf Demo
        const demoResponse = await fetch(`${getChiefApiUrl()}/chat/demo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Schreibe eine kurze Follow-up Nachricht für ${followUp.lead_name}. Thema: ${followUp.description}. Absender: ${getUserName()}. Nur die Nachricht, kurz und persönlich. Unterschreibe mit "${getUserName()}".`,
            include_context: true,
          })
        });
        
        if (demoResponse.ok) {
          const demoData = await demoResponse.json();
          setSuggestion(demoData.reply || demoData.response || demoData.message || getDefaultSuggestion(followUp));
        } else {
          setSuggestion(getDefaultSuggestion(followUp));
        }
      }
    } catch (error) {
      console.log('Suggestion API Error:', error);
      setSuggestion(getDefaultSuggestion(followUp));
    } finally {
      setSuggestionLoading(false);
    }
  };
  
  const getActionLabel = (followUp) => {
    const labels = {
      call: 'Anruf-Vorbereitung',
      email: 'E-Mail',
      meeting: 'Meeting-Einladung',
      message: 'WhatsApp/Nachricht',
      follow_up: 'Follow-up',
    };
    return labels[followUp.action] || 'Nachricht';
  };
  
  const getDefaultSuggestion = (followUp) => {
    const senderName = getUserName();
    const signOff = senderName ? `\n\nViele Grüße,\n${senderName}` : '\n\nLG';
    
    const templates = {
      call: `Hey ${followUp.lead_name}! 👋\n\nIch wollte kurz nachhaken bezüglich ${followUp.description}.\n\nHast du heute kurz Zeit für ein Telefonat? Dauert max. 10 Minuten.${signOff}`,
      email: `Hallo ${followUp.lead_name},\n\nbezüglich ${followUp.description} wollte ich mich kurz bei dir melden.\n\nWann passt es dir am besten für einen kurzen Austausch?${signOff}`,
      meeting: `Hey ${followUp.lead_name}! 👋\n\nWie besprochen: ${followUp.description}\n\nWann hast du diese Woche Zeit? Ich schicke dir gerne einen Kalenderlink.${signOff}`,
      message: `Hey ${followUp.lead_name}! 👋\n\n${followUp.description} - was meinst du, wann können wir das angehen?${signOff}`,
      follow_up: `Hey ${followUp.lead_name}! 👋\n\nIch wollte mich kurz melden wegen ${followUp.description}.\n\nWie sieht's bei dir aus?${signOff}`,
    };
    return templates[followUp.action] || templates.follow_up;
  };
  
  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.unknown'));
    }
  };
  
  const openWhatsApp = () => {
    // Wenn Lead Telefonnummer hat, öffne WhatsApp
    const encodedMessage = encodeURIComponent(suggestion);
    const url = `whatsapp://send?text=${encodedMessage}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('errors.unknown'));
      }
    });
  };
  
  const regenerateSuggestion = () => {
    if (selectedFollowUp) {
      openFollowUpWithSuggestion(selectedFollowUp);
    }
  };

  const createFollowUp = async () => {
    if (!newFollowUp.lead_name.trim() || !newFollowUp.description.trim()) {
      Alert.alert(t('common.error'), t('errors.unknown'));
      return;
    }

    try {
      await createFollowUpApi(newFollowUp);
      
      setModalVisible(false);
      setNewFollowUp({
        lead_name: '',
        action: 'call',
        description: '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'medium'
      });
      
      // Refresh Daily Flow
      refetchDailyFlow();
    } catch (error) {
      console.log('Create Follow-up error:', error);
      setModalVisible(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return `${days[date.getDay()]}, ${date.getDate()}.${date.getMonth() + 1}.`;
  };

  const FollowUpCard = ({ followUp, isOverdue = false }) => {
    const priority = PRIORITY_CONFIG[followUp.priority] || PRIORITY_CONFIG.medium;
    const action = ACTION_TYPES[followUp.action] || ACTION_TYPES.follow_up;

    return (
      <Pressable 
        style={[
          styles.followUpCard, 
          followUp.completed && styles.completedCard,
          isOverdue && styles.overdueCard
        ]}
        onPress={() => !followUp.completed && openFollowUpWithSuggestion(followUp)}
      >
        {/* Checkbox - separater Touch für Complete */}
        <Pressable 
          style={[
            styles.checkbox, 
            followUp.completed && styles.checkboxChecked
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleToggleComplete(followUp.id);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {followUp.completed && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[
              styles.leadName, 
              followUp.completed && styles.completedText
            ]}>
              {followUp.lead_name}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: priority.bgColor }]}>
              <Text style={[styles.priorityText, { color: priority.color }]}>
                {priority.label}
              </Text>
            </View>
          </View>
          
          <View style={styles.actionRow}>
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={[
              styles.description, 
              followUp.completed && styles.completedText
            ]}>
              {followUp.description}
            </Text>
          </View>
          
          <View style={styles.cardFooter}>
            <Text style={[
              styles.dueDate, 
              isOverdue && styles.overdueDateText
            ]}>
              📅 {formatDate(followUp.due_date)}
              {isOverdue && ' (überfällig!)'}
            </Text>
            {!followUp.completed && (
              <View style={styles.aiHint}>
                <Text style={styles.aiHintText}>✨ Tippen für Vorschlag</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const SectionHeader = ({ title, count, color = '#1e293b', icon }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={[styles.countBadge, { backgroundColor: color }]}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Follow-ups werden geladen...</Text>
      </View>
    );
  }

  const pendingCount = followUpStats.pending;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Follow-ups</Text>
        <Text style={styles.headerSubtitle}>
          {pendingCount} offen • {followUpStats.completed} erledigt
        </Text>
      </View>
      
      {/* Daily Flow Integration Banner */}
      {dailyPlan && (
        <View style={styles.dailyFlowBanner}>
          <View style={styles.dailyFlowBannerLeft}>
            <Text style={styles.dailyFlowBannerIcon}>🎯</Text>
            <View>
              <Text style={styles.dailyFlowBannerTitle}>Tagesfortschritt</Text>
              <Text style={styles.dailyFlowBannerSubtitle}>
                {followUpStats.todayCount} Follow-ups heute geplant
              </Text>
            </View>
          </View>
          <View style={styles.dailyFlowProgress}>
            <Text style={styles.dailyFlowProgressText}>{dailyProgress}%</Text>
            <View style={styles.dailyFlowProgressBar}>
              <View 
                style={[
                  styles.dailyFlowProgressFill, 
                  { width: `${Math.min(dailyProgress, 100)}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{groupedFollowUps.overdue.length}</Text>
          <Text style={styles.statLabel}>Überfällig</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{groupedFollowUps.today.length}</Text>
          <Text style={styles.statLabel}>Heute</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{groupedFollowUps.week.length}</Text>
          <Text style={styles.statLabel}>Diese Woche</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Überfällig */}
        {groupedFollowUps.overdue.length > 0 && (
          <View style={styles.section}>
            <SectionHeader 
              title="Überfällig" 
              count={groupedFollowUps.overdue.length} 
              color="#ef4444"
              icon="🚨"
            />
            {groupedFollowUps.overdue.map(followUp => (
              <FollowUpCard key={followUp.id} followUp={followUp} isOverdue />
            ))}
          </View>
        )}

        {/* Heute */}
        {groupedFollowUps.today.length > 0 && (
          <View style={styles.section}>
            <SectionHeader 
              title="Heute" 
              count={groupedFollowUps.today.length} 
              color="#3b82f6"
              icon="📌"
            />
            {groupedFollowUps.today.map(followUp => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))}
          </View>
        )}

        {/* Diese Woche */}
        {groupedFollowUps.week.length > 0 && (
          <View style={styles.section}>
            <SectionHeader 
              title="Diese Woche" 
              count={groupedFollowUps.week.length} 
              color="#f59e0b"
              icon="📆"
            />
            {groupedFollowUps.week.map(followUp => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))}
          </View>
        )}

        {/* Später */}
        {groupedFollowUps.later.length > 0 && (
          <View style={styles.section}>
            <SectionHeader 
              title="Später" 
              count={groupedFollowUps.later.length} 
              color="#64748b"
              icon="📅"
            />
            {groupedFollowUps.later.map(followUp => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))}
          </View>
        )}

        {/* Erledigt Toggle */}
        <Pressable 
          style={styles.completedToggle}
          onPress={() => setShowCompleted(!showCompleted)}
        >
          <Text style={styles.completedToggleText}>
            {showCompleted ? '▼' : '▶'} Erledigte anzeigen ({groupedFollowUps.completed.length})
          </Text>
        </Pressable>

        {/* Erledigt */}
        {showCompleted && groupedFollowUps.completed.length > 0 && (
          <View style={styles.section}>
            {groupedFollowUps.completed.map(followUp => (
              <FollowUpCard key={followUp.id} followUp={followUp} />
            ))}
          </View>
        )}

        {/* Empty State */}
        {pendingCount === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>Alles erledigt!</Text>
            <Text style={styles.emptyText}>
              Keine offenen Follow-ups. Erstelle ein neues oder entspann dich.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      {/* Neues Follow-up Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Neues Follow-up</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Kontakt / Lead *</Text>
            <TextInput
              style={styles.input}
              value={newFollowUp.lead_name}
              onChangeText={(text) => setNewFollowUp(prev => ({ ...prev, lead_name: text }))}
              placeholder="Name des Kontakts"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Aktion</Text>
            <View style={styles.actionGrid}>
              {Object.entries(ACTION_TYPES).map(([key, config]) => (
                <Pressable 
                  key={key}
                  style={[
                    styles.actionChip,
                    newFollowUp.action === key && styles.actionChipActive
                  ]}
                  onPress={() => setNewFollowUp(prev => ({ ...prev, action: key }))}
                >
                  <Text style={styles.actionChipIcon}>{config.icon}</Text>
                  <Text style={[
                    styles.actionChipText,
                    newFollowUp.action === key && styles.actionChipTextActive
                  ]}>
                    {config.label.split(' ')[1]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Beschreibung *</Text>
            <TextInput
              style={styles.input}
              value={newFollowUp.description}
              onChangeText={(text) => setNewFollowUp(prev => ({ ...prev, description: text }))}
              placeholder="Was soll gemacht werden?"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Fällig am</Text>
            <TextInput
              style={styles.input}
              value={newFollowUp.due_date}
              onChangeText={(text) => setNewFollowUp(prev => ({ ...prev, due_date: text }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputLabel}>Priorität</Text>
            <View style={styles.priorityRow}>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <Pressable 
                  key={key}
                  style={[
                    styles.priorityChip,
                    newFollowUp.priority === key && { backgroundColor: config.color }
                  ]}
                  onPress={() => setNewFollowUp(prev => ({ ...prev, priority: key }))}
                >
                  <Text style={[
                    styles.priorityChipText,
                    newFollowUp.priority === key && { color: 'white' }
                  ]}>
                    {config.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.submitButton} onPress={createFollowUp}>
              <Text style={styles.submitButtonText}>✨ Follow-up erstellen</Text>
            </Pressable>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ========== SUGGESTION MODAL ========== */}
      <Modal
        visible={suggestionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSuggestionModalVisible(false)}
      >
        <View style={styles.suggestionModalOverlay}>
          <View style={styles.suggestionModalContent}>
            {/* Header */}
            <View style={styles.suggestionModalHeader}>
              <View style={styles.suggestionModalHeaderLeft}>
                <Text style={styles.suggestionModalIcon}>✨</Text>
                <View>
                  <Text style={styles.suggestionModalTitle}>Nachrichtenvorschlag</Text>
                  {selectedFollowUp && (
                    <Text style={styles.suggestionModalSubtitle}>
                      für {selectedFollowUp.lead_name}
                    </Text>
                  )}
                </View>
              </View>
              <Pressable 
                onPress={() => setSuggestionModalVisible(false)}
                style={styles.suggestionCloseButton}
              >
                <Text style={styles.suggestionCloseButtonText}>✕</Text>
              </Pressable>
            </View>

            {/* Follow-up Info */}
            {selectedFollowUp && (
              <View style={styles.followUpInfo}>
                <View style={styles.followUpInfoRow}>
                  <Text style={styles.followUpInfoIcon}>
                    {ACTION_TYPES[selectedFollowUp.action]?.icon || '📋'}
                  </Text>
                  <Text style={styles.followUpInfoText}>
                    {selectedFollowUp.description}
                  </Text>
                </View>
              </View>
            )}

            {/* Suggestion Content */}
            <View style={styles.suggestionContent}>
              {suggestionLoading ? (
                <View style={styles.suggestionLoading}>
                  <ActivityIndicator size="large" color="#8b5cf6" />
                  <Text style={styles.suggestionLoadingText}>
                    🧠 CHIEF denkt nach...
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.suggestionScroll}>
                  <Text style={styles.suggestionText} selectable>
                    {suggestion}
                  </Text>
                </ScrollView>
              )}
            </View>

            {/* Actions */}
            {!suggestionLoading && (
              <View style={styles.suggestionActions}>
                {/* Copy Button */}
                <Pressable 
                  style={[styles.suggestionButton, styles.suggestionButtonCopy]}
                  onPress={copyToClipboard}
                >
                  <Text style={styles.suggestionButtonIcon}>
                    {copied ? '✅' : '📋'}
                  </Text>
                  <Text style={styles.suggestionButtonText}>
                    {copied ? 'Kopiert!' : 'Kopieren'}
                  </Text>
                </Pressable>

                {/* WhatsApp Button */}
                <Pressable 
                  style={[styles.suggestionButton, styles.suggestionButtonWhatsApp]}
                  onPress={openWhatsApp}
                >
                  <Text style={styles.suggestionButtonIcon}>💬</Text>
                  <Text style={[styles.suggestionButtonText, { color: '#fff' }]}>
                    WhatsApp öffnen
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Regenerate & Complete */}
            {!suggestionLoading && (
              <View style={styles.suggestionFooter}>
                <Pressable 
                  style={styles.regenerateButton}
                  onPress={regenerateSuggestion}
                >
                  <Text style={styles.regenerateButtonText}>🔄 Neu generieren</Text>
                </Pressable>
                
                <Pressable 
                  style={styles.completeButton}
                  onPress={() => {
                    if (selectedFollowUp) {
                      handleToggleComplete(selectedFollowUp.id);
                      setSuggestionModalVisible(false);
                    }
                  }}
                >
                  <Text style={styles.completeButtonText}>✓ Als erledigt markieren</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  header: { backgroundColor: '#8b5cf6', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  
  // Daily Flow Integration Banner
  dailyFlowBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  dailyFlowBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dailyFlowBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dailyFlowBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  dailyFlowBannerSubtitle: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 2,
  },
  dailyFlowProgress: {
    alignItems: 'flex-end',
  },
  dailyFlowProgressText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 4,
  },
  dailyFlowProgressBar: {
    width: 60,
    height: 6,
    backgroundColor: '#dcfce7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  dailyFlowProgressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  statsBar: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    paddingVertical: 16, 
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#e2e8f0', marginVertical: 4 },
  listContainer: { flex: 1 },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { color: 'white', fontSize: 12, fontWeight: '600' },
  followUpCard: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  completedCard: { opacity: 0.6, backgroundColor: '#f8fafc' },
  overdueCard: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  checkbox: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#cbd5e1',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxChecked: { backgroundColor: '#10b981', borderColor: '#10b981' },
  checkmark: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leadName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', flex: 1 },
  completedText: { textDecorationLine: 'line-through', color: '#94a3b8' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priorityText: { fontSize: 10, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  actionIcon: { fontSize: 14, marginRight: 6 },
  description: { fontSize: 14, color: '#475569', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  dueDate: { fontSize: 12, color: '#64748b' },
  overdueDateText: { color: '#ef4444', fontWeight: '600' },
  aiHint: { backgroundColor: '#f3e8ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  aiHintText: { fontSize: 10, color: '#8b5cf6', fontWeight: '600' },
  completedToggle: { padding: 16, marginHorizontal: 16, marginTop: 16, backgroundColor: 'white', borderRadius: 12 },
  completedToggleText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
  bottomSpacer: { height: 100 },
  fab: { 
    position: 'absolute', 
    right: 20, 
    bottom: 90,
    width: 56, 
    height: 56, 
    backgroundColor: '#8b5cf6', 
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  fabIcon: { fontSize: 32, color: 'white', marginTop: -2 },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24,
    maxHeight: '90%'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  closeButton: { fontSize: 24, color: '#94a3b8', padding: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, color: '#1e293b' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  actionChipActive: { borderColor: '#3b82f6', backgroundColor: '#dbeafe' },
  actionChipIcon: { fontSize: 16, marginRight: 6 },
  actionChipText: { fontSize: 13, color: '#64748b' },
  actionChipTextActive: { color: '#3b82f6', fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: { flex: 1, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center' },
  priorityChipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  submitButton: { backgroundColor: '#8b5cf6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  
  // Suggestion Modal Styles
  suggestionModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end' 
  },
  suggestionModalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 20,
    maxHeight: '85%',
    minHeight: '50%',
  },
  suggestionModalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestionModalHeaderLeft: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12,
  },
  suggestionModalIcon: { fontSize: 32 },
  suggestionModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  suggestionModalSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  suggestionCloseButton: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionCloseButtonText: { fontSize: 18, color: '#64748b' },
  
  followUpInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  followUpInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followUpInfoIcon: { fontSize: 16 },
  followUpInfoText: { fontSize: 14, color: '#475569', flex: 1 },
  
  suggestionContent: {
    flex: 1,
    backgroundColor: '#faf5ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    minHeight: 150,
  },
  suggestionLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  suggestionLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  suggestionScroll: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
  },
  
  suggestionActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  suggestionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  suggestionButtonCopy: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  suggestionButtonWhatsApp: {
    backgroundColor: '#25D366',
  },
  suggestionButtonIcon: { fontSize: 18 },
  suggestionButtonText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  
  suggestionFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  regenerateButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  regenerateButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#10b981',
  },
  completeButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
});

