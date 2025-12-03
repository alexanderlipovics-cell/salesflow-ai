// app/lead-detail.tsx (OPTIMIZED)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LeadDetailData, RecentAction, fetchLeadDetail, logGeneralAction } from '../api/mockApi';
import { useSalesFlow } from '../context/SalesFlowContext';
import { COLORS, formatTime, getActionIcon } from '../utils';
import { logger } from '../utils/logger';
import { DocumentList } from '../components/DocumentList';
import { VoiceNotesSection } from '../components/VoiceNotesSection';

// SUB-COMPONENT: Action Row (OPTIMIZED)
const ActionRow: React.FC<{ action: RecentAction }> = ({ action }) => {
  // FIXED: Now shows emoji icon
  const icon = getActionIcon(action.type);
  
  return (
    <View style={detailStyles.actionRow}>
      <Text style={detailStyles.actionIcon}>{icon}</Text>
      <Text style={detailStyles.actionType}>
        {action.type.toUpperCase()}
      </Text>
      <Text style={detailStyles.actionDetail}>
        {action.outcome.replace(/_/g, ' ')}
      </Text>
      <Text style={detailStyles.actionTime}>
        {formatTime(action.at)}
      </Text>
    </View>
  );
};

// --- NEUE HILFSKOMPONENTE: ActionLogger ---
const ActionLogger: React.FC<{ leadId: string, channel: string }> = ({ leadId, channel }) => {
  const { updateUserStats, todayData, profileData } = useSalesFlow();
  const [isLogging, setIsLogging] = useState(false);

  // Hilfsfunktion: Fügt die neuen Punkte zu den aktuellen Statistiken hinzu
  const logActionAndRefresh = async (actionType: string, outcome: string, points: number) => {
    if (!todayData) return;
    
    setIsLogging(true);
    try {
      const response = await logGeneralAction(leadId, actionType, outcome, points);

      // Aktualisiere den globalen State mit den neuen Werten vom Server
      const newStats = {
        ...todayData.user_stats,
        today_contacts_done: response.new_totals.total_contacts,
        today_points_done: response.new_totals.total_points,
      };
      updateUserStats(newStats); // Aktualisiere den globalen Context

      Alert.alert('Erfolg', `${actionType} als ${outcome} geloggt! +${points} Punkte.`);

    } catch (error) {
      Alert.alert('Fehler', `Aktion konnte nicht geloggt werden.`);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <View style={loggerStyles.buttonContainer}>
      <TouchableOpacity 
        style={[loggerStyles.actionButton, loggerStyles.whatsappButton]}
        onPress={() => logActionAndRefresh(channel, 'message_sent', 4)}
        disabled={isLogging}
      >
        <Text style={loggerStyles.buttonText}>
          {isLogging ? 'Sende...' : `💬 ${channel.toUpperCase()} loggen`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[loggerStyles.actionButton, loggerStyles.callButton]}
        onPress={() => logActionAndRefresh('call', 'follow_up_scheduled', 8)}
        disabled={isLogging}
      >
        <Text style={loggerStyles.buttonText}>
          {isLogging ? 'Logge Anruf...' : `📞 Call loggen`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Styles für den ActionLogger
const loggerStyles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    opacity: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  callButton: {
    backgroundColor: '#03A9F4',
  }
});
// --- ENDE ActionLogger ---

export default function LeadDetailScreen() {
  const { leadId } = useLocalSearchParams<{ leadId: string }>();
  const router = useRouter();
  
  // Fallback für Mock
  const actualLeadId = leadId || 'lead-1';

  const [data, setData] = useState<LeadDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const detailData = await fetchLeadDetail(actualLeadId);
        setData(detailData);
      } catch (err) {
        logger.error('Lead detail fetch failed', err);
        setError('Fehler beim Laden der Lead-Details.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [actualLeadId]);

  // FIXED: Added loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Lade Lead-Details...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>⚠️ {error || 'Lead nicht gefunden.'}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { lead, last_activity, next_step, memory_summary, recent_actions } = data;
  const workspaceId = profileData?.workspace_id ?? 'demo-workspace';
  const companyName = lead.company_id.split('-')[1]?.toUpperCase() || 'UNKNOWN';
  const discColor = lead.disc_primary === 'D' ? '#F44336' : 
                   (lead.disc_primary === 'I' ? '#FFC107' : 
                   (lead.disc_primary === 'S' ? '#4CAF50' : '#2196F3'));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButtonHeader}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.header}>{lead.name} ({companyName})</Text>
      </View>

      {/* Kontakt & Stage Header */}
      <View style={styles.stageHeader}>
        <Text style={styles.stageText}>{lead.stage}</Text>
        <Text style={[styles.discBadge, { backgroundColor: discColor }]}>
          DISC: {lead.disc_primary} ({Math.round(lead.disc_confidence * 100)}%)
        </Text>
      </View>

      {/* --- NEUE AKTIONEN --- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⭐ Neue Aktion loggen</Text>
        <ActionLogger 
          leadId={lead.id} 
          channel={lead.channel_main} 
        />
      </View>
      {/* --------------------- */}

      {/* Next Step Box */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Nächster Schritt</Text>
        <View style={detailStyles.nextStepBox}>
          <Text style={detailStyles.nextStepDue}>
            Fällig: {formatTime(next_step.due_at)}
          </Text>
          <Text style={detailStyles.nextStepSuggestion}>
            {next_step.suggestion}
          </Text>
        </View>
        
        <Button 
          title="Chat öffnen" 
          onPress={() =>
            router.push({
              pathname: '/chat/[leadId]',
              params: {
                leadId: lead.id,
                leadName: lead.name,
                leadPhone: lead.phone,
                channel: lead.channel_main,
              },
            })
          }
          color={COLORS.primary}
        />
      </View>

      {/* Letzte Aktivität */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💬 Letzte Aktivität</Text>
        <Text style={styles.activityTime}>{formatTime(last_activity.at)} ({last_activity.type})</Text>
        <Text style={styles.activityNote}>"{last_activity.note}"</Text>
      </View>

      {/* Memory Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🧠 Wichtige Infos</Text>
        <View style={detailStyles.memoryContainer}>
          {/* FIXED: Added empty state */}
          {memory_summary.length === 0 ? (
            <Text style={detailStyles.emptyMemory}>
              Noch keine Notizen vorhanden
            </Text>
          ) : (
            memory_summary.map((memory, index) => (
              <Text key={index} style={detailStyles.memoryPoint}>
                • {memory}
              </Text>
            ))
          )}
        </View>
      </View>

      {/* Action History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏳ Aktionshistorie</Text>
        <View style={detailStyles.actionHistory}>
          {/* FIXED: Added empty state */}
          {recent_actions.length === 0 ? (
            <View style={detailStyles.emptyHistory}>
              <Text style={detailStyles.emptyHistoryText}>
                Noch keine Aktionen aufgezeichnet
              </Text>
            </View>
          ) : (
            recent_actions.map(action => (
              <ActionRow key={action.id} action={action} />
            ))
          )}
        </View>
      </View>

      <View style={styles.widgetWrapper}>
        <DocumentList workspaceId={workspaceId} contactId={lead.id} />
        <VoiceNotesSection workspaceId={workspaceId} contactId={lead.id} />
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#607D8B',
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  headerContainer: {
    marginVertical: 10,
  },
  backButtonHeader: {
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 5,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  stageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#039BE5',
    textTransform: 'capitalize',
  },
  discBadge: {
    color: '#fff',
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#607D8B',
    marginBottom: 10,
  },
  nextStepDue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 5,
  },
  nextStepSuggestion: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
  },
  contactButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  activityTime: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  activityNote: {
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 5,
    color: '#333',
    borderLeftWidth: 3,
    borderLeftColor: '#F0F0F0',
    paddingLeft: 10,
  },
  memoryPoint: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 3,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  actionType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00BCD4',
  },
  actionDetail: {
    fontSize: 14,
    color: '#607D8B',
  },
  widgetWrapper: {
    marginBottom: 20,
  },
});

