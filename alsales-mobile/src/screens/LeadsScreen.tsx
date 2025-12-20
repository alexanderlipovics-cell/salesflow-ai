import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { api } from '../services/api';
import LeadDetailScreen from './LeadDetailScreen';
import NewLeadModal from './NewLeadModal';

const { width } = Dimensions.get('window');

const getPriorityLabel = (lead: any): { icon: string; label: string; color: string } | null => {
  const now = new Date();
  const lastContact = lead.last_contacted ? new Date(lead.last_contacted) : null;
  const daysSinceContact = lastContact ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const status = (lead.status || 'new').toLowerCase();
  const temp = (lead.temperature || 'cold').toLowerCase();
  
  if (temp === 'hot' && status === 'contacted') {
    return { icon: '🔥', label: 'Antwort erwartet!', color: '#EF4444' };
  }
  if (status === 'contacted' && daysSinceContact >= 2 && daysSinceContact <= 7) {
    return { icon: '⏰', label: `Follow-up fällig (${daysSinceContact}d)`, color: '#F59E0B' };
  }
  if (status === 'new') {
    return { icon: '🆕', label: 'Erstkontakt nötig', color: '#3B82F6' };
  }
  if (daysSinceContact > 7 && status === 'contacted') {
    return { icon: '💀', label: 'Wiederbeleben', color: '#8B5CF6' };
  }
  return null;
};

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
  platform: string;
  created_at: string;
  next_follow_up: string | null;
  last_contacted?: string | null;
}

const STATUS_OPTIONS = [
  { key: 'all', label: 'Alle' },
  { key: 'new', label: 'Neu' },
  { key: 'contacted', label: 'Aktiv' },
  { key: 'qualified', label: 'Qualifiziert' },
  { key: 'won', label: 'Kunden' },
  { key: 'lost', label: 'Verloren' },
];

const getScoreColor = (score: number): string => {
  if (score >= 70) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
};

const getAIRecommendation = (lead: Lead): string => {
  if (lead.temperature === 'hot') return 'Sofort anrufen - hohe Kaufbereitschaft';
  if (lead.instagram && !lead.phone) return 'Instagram DM senden';
  if (lead.phone && lead.status === 'new') return 'Erstkontakt per WhatsApp';
  if (lead.status === 'contacted') return 'Follow-up in 2 Tagen planen';
  return 'LinkedIn Vernetzung empfohlen';
};

const SwipeableLeadCard = ({ 
  item, 
  onPress, 
  onSwipeLeft, 
  onSwipeRight 
}: { 
  item: Lead; 
  onPress: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const score = item.bant_score || 30;
  const scoreColor = getScoreColor(score);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => 
        Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          Animated.spring(translateX, { toValue: -width, useNativeDriver: true }).start();
          setTimeout(onSwipeLeft, 200);
        } else if (gestureState.dx > 100) {
          Animated.spring(translateX, { toValue: width, useNativeDriver: true }).start();
          setTimeout(onSwipeRight, 200);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.cardWrapper}>
      {/* Background Actions */}
      <View style={styles.swipeActions}>
        <View style={[styles.swipeAction, styles.swipeActionLeft]}>
          <Text style={styles.swipeActionText}>📞 Anrufen</Text>
        </View>
        <View style={[styles.swipeAction, styles.swipeActionRight]}>
          <Text style={styles.swipeActionText}>❌ Verloren</Text>
        </View>
      </View>

      {/* Card */}
      <Animated.View 
        style={[styles.leadCard, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
          {/* Header mit Avatar + Score Ring */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarWrapper}>
              {/* Score Ring */}
              <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
                <View style={[styles.scoreRingInner, { shadowColor: scoreColor }]}>
                  <Text style={[styles.avatarText, { color: scoreColor }]}>
                    {(item.name?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
              </View>
              {/* Score Badge */}
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                <Text style={styles.scoreText}>{score}</Text>
              </View>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.leadName} numberOfLines={1}>{item.name || 'Unbekannt'}</Text>
              {item.company && (
                <Text style={styles.leadCompany} numberOfLines={1}>{item.company}</Text>
              )}
              <View style={styles.platformRow}>
                <Text style={styles.platformIcon}>
                  {item.platform === 'Instagram' ? '📷' : 
                   item.platform === 'WhatsApp' ? '💬' : 
                   item.platform === 'LinkedIn' ? '💼' : '🌐'}
                </Text>
                <Text style={styles.platformText}>{item.platform || 'Web'}</Text>
              </View>
            </View>

            {/* Status Badge */}
            <View style={[
              styles.statusBadge, 
              item.temperature === 'hot' && styles.statusBadgeHot,
              item.temperature === 'warm' && styles.statusBadgeWarm,
              item.temperature === 'cold' && styles.statusBadgeCold,
            ]}>
              <Text style={styles.statusEmoji}>
                {item.temperature === 'hot' ? '🔥' : 
                 item.temperature === 'warm' ? '☀️' : '❄️'}
              </Text>
            </View>
          </View>

          {/* Priority Label */}
          {(() => {
            const priority = getPriorityLabel(item);
            if (!priority) return null;
            return (
              <View style={[styles.aiRecommendation, { borderColor: priority.color + '40' }]}>
                <Text style={styles.aiRecommendationIcon}>{priority.icon}</Text>
                <Text style={[styles.aiRecommendationText, { color: priority.color }]}>
                  {priority.label}
                </Text>
              </View>
            );
          })()}

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            {item.phone && (
              <View style={styles.statChip}>
                <Text style={styles.statIcon}>📱</Text>
                <Text style={styles.statText}>Telefon</Text>
              </View>
            )}
            {item.email && (
              <View style={styles.statChip}>
                <Text style={styles.statIcon}>📧</Text>
                <Text style={styles.statText}>Email</Text>
              </View>
            )}
            {item.instagram && (
              <View style={styles.statChip}>
                <Text style={styles.statIcon}>📷</Text>
                <Text style={styles.statText}>@{item.instagram.slice(0, 8)}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, selectedStatus, searchQuery]);

  const loadLeads = async () => {
    try {
      const response = await api.getLeads();
      setLeads(Array.isArray(response) ? response : []);
    } catch (error) {
      console.log('Error loading leads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeads();
  };

  const filterLeads = () => {
    let result = [...leads];
    
    // Apply status filter if not "all"
    if (selectedStatus !== 'all') {
      result = result.filter(lead => {
        const status = (lead.status || '').toLowerCase();
        if (selectedStatus === 'kunden') return status === 'won' || status === 'customer';
        if (selectedStatus === 'verloren') return status === 'lost';
        return status === selectedStatus;
      });
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(lead =>
        (lead.name?.toLowerCase() || '').includes(query) ||
        (lead.email?.toLowerCase() || '').includes(query) ||
        (lead.company?.toLowerCase() || '').includes(query) ||
        (lead.instagram?.toLowerCase() || '').includes(query)
      );
    }
    
    // SMART PRIORITY SORTING
    result.sort((a, b) => {
      const getPriority = (lead: any): number => {
        const now = new Date();
        const lastContact = lead.last_contacted ? new Date(lead.last_contacted) : null;
        const daysSinceContact = lastContact ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        const status = (lead.status || 'new').toLowerCase();
        const temp = (lead.temperature || 'cold').toLowerCase();
        
        // 1. 🔥 HOT ACTION - Responded leads (need immediate action)
        if (temp === 'hot' && status === 'contacted') return 1;
        
        // 2. ⏰ DUE FOLLOW-UPS - Contacted 2-5 days ago, no response
        if (status === 'contacted' && daysSinceContact >= 2 && daysSinceContact <= 7) return 2;
        
        // 3. 🆕 NEW LEADS - Never contacted
        if (status === 'new') return 3;
        
        // 4. 🔥 HOT but not yet contacted
        if (temp === 'hot') return 4;
        
        // 5. ☀️ WARM leads
        if (temp === 'warm') return 5;
        
        // 6. ❄️ NURTURE - Old leads to re-engage (contacted > 7 days ago)
        if (daysSinceContact > 7) return 6;
        
        // 7. Recently contacted (waiting for response)
        if (status === 'contacted' && daysSinceContact < 2) return 7;
        
        // 8. Everything else
        return 8;
      };
      
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // Within same priority: sort by temperature (hot first), then by date
      const tempOrder: Record<string, number> = { hot: 1, warm: 2, cold: 3 };
      const tempA = tempOrder[(a.temperature || 'cold').toLowerCase()] || 3;
      const tempB = tempOrder[(b.temperature || 'cold').toLowerCase()] || 3;
      
      if (tempA !== tempB) return tempA - tempB;
      
      // Finally by created date (newest first)
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    
    setFilteredLeads(result);
  };

  const handleSwipeLeft = (lead: Lead) => {
    setLeads(prev => prev.map(l =>
      l.id === lead.id ? { ...l, status: 'lost' } : l
    ));
  };

  const handleSwipeRight = (lead: Lead) => {
    // Anrufen Action
    console.log('Call:', lead.phone);
  };

  if (selectedLeadId) {
    const currentIndex = filteredLeads.findIndex(l => l.id === selectedLeadId);
    const nextLead = filteredLeads[currentIndex + 1];
    
    return (
      <LeadDetailScreen 
        leadId={selectedLeadId} 
        onBack={() => {
          setSelectedLeadId(null);
          loadLeads();
        }}
        onNextLead={nextLead ? () => {
          setSelectedLeadId(nextLead.id);
        } : undefined}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Glassmorphism Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Leads</Text>
            <Text style={styles.subtitle}>{filteredLeads.length} Kontakte im Radar</Text>
          </View>
          <TouchableOpacity style={styles.newButton} onPress={() => setShowNewLeadModal(true)}>
            <Text style={styles.newButtonIcon}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Glass Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Lead suchen..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {STATUS_OPTIONS.map((status) => (
            <TouchableOpacity
              key={status.key}
              style={[
                styles.filterPill,
                selectedStatus === status.key && styles.filterPillActive
              ]}
              onPress={() => setSelectedStatus(status.key)}
            >
              <Text style={[
                styles.filterPillText,
                selectedStatus === status.key && styles.filterPillTextActive
              ]}>
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Swipe Hint */}
      <View style={styles.swipeHint}>
        <Text style={styles.swipeHintText}>← Swipe: Verloren | Anrufen →</Text>
      </View>

      {/* Lead Cards */}
      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SwipeableLeadCard
            item={item}
            onPress={() => setSelectedLeadId(item.id)}
            onSwipeLeft={() => handleSwipeLeft(item)}
            onSwipeRight={() => handleSwipeRight(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06B6D4" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>Keine Leads gefunden</Text>
            <Text style={styles.emptyText}>Dein Jagdrevier ist leer</Text>
          </View>
        }
      />

      {/* New Lead Modal */}
      <NewLeadModal
        visible={showNewLeadModal}
        onClose={() => setShowNewLeadModal(false)}
        onLeadCreated={() => {
          setShowNewLeadModal(false);
          loadLeads();
        }}
      />
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
  // Header
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  newButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  newButtonIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },
  clearIcon: {
    color: '#6B7280',
    fontSize: 16,
    padding: 4,
  },
  // Filters
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.4)',
    backgroundColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  filterPillText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  // Swipe Hint
  swipeHint: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
  },
  swipeHintText: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  // Cards
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  cardWrapper: {
    marginBottom: 14,
    position: 'relative',
  },
  swipeActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 20,
    overflow: 'hidden',
  },
  swipeAction: {
    width: '50%',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  swipeActionLeft: {
    backgroundColor: '#10B981',
    alignItems: 'flex-start',
  },
  swipeActionRight: {
    backgroundColor: '#EF4444',
    alignItems: 'flex-end',
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  leadCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.4)',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  scoreRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreRingInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  scoreBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#111827',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leadCompany: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  platformIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  platformText: {
    fontSize: 11,
    color: '#6B7280',
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  statusBadgeHot: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  statusBadgeWarm: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusBadgeCold: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  statusEmoji: {
    fontSize: 16,
  },
  // Priority Label / AI Recommendation
  aiRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  aiRecommendationIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  aiRecommendationText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  statText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
