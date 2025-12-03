// screens/SpeedHunterScreen.tsx

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { startSpeedHunterSession, fetchNextLead, logSpeedHunterAction, NextLead, UserStats, DISC } from '../../api/mockApi';
import { useSalesFlow } from '../../context/SalesFlowContext';

type SpeedHunterState = {
  sessionId: string;
  dailyGoal: number;
  mode: 'points' | 'contacts';
  streakDay: number;
  currentLead: NextLead;
  totalContacts: number;
  totalPoints: number;
};

// DISC Color Helper
const getDiscColor = (disc: DISC | undefined): string => {
  switch (disc) {
    case 'D': return '#F44336'; // Dominant (Red)
    case 'I': return '#FFC107'; // Initiative (Yellow/Orange)
    case 'S': return '#4CAF50'; // Steady (Green)
    case 'C': return '#2196F3'; // Conscientious (Blue)
    default: return '#757575';
  }
};

// Format Last Contact Date
const formatLastContact = (isoString: string): string => {
  if (!isoString) return 'Nie kontaktiert';
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return date.toLocaleDateString('de-DE', options);
};

// Capitalize Stage Text
const capitalizeStage = (stage: string): string => {
  return stage.replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function SpeedHunterScreen() {
  const { todayData, updateUserStats } = useSalesFlow();
  const [session, setSession] = useState<SpeedHunterState | null>(null);
  const [loading, setLoading] = useState(false);

  // Stats aus dem globalen Context oder Default
  const currentStats = todayData?.user_stats || {
    today_contacts_done: 0,
    today_points_done: 0,
    today_contacts_target: 20,
    today_points_target: 40,
    streak_day: 0
  } as UserStats;

  const startSession = async () => {
    try {
      setLoading(true);
      const response = await startSpeedHunterSession(20, 'points');
      setSession({
        sessionId: response.session_id,
        dailyGoal: response.daily_goal,
        mode: response.mode,
        streakDay: response.streak_day,
        currentLead: response.next_lead,
        totalContacts: 0,
        totalPoints: 0,
      });
    } catch (error) {
      Alert.alert('Fehler', 'Session konnte nicht gestartet werden.');
    } finally {
      setLoading(false);
    }
  };

  const loadNextLead = useCallback(async (sessionId: string) => {
    try {
      const nextLead = await fetchNextLead(sessionId);
      setSession(prev => prev ? ({
        ...prev,
        currentLead: nextLead,
      }) : null);
    } catch (error) {
      Alert.alert('Fertig', 'Keine weiteren Leads.');
      setSession(null);
    }
  }, []);

  const handleAction = async (outcome: string, channel?: 'whatsapp' | 'call') => {
    if (!session) return;

    try {
      setLoading(true);
      const response = await logSpeedHunterAction(
        session.sessionId,
        session.currentLead.lead_id,
        channel || 'message',
        outcome
      );
      
      // Update stats in context
      updateUserStats({
        ...currentStats,
        today_contacts_done: response.new_totals.total_contacts,
        today_points_done: response.new_totals.total_points,
      });
      
      // Update local session
      setSession(prev => prev ? {
        ...prev,
        totalContacts: response.new_totals.total_contacts,
        totalPoints: response.new_totals.total_points,
      } : null);

      await loadNextLead(session.sessionId);

    } catch (error) {
      Alert.alert('Fehler', 'Aktion konnte nicht gespeichert werden.');
    } finally {
      setLoading(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>Lade...</Text>
      </View>
    );
  }

  // Pre-Session State (Start Screen)
  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Bereit für den Sprint?</Text>
        <Text style={styles.goalText}>
          Dein Ziel: {currentStats.today_contacts_target} Kontakte / {currentStats.today_points_target} Punkte
        </Text>
        <TouchableOpacity style={styles.startButton} onPress={startSession}>
          <Text style={styles.startButtonText}>🚀 Speed Hunter Session starten</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Active Session (Main UI)
  const lead = session.currentLead;
  const discColor = getDiscColor(lead.disc_primary);

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          {currentStats.today_contacts_done}/{currentStats.today_contacts_target} Kontakte • {currentStats.today_points_done} Punkte
        </Text>
      </View>

      {/* Lead Card */}
      <View style={styles.leadCard}>
        {/* DISC Badge */}
        {lead.disc_primary && (
          <View style={[styles.discBadge, { backgroundColor: discColor }]}>
            <Text style={styles.discText}>{lead.disc_primary}</Text>
          </View>
        )}

        <Text style={styles.leadName}>{lead.name}</Text>
        <Text style={styles.leadStage}>{capitalizeStage(lead.stage)}</Text>
        
        <View style={styles.separator} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Unternehmen:</Text>
          <Text style={styles.detailValue}>
            {lead.company_id.split('-')[1]?.toUpperCase() || lead.company_id}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Zuletzt:</Text>
          <Text style={styles.detailValue}>{formatLastContact(lead.last_contact_at)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonContainer}>
        {/* Primary: Contact Buttons */}
        <View style={styles.contactButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.whatsappButton]} 
            onPress={() => {
              Alert.alert('WhatsApp', `Starte Chat mit ${lead.name}`, [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Kontaktieren', onPress: () => handleAction('message_sent', 'whatsapp') }
              ]);
            }}
          >
            <Text style={styles.actionButtonText}>📞 WHATSAPP</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.callButton]} 
            onPress={() => {
              Alert.alert('Call', `Starte Anruf mit ${lead.name}`, [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Anrufen', onPress: () => handleAction('message_sent', 'call') }
              ]);
            }}
          >
            <Text style={styles.actionButtonText}>☎️ CALL</Text>
          </TouchableOpacity>
        </View>

        {/* Secondary: Outcome Buttons */}
        <View style={styles.outcomeButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.snoozeButton]} 
            onPress={() => handleAction('snooze')}
          >
            <Text style={styles.outcomeButtonText}>Später</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.doneButton]} 
            onPress={() => handleAction('done')}
          >
            <Text style={styles.outcomeButtonText}>ERLEDIGT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
    justifyContent: 'space-between',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#607D8B',
  },
  infoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  goalText: {
    fontSize: 16,
    color: '#607D8B',
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressHeader: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9800',
  },
  leadCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  discBadge: {
    position: 'absolute',
    top: -15,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    borderWidth: 3,
    borderColor: '#fff',
  },
  discText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  leadName: {
    fontSize: 38,
    fontWeight: '900',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  leadStage: {
    fontSize: 20,
    color: '#757575',
    marginBottom: 20,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    width: '80%',
    backgroundColor: '#F0F0F0',
    marginVertical: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#607D8B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtonContainer: {
    marginTop: 30,
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 5,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    flex: 1,
    marginRight: 5,
  },
  callButton: {
    backgroundColor: '#03A9F4',
    flex: 1,
    marginLeft: 5,
  },
  outcomeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  snoozeButton: {
    backgroundColor: '#FFCC80',
    flex: 1,
    marginRight: 5,
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginLeft: 5,
  },
  outcomeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
