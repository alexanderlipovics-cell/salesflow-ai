/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  Contact Timeline Screen                                                     ║
 * ║  Chronologische Timeline aller Interaktionen mit einem Kontakt             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_CONFIG } from '../services/apiConfig';
import { QuickLogButtons } from '../components/contacts/QuickLogButtons';

interface ConversationEntry {
  id: string;
  type: string;
  channel: string;
  direction: string;
  subject?: string;
  content: string;
  timestamp: string;
  metadata: Record<string, any>;
}

interface TimelineResponse {
  contact_id: string;
  entries: ConversationEntry[];
  total: number;
  channels: string[];
}

const getApiUrl = (contactId: string) =>
  `${API_CONFIG.baseUrl.replace('/api/v1', '')}/api/v2/contacts/${contactId}/timeline`;

const getTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    email_sent: '📧',
    email_received: '📧',
    whatsapp_sent: '💬',
    whatsapp_received: '💬',
    sms_sent: '📱',
    sms_received: '📱',
    call: '📞',
    note: '📝',
    meeting: '🤝',
    linkedin_message: '💼',
  };
  return icons[type] || '📝';
};

const getChannelLabel = (channel: string): string => {
  const labels: Record<string, string> = {
    email: '📧 Email',
    whatsapp: '💬 WhatsApp',
    sms: '📱 SMS',
    linkedin: '💼 LinkedIn',
    phone: '📞 Telefon',
    in_person: '🤝 Persönlich',
  };
  return labels[channel] || channel;
};

const getDirectionColor = (direction: string): string => {
  return direction === 'outbound' ? '#3B82F6' : '#10B981';
};

export default function ContactTimelineScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { contactId, contactName } = route.params || {};
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const loadTimeline = useCallback(async (channel?: string | null) => {
    if (!contactId) return;

    try {
      const url = channel
        ? `${getApiUrl(contactId)}?channel=${channel}`
        : getApiUrl(contactId);

      const response = await fetch(url, {
        headers: {
          ...(user?.access_token && { Authorization: `Bearer ${user.access_token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TimelineResponse = await response.json();
      setTimeline(data);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [contactId, user]);

  useEffect(() => {
    loadTimeline(selectedChannel);
  }, [loadTimeline, selectedChannel]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTimeline(selectedChannel);
  };

  const handleLogged = () => {
    loadTimeline(selectedChannel);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Lade Timeline...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Timeline</Text>
          {contactName && (
            <Text style={styles.headerSubtitle}>{contactName}</Text>
          )}
        </View>
      </View>

      {/* Channel Filter */}
      {timeline && timeline.channels.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          <Pressable
            style={[
              styles.filterButton,
              selectedChannel === null && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedChannel(null)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedChannel === null && styles.filterButtonTextActive,
              ]}
            >
              Alle
            </Text>
          </Pressable>
          {timeline.channels.map((channel) => (
            <Pressable
              key={channel}
              style={[
                styles.filterButton,
                selectedChannel === channel && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedChannel(channel)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedChannel === channel && styles.filterButtonTextActive,
                ]}
              >
                {getChannelLabel(channel)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Timeline */}
      <ScrollView
        style={styles.timelineContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {timeline && timeline.entries.length > 0 ? (
          timeline.entries.map((entry, index) => {
            const entryDate = new Date(entry.timestamp);
            const prevEntry = index > 0 ? timeline.entries[index - 1] : null;
            const prevDate = prevEntry ? new Date(prevEntry.timestamp) : null;
            const showDateSeparator =
              !prevDate ||
              format(entryDate, 'yyyy-MM-dd') !== format(prevDate, 'yyyy-MM-dd');

            return (
              <View key={entry.id}>
                {showDateSeparator && (
                  <View style={styles.dateSeparator}>
                    <View style={styles.dateLine} />
                    <Text style={styles.dateText}>
                      {format(entryDate, 'EEEE, d. MMMM yyyy', { locale: de })}
                    </Text>
                    <View style={styles.dateLine} />
                  </View>
                )}

                <View style={styles.entryContainer}>
                  <View
                    style={[
                      styles.entryIcon,
                      { backgroundColor: getDirectionColor(entry.direction) + '20' },
                    ]}
                  >
                    <Text style={styles.entryIconText}>
                      {getTypeIcon(entry.type)}
                    </Text>
                  </View>

                  <View style={styles.entryContent}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryType}>
                        {getChannelLabel(entry.channel)}
                        {entry.direction === 'outbound' ? ' →' : ' ←'}
                      </Text>
                      <Text style={styles.entryTime}>
                        {formatDistanceToNow(entryDate, {
                          addSuffix: true,
                          locale: de,
                        })}
                      </Text>
                    </View>

                    {entry.subject && (
                      <Text style={styles.entrySubject}>{entry.subject}</Text>
                    )}

                    <Text style={styles.entryText}>{entry.content}</Text>

                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <View style={styles.metadataContainer}>
                        {entry.metadata.opened && (
                          <View style={styles.metadataBadge}>
                            <Ionicons name="mail-open" size={12} color="#10B981" />
                            <Text style={styles.metadataText}>Geöffnet</Text>
                          </View>
                        )}
                        {entry.metadata.clicked && (
                          <View style={styles.metadataBadge}>
                            <Ionicons name="link" size={12} color="#3B82F6" />
                            <Text style={styles.metadataText}>Geklickt</Text>
                          </View>
                        )}
                        {entry.metadata.duration_minutes && (
                          <View style={styles.metadataBadge}>
                            <Ionicons name="time" size={12} color="#F59E0B" />
                            <Text style={styles.metadataText}>
                              {entry.metadata.duration_minutes} Min
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Noch keine Interaktionen</Text>
            <Text style={styles.emptySubtext}>
              Nutze die Buttons unten, um Interaktionen zu loggen
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Log Buttons */}
      {contactId && (
        <View style={styles.quickLogContainer}>
          <QuickLogButtons contactId={contactId} onLogged={handleLogged} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  timelineContainer: {
    flex: 1,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dateText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  entryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryIconText: {
    fontSize: 20,
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  entryTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  entrySubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  entryText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  metadataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  metadataText: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  quickLogContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});

