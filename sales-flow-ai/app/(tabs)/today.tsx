// screens/TodayScreen.tsx (with FILTERS)

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { DueLead } from '../../api/mockApi';
import { ProgressCard } from '../../components/ProgressCard';
import { FilterBar } from '../../components/FilterBar';
import { useSalesFlow } from '../../context/SalesFlowContext';
import { applyFilters } from '../../utils/filterEngine';
import { filterManager } from '../../utils/filterManager';
import { FilterCriteria, FilterOperator } from '../../types/leads';
import { formatDueDate } from '../../utils/date';
import { Calendar as RNCalendar, DateObject } from 'react-native-calendars';
import { CalendarService } from '../../services/calendarService';

// Lead-Karten-Komponente
const LeadCard: React.FC<{ lead: DueLead }> = ({ lead }) => {
  const router = useRouter();
  const dueTime = formatDueDate(lead.next_contact_due_at);
  const priorityColor = lead.priority_score > 0.9 ? '#F44336' : (lead.priority_score > 0.8 ? '#FF9800' : '#2196F3');

  return (
    <TouchableOpacity 
      style={styles.leadCard} 
      onPress={() => router.push({ pathname: '/lead-detail', params: { leadId: lead.id } })}
    >
      <View style={styles.leadHeader}>
        <Text style={styles.leadName}>{lead.name}</Text>
        <Text style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
          {Math.round(lead.priority_score * 100)}%
        </Text>
      </View>
      <View style={styles.leadDetails}>
        <Text style={styles.leadDetailText}>{lead.company_name} • {lead.stage}</Text>
        <Text style={styles.leadDueText}>🗓️ {dueTime}</Text>
      </View>
      <Text style={styles.leadChannelText}>via {lead.channel}</Text>
    </TouchableOpacity>
  );
};

export default function TodayScreen() {
  const { todayData, loading, refetchToday, profileData } = useSalesFlow();
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({});
  const [filterOperator, setFilterOperator] = useState<FilterOperator>('AND');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const workspaceId = profileData?.workspace_id ?? 'demo-workspace';

  // Initialize filter manager
  useEffect(() => {
    filterManager.initialize();
    const state = filterManager.getFilterState();
    setFilterCriteria(state.active);
    setFilterOperator(state.operator);
  }, []);

  const updateSelectedEvents = (date: string | null, eventsList: any[]) => {
    if (!date) {
      setSelectedEvents([]);
      return;
    }
    const filtered = eventsList.filter(event => {
      const start = event.startDate ?? event.start_time;
      if (!start) return false;
      const eventDate = new Date(start).toISOString().split('T')[0];
      return eventDate === date;
    });
    setSelectedEvents(filtered);
  };

  const loadCalendarEvents = async () => {
    setCalendarLoading(true);
    try {
      const events = await CalendarService.getUpcomingEvents(30);
      setCalendarEvents(events);

      const marks = events.reduce<Record<string, any>>((acc, event) => {
        if (!event.startDate) return acc;
        const day = new Date(event.startDate).toISOString().split('T')[0];
        acc[day] = { marked: true, dotColor: '#f97316' };
        return acc;
      }, {});
      setMarkedDates(marks);
      updateSelectedEvents(selectedDate, events);
    } catch (error) {
      console.error('[Today] calendar load failed', error);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    const initCalendar = async () => {
      const granted = await CalendarService.requestPermissions();
      if (!granted) return;
      await loadCalendarEvents();
    };
    initCalendar();
  }, []);

  const handleDayPress = (day: DateObject) => {
    setSelectedDate(day.dateString);
    updateSelectedEvents(day.dateString, calendarEvents);
  };

  const handleSyncCalendar = async () => {
    setCalendarSyncing(true);
    try {
      await CalendarService.syncWithBackend(workspaceId);
      Alert.alert('Kalender', 'Geräte-Kalender wurde synchronisiert.');
      await loadCalendarEvents();
    } catch (error) {
      console.error('[Today] calendar sync failed', error);
      Alert.alert('Fehler', 'Kalender konnte nicht synchronisiert werden.');
    } finally {
      setCalendarSyncing(false);
    }
  };

  if (loading.today) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Lade Tagesübersicht...</Text>
      </View>
    );
  }

  if (!todayData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>⚠️ Keine Daten verfügbar.</Text>
        <TouchableOpacity onPress={refetchToday} style={styles.refetchButton}>
          <Text style={styles.refetchButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { user_stats, due_leads, squad_summary } = todayData;

  // Apply filters
  const filteredLeads = applyFilters(due_leads, filterCriteria, filterOperator);

  const handleFilterChange = (criteria: FilterCriteria, operator: FilterOperator) => {
    setFilterCriteria(criteria);
    setFilterOperator(operator);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Deine heutigen Ziele</Text>
      {/* Progress-Karten / Header */}
      <View style={styles.progressContainer}>
        <ProgressCard 
          title="Kontakte"
          value={user_stats.today_contacts_done}
          target={user_stats.today_contacts_target}
          progress={user_stats.today_contacts_done / user_stats.today_contacts_target}
        />
        <ProgressCard 
          title="Punkte"
          value={user_stats.today_points_done}
          target={user_stats.today_points_target}
          progress={user_stats.today_points_done / user_stats.today_points_target}
        />
      </View>

      <Text style={styles.streakText}>🔥 Tag {user_stats.streak_day} in Folge</Text>

      {/* Squad Summary (kleiner Balken / Karte) */}
      <View style={styles.squadSummaryCard}>
        <Text style={styles.squadTitle}>🏆 {squad_summary.challenge_title}</Text>
        <View style={styles.squadProgressContainer}>
          <Text style={styles.squadRank}>Rang: #{squad_summary.my_rank}</Text>
          <Text style={styles.squadPoints}>{squad_summary.my_points} Punkte</Text>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Text style={styles.cardTitle}>🗓️ Meetings & Termine</Text>
          <TouchableOpacity
            onPress={handleSyncCalendar}
            style={styles.syncButton}
            disabled={calendarSyncing}
          >
            <Text style={styles.syncButtonText}>
              {calendarSyncing ? 'Sync...' : 'Sync'}
            </Text>
          </TouchableOpacity>
        </View>
        <RNCalendar
          markedDates={{
            ...markedDates,
            ...(selectedDate
              ? {
                  [selectedDate]: {
                    ...(markedDates[selectedDate] || {}),
                    selected: true,
                    selectedColor: '#2563eb',
                  },
                }
              : {}),
          }}
          onDayPress={handleDayPress}
          theme={{
            selectedDayBackgroundColor: '#2563eb',
            todayTextColor: '#ef4444',
            arrowColor: '#2563eb',
          }}
        />
        <View style={styles.eventList}>
          {calendarLoading ? (
            <ActivityIndicator color="#2563eb" />
          ) : selectedDate ? (
            selectedEvents.length === 0 ? (
              <Text style={styles.emptyEventText}>
                Keine Termine für {selectedDate}
              </Text>
            ) : (
              selectedEvents.map(event => (
                <View key={event.id} style={styles.eventRow}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    {new Date(event.startDate ?? event.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))
            )
          ) : (
            <Text style={styles.emptyEventText}>
              Datum wählen, um Termine zu sehen.
            </Text>
          )}
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionHeader}>
          Fällige Kontakte ({filteredLeads.length} von {due_leads.length})
        </Text>
        <FilterBar onFilterChange={handleFilterChange} />
      </View>

      {/* Liste der gefilterten Leads */}
      {filteredLeads.length > 0 ? (
        filteredLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.noLeadsText}>
            Keine Leads mit den aktuellen Filtern gefunden.
          </Text>
          <Text style={styles.noLeadsSubtext}>
            Versuche andere Filter oder setze sie zurück.
          </Text>
        </View>
      )}

      <View style={{ height: 50 }} /> {/* Platzhalter am Ende */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 10,
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
  errorText: {
    fontSize: 18,
    color: '#F44336',
    fontWeight: 'bold',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 10,
    marginLeft: 5,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  streakText: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 10,
  },
  squadSummaryCard: {
    backgroundColor: '#E1F5FE',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  squadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#039BE5',
    marginBottom: 5,
  },
  squadProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  squadRank: {
    fontSize: 16,
    color: '#039BE5',
  },
  squadPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#039BE5',
  },
  calendarCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  syncButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  eventList: {
    marginTop: 10,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  eventTitle: {
    color: '#0f172a',
    fontWeight: '600',
  },
  eventTime: {
    color: '#475569',
  },
  emptyEventText: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    marginLeft: 5,
  },
  leadCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  priorityBadge: {
    color: '#fff',
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 15,
    fontSize: 12,
  },
  leadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  leadDetailText: {
    fontSize: 14,
    color: '#607D8B',
    fontStyle: 'italic',
  },
  leadDueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100', // Orange für Due Time
  },
  leadChannelText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 5,
  },
  noLeadsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#607D8B',
    fontWeight: '600',
  },
  noLeadsSubtext: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#9E9E9E',
  },
  refetchButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  refetchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 10,
  }
});

