import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';

interface InboxItem {
  id: string;
  type: 'followup' | 'message' | 'task' | 'reminder';
  title: string;
  description: string;
  contact_name: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'snoozed';
}

const TYPE_CONFIG = {
  followup: { icon: '📞', label: 'Follow-up', color: '#3B82F6' },
  message: { icon: '💬', label: 'Nachricht', color: '#8B5CF6' },
  task: { icon: '✅', label: 'Aufgabe', color: '#10B981' },
  reminder: { icon: '🔔', label: 'Erinnerung', color: '#F59E0B' },
};

const PRIORITY_CONFIG = {
  high: { label: 'Hoch', color: '#EF4444' },
  medium: { label: 'Mittel', color: '#F59E0B' },
  low: { label: 'Niedrig', color: '#10B981' },
};

export default function InboxScreen() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    try {
      // Lade Follow-ups als Inbox Items
      const response = await api.getTodayFollowups();
      const followups = response.followups || response || [];
      
      // Konvertiere Follow-ups zu Inbox Items
      const inboxItems: InboxItem[] = Array.isArray(followups) 
        ? followups.map((f: any) => ({
            id: f.id,
            type: 'followup' as const,
            title: f.title || 'Follow-up',
            description: f.notes || f.description || '',
            contact_name: f.contact_name || f.lead_name || 'Unbekannt',
            due_date: f.due_date || f.scheduled_at,
            priority: f.priority || 'medium',
            status: f.status === 'completed' ? 'completed' : 'pending',
          }))
        : [];
      
      setItems(inboxItems);
    } catch (error) {
      console.log('Error loading inbox:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInbox();
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const markAsComplete = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'completed' as const } : item
    ));
  };

  const renderItem = ({ item }: { item: InboxItem }) => {
    const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.task;
    const priorityConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;

    return (
      <TouchableOpacity 
        style={[styles.itemCard, item.status === 'completed' && styles.itemCompleted]}
        onPress={() => markAsComplete(item.id)}
      >
        <View style={styles.itemHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '20' }]}>
            <Text style={styles.typeIconText}>{typeConfig.icon}</Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, item.status === 'completed' && styles.textCompleted]}>
              {item.contact_name}
            </Text>
            <Text style={styles.itemType}>{typeConfig.label}</Text>
          </View>
          <View style={styles.itemMeta}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color + '20' }]}>
              <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                {priorityConfig.label}
              </Text>
            </View>
            <Text style={styles.itemTime}>{formatTime(item.due_date)}</Text>
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.itemActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>📞 Anrufen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>💬 WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>⏰ Später</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  const pendingCount = items.filter(i => i.status === 'pending').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.subtitle}>{pendingCount} ausstehend</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {(['pending', 'completed', 'all'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'pending' ? 'Offen' : f === 'completed' ? 'Erledigt' : 'Alle'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06B6D4" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📥</Text>
            <Text style={styles.emptyTitle}>Inbox leer!</Text>
            <Text style={styles.emptyText}>
              {filter === 'pending' 
                ? 'Keine ausstehenden Aufgaben. Gut gemacht! 🎉' 
                : 'Keine Einträge gefunden.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1419',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A202C',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterTabActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  filterText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#000000',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: '#1A202C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  itemCompleted: {
    opacity: 0.6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeIconText: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  itemType: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  itemMeta: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  itemDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: 20,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});

