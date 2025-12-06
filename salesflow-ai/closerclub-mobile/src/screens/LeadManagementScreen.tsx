/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CLOSERCLUB - LEAD MANAGEMENT SCREEN                                       ║
 * ║  Lead Verwaltung mit Filter und Sortierung                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

const { width } = Dimensions.get('window');

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost';
  priority: 'high' | 'medium' | 'low';
  score: number;
  lastContact?: string;
  estimatedValue?: number;
}

const STATUS_CONFIG = {
  new: { label: 'Neu', color: COLORS.info, bgColor: `${COLORS.info}20` },
  contacted: { label: 'Kontaktiert', color: COLORS.warning, bgColor: `${COLORS.warning}20` },
  qualified: { label: 'Qualifiziert', color: COLORS.success, bgColor: `${COLORS.success}20` },
  proposal_sent: { label: 'Angebot', color: '#8b5cf6', bgColor: '#8b5cf620' },
  won: { label: 'Gewonnen', color: COLORS.success, bgColor: `${COLORS.success}30` },
  lost: { label: 'Verloren', color: COLORS.error, bgColor: `${COLORS.error}20` },
};

const PRIORITY_CONFIG = {
  high: { label: 'Hoch', color: COLORS.hot },
  medium: { label: 'Mittel', color: COLORS.warm },
  low: { label: 'Niedrig', color: COLORS.cold },
};

export default function LeadManagementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: '1',
      name: 'Max Mustermann',
      company: 'TechCorp GmbH',
      email: 'max@techcorp.de',
      phone: '+49 123 456789',
      status: 'qualified',
      priority: 'high',
      score: 92,
      lastContact: '2024-12-04',
      estimatedValue: 15000,
    },
    {
      id: '2',
      name: 'Anna Schmidt',
      company: 'Digital Solutions AG',
      email: 'anna@digital.de',
      status: 'contacted',
      priority: 'medium',
      score: 78,
      lastContact: '2024-12-03',
      estimatedValue: 8500,
    },
    {
      id: '3',
      name: 'Peter Weber',
      company: 'Innovation Hub',
      email: 'peter@innovation.de',
      phone: '+49 987 654321',
      status: 'new',
      priority: 'high',
      score: 85,
      estimatedValue: 12000,
    },
    {
      id: '4',
      name: 'Sarah Klein',
      company: 'StartUp Factory',
      email: 'sarah@startup.de',
      status: 'proposal_sent',
      priority: 'high',
      score: 88,
      lastContact: '2024-12-02',
      estimatedValue: 20000,
    },
  ]);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      // TODO: API Call implementieren
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('Fehler beim Laden der Leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeads();
    setRefreshing(false);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !filterStatus || lead.status === filterStatus;
    const matchesPriority = !filterPriority || lead.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getScoreColor = (score: number) => {
    if (score >= 85) return COLORS.hot;
    if (score >= 70) return COLORS.warm;
    return COLORS.cold;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const LeadCard = ({ lead }: { lead: Lead }) => {
    const statusConfig = STATUS_CONFIG[lead.status];
    const priorityConfig = PRIORITY_CONFIG[lead.priority];

    return (
      <TouchableOpacity 
        style={styles.leadCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('LeadDetail', { lead })}
      >
        <View style={styles.leadHeader}>
          <View style={styles.leadInfo}>
            <Text style={styles.leadName}>{lead.name}</Text>
            <Text style={styles.leadCompany}>{lead.company}</Text>
          </View>
          <View style={[styles.scoreBadge, { borderColor: getScoreColor(lead.score) }]}>
            <Text style={[styles.scoreText, { color: getScoreColor(lead.score) }]}>
              {lead.score}
            </Text>
          </View>
        </View>

        <View style={styles.leadContact}>
          <Text style={styles.leadContactItem}>📧 {lead.email}</Text>
          {lead.phone && (
            <Text style={styles.leadContactItem}>📱 {lead.phone}</Text>
          )}
        </View>

        <View style={styles.leadMeta}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <View style={styles.priorityIndicator}>
            <View style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]} />
            <Text style={styles.priorityText}>{priorityConfig.label}</Text>
          </View>
        </View>

        <View style={styles.leadFooter}>
          <View style={styles.leadFooterItem}>
            <Text style={styles.leadFooterLabel}>Letzter Kontakt</Text>
            <Text style={styles.leadFooterValue}>{formatDate(lead.lastContact)}</Text>
          </View>
          <View style={[styles.leadFooterItem, { alignItems: 'flex-end' }]}>
            <Text style={styles.leadFooterLabel}>Potenzial</Text>
            <Text style={styles.leadFooterValue}>{formatCurrency(lead.estimatedValue)}</Text>
          </View>
        </View>

        <View style={styles.leadActions}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]}>
            <Text style={styles.actionBtnTextSecondary}>📞 Anrufen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionBtnGradient}
            >
              <Text style={styles.actionBtnTextPrimary}>✉️ Nachricht</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Lade Leads...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lead Management</Text>
        <Text style={styles.headerSubtitle}>
          {filteredLeads.length} {filteredLeads.length === 1 ? 'Lead' : 'Leads'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Suche nach Name, Firma oder E-Mail..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, !filterStatus && !filterPriority && styles.filterChipActive]}
          onPress={() => {
            setFilterStatus(null);
            setFilterPriority(null);
          }}
        >
          <Text style={[styles.filterChipText, !filterStatus && !filterPriority && styles.filterChipTextActive]}>
            Alle
          </Text>
        </TouchableOpacity>
        
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, filterStatus === key && styles.filterChipActive]}
            onPress={() => setFilterStatus(filterStatus === key ? null : key)}
          >
            <Text style={[styles.filterChipText, filterStatus === key && styles.filterChipTextActive]}>
              {config.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredLeads.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Keine Leads gefunden</Text>
            <Text style={styles.emptyText}>
              {searchQuery || filterStatus || filterPriority
                ? 'Versuche einen anderen Filter'
                : 'Füge deinen ersten Lead hinzu'}
            </Text>
          </View>
        ) : (
          filteredLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  filtersContainer: {
    marginBottom: SPACING.md,
  },
  filtersContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  leadCard: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  leadCompany: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  scoreText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
  },
  leadContact: {
    marginBottom: SPACING.md,
  },
  leadContactItem: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  leadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  priorityText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  leadFooterItem: {
    flex: 1,
  },
  leadFooterLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs / 2,
  },
  leadFooterValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '600',
  },
  leadActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  actionBtnSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    ...SHADOWS.sm,
  },
  actionBtnGradient: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  actionBtnTextSecondary: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '600',
  },
  actionBtnTextPrimary: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 32,
    color: COLORS.text,
    fontWeight: '300',
  },
});

