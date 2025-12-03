/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - PHOENIX SCREEN                                                 ║
 * ║  Lead-Reaktivierung für verlorene/kalte Leads                             ║
 * ║  "Aus der Asche auferstehen" - Reaktiviere inaktive Kontakte              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AURA_COLORS, AURA_SHADOWS } from '../../components/aura';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhoenixLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  lastContact: string;
  daysSinceContact: number;
  previousStatus: string;
  lostReason?: string;
  reactivationScore: number; // 0-100
  suggestedApproach: string;
  bestTimeToContact: string;
  personalNote?: string;
}

interface ReactivationStats {
  totalColdLeads: number;
  highPotential: number;
  reactivatedThisMonth: number;
  successRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA (Replace with API calls)
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_PHOENIX_LEADS: PhoenixLead[] = [
  {
    id: '1',
    name: 'Anna Schmidt',
    email: 'anna@example.com',
    phone: '+49 170 1234567',
    lastContact: '2024-09-15',
    daysSinceContact: 78,
    previousStatus: 'proposal_sent',
    lostReason: 'Keine Antwort nach Angebot',
    reactivationScore: 85,
    suggestedApproach: 'value_reminder',
    bestTimeToContact: 'Abends (18-20 Uhr)',
    personalNote: 'War sehr interessiert an Produkt X',
  },
  {
    id: '2',
    name: 'Max Müller',
    email: 'max@example.com',
    lastContact: '2024-08-20',
    daysSinceContact: 104,
    previousStatus: 'qualified',
    lostReason: 'Kein Budget zu dem Zeitpunkt',
    reactivationScore: 72,
    suggestedApproach: 'new_offer',
    bestTimeToContact: 'Mittags (12-14 Uhr)',
  },
  {
    id: '3',
    name: 'Lisa Weber',
    phone: '+49 171 9876543',
    lastContact: '2024-07-10',
    daysSinceContact: 145,
    previousStatus: 'contacted',
    lostReason: 'Wollte Zeit zum Nachdenken',
    reactivationScore: 58,
    suggestedApproach: 'gentle_checkin',
    bestTimeToContact: 'Morgens (9-11 Uhr)',
  },
  {
    id: '4',
    name: 'Thomas Braun',
    email: 'thomas.b@example.com',
    phone: '+49 172 5555555',
    lastContact: '2024-10-01',
    daysSinceContact: 62,
    previousStatus: 'proposal_sent',
    lostReason: 'Partner musste zustimmen',
    reactivationScore: 91,
    suggestedApproach: 'direct_question',
    bestTimeToContact: 'Nachmittags (15-17 Uhr)',
    personalNote: 'Partner war dagegen, aber er war überzeugt',
  },
];

const MOCK_STATS: ReactivationStats = {
  totalColdLeads: 47,
  highPotential: 12,
  reactivatedThisMonth: 5,
  successRate: 23,
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

const getApproachLabel = (approach: string): { label: string; emoji: string } => {
  const approaches: Record<string, { label: string; emoji: string }> = {
    value_reminder: { label: 'Wert erinnern', emoji: '💎' },
    new_offer: { label: 'Neues Angebot', emoji: '🎁' },
    gentle_checkin: { label: 'Sanfter Check-in', emoji: '👋' },
    direct_question: { label: 'Direkte Frage', emoji: '🎯' },
    social_proof: { label: 'Social Proof', emoji: '⭐' },
    event_trigger: { label: 'Event/Anlass', emoji: '📅' },
  };
  return approaches[approach] || { label: 'Standard', emoji: '📧' };
};

const formatDaysAgo = (days: number): string => {
  if (days < 30) return `vor ${days} Tagen`;
  if (days < 60) return 'vor ca. 1 Monat';
  if (days < 90) return 'vor ca. 2 Monaten';
  if (days < 180) return 'vor ca. 3-6 Monaten';
  return 'vor über 6 Monaten';
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const StatCard: React.FC<{ label: string; value: string | number; emoji: string; color?: string }> = ({
  label,
  value,
  emoji,
  color,
}) => (
  <View style={styles.statCard}>
    <Text style={styles.statEmoji}>{emoji}</Text>
    <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const PhoenixLeadCard: React.FC<{
  lead: PhoenixLead;
  onReactivate: (lead: PhoenixLead) => void;
  onGenerateMessage: (lead: PhoenixLead) => void;
}> = ({ lead, onReactivate, onGenerateMessage }) => {
  const approach = getApproachLabel(lead.suggestedApproach);
  const scoreColor = getScoreColor(lead.reactivationScore);
  
  return (
    <View style={styles.leadCard}>
      {/* Header */}
      <View style={styles.leadHeader}>
        <View style={styles.leadInfo}>
          <Text style={styles.leadName}>{lead.name}</Text>
          <Text style={styles.lastContact}>
            {formatDaysAgo(lead.daysSinceContact)}
          </Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {lead.reactivationScore}%
          </Text>
          <Text style={styles.scoreLabel}>Potenzial</Text>
        </View>
      </View>
      
      {/* Lost Reason */}
      {lead.lostReason && (
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>❌ Grund für Inaktivität:</Text>
          <Text style={styles.reasonText}>{lead.lostReason}</Text>
        </View>
      )}
      
      {/* Suggested Approach */}
      <View style={styles.approachContainer}>
        <View style={styles.approachBadge}>
          <Text style={styles.approachEmoji}>{approach.emoji}</Text>
          <Text style={styles.approachText}>{approach.label}</Text>
        </View>
        <Text style={styles.bestTime}>🕐 {lead.bestTimeToContact}</Text>
      </View>
      
      {/* Personal Note */}
      {lead.personalNote && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>📝 {lead.personalNote}</Text>
        </View>
      )}
      
      {/* Actions */}
      <View style={styles.leadActions}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() => onGenerateMessage(lead)}
        >
          <Text style={styles.generateButtonText}>✨ Nachricht generieren</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reactivateButton}
          onPress={() => onReactivate(lead)}
        >
          <Text style={styles.reactivateButtonText}>🔥 Reaktivieren</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const PhoenixScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<PhoenixLead[]>([]);
  const [stats, setStats] = useState<ReactivationStats | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  
  // ─────────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────
  
  const loadData = useCallback(async () => {
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLeads(MOCK_PHOENIX_LEADS);
      setStats(MOCK_STATS);
    } catch (error) {
      console.error('Error loading phoenix data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  const handleReactivate = useCallback((lead: PhoenixLead) => {
    Alert.alert(
      '🔥 Lead reaktivieren',
      `${lead.name} wird als aktiver Lead markiert und bekommt einen Follow-up Task.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Reaktivieren',
          onPress: () => {
            // TODO: API call to reactivate lead
            Alert.alert('✅ Erfolg', `${lead.name} wurde reaktiviert!`);
          },
        },
      ]
    );
  }, []);
  
  const handleGenerateMessage = useCallback((lead: PhoenixLead) => {
    // Navigate to chat with context
    navigation.navigate('Chat', {
      initialMessage: `Generiere eine Reaktivierungs-Nachricht für ${lead.name}. 
      
Kontext:
- Letzter Kontakt: ${formatDaysAgo(lead.daysSinceContact)}
- Grund für Inaktivität: ${lead.lostReason || 'Unbekannt'}
- Empfohlener Ansatz: ${getApproachLabel(lead.suggestedApproach).label}
${lead.personalNote ? `- Notiz: ${lead.personalNote}` : ''}

Die Nachricht sollte persönlich, nicht pushy und zum Ansatz passend sein.`,
    });
  }, [navigation]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // FILTERING
  // ─────────────────────────────────────────────────────────────────────────
  
  const filteredLeads = leads.filter(lead => {
    if (filter === 'all') return true;
    if (filter === 'high') return lead.reactivationScore >= 80;
    if (filter === 'medium') return lead.reactivationScore >= 50 && lead.reactivationScore < 80;
    if (filter === 'low') return lead.reactivationScore < 50;
    return true;
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AURA_COLORS.neon.cyan} />
        <Text style={styles.loadingText}>Phoenix lädt...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🔥 Phoenix</Text>
          <Text style={styles.headerSubtitle}>Lead-Reaktivierung</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AURA_COLORS.neon.cyan}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>🦅</Text>
          <Text style={styles.heroTitle}>Aus der Asche auferstehen</Text>
          <Text style={styles.heroSubtitle}>
            Reaktiviere verlorene Leads mit KI-gestützten Strategien
          </Text>
        </View>
        
        {/* Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <StatCard
              emoji="❄️"
              label="Kalte Leads"
              value={stats.totalColdLeads}
            />
            <StatCard
              emoji="🔥"
              label="Hohes Potenzial"
              value={stats.highPotential}
              color="#22c55e"
            />
            <StatCard
              emoji="✅"
              label="Reaktiviert"
              value={stats.reactivatedThisMonth}
              color={AURA_COLORS.neon.cyan}
            />
            <StatCard
              emoji="📈"
              label="Erfolgsrate"
              value={`${stats.successRate}%`}
            />
          </View>
        )}
        
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {[
            { key: 'all', label: 'Alle' },
            { key: 'high', label: '🔥 Hoch' },
            { key: 'medium', label: '⚡ Mittel' },
            { key: 'low', label: '❄️ Niedrig' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                filter === f.key && styles.filterTabActive,
              ]}
              onPress={() => setFilter(f.key as any)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === f.key && styles.filterTabTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Lead List */}
        <View style={styles.leadsList}>
          {filteredLeads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>Keine kalten Leads!</Text>
              <Text style={styles.emptySubtitle}>
                Alle deine Leads sind aktiv. Weiter so!
              </Text>
            </View>
          ) : (
            filteredLeads.map((lead) => (
              <PhoenixLeadCard
                key={lead.id}
                lead={lead}
                onReactivate={handleReactivate}
                onGenerateMessage={handleGenerateMessage}
              />
            ))
          )}
        </View>
        
        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Reaktivierungs-Tipps</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              • <Text style={styles.tipHighlight}>Timing:</Text> Dienstag-Donnerstag funktionieren am besten
            </Text>
            <Text style={styles.tipText}>
              • <Text style={styles.tipHighlight}>Personalisierung:</Text> Beziehe dich auf das letzte Gespräch
            </Text>
            <Text style={styles.tipText}>
              • <Text style={styles.tipHighlight}>Wert:</Text> Biete etwas Neues - nicht nur "Nachfassen"
            </Text>
            <Text style={styles.tipText}>
              • <Text style={styles.tipHighlight}>Kein Druck:</Text> Sei verständnisvoll, nicht pushy
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.bg.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: AURA_COLORS.text.muted,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: AURA_COLORS.bg.primary,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AURA_COLORS.glass.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: AURA_COLORS.text.primary,
    marginTop: -2,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  
  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  statLabel: {
    fontSize: 10,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  
  // Filter
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AURA_COLORS.glass.surface,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  filterTabActive: {
    backgroundColor: AURA_COLORS.neon.cyan + '20',
    borderColor: AURA_COLORS.neon.cyan,
  },
  filterTabText: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
  },
  filterTabTextActive: {
    color: AURA_COLORS.neon.cyan,
    fontWeight: '600',
  },
  
  // Leads List
  leadsList: {
    paddingHorizontal: 16,
  },
  leadCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.soft,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  lastContact: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 10,
    color: AURA_COLORS.text.muted,
  },
  
  reasonContainer: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
  },
  
  approachContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  approachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.neon.cyan + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  approachEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  approachText: {
    fontSize: 13,
    fontWeight: '600',
    color: AURA_COLORS.neon.cyan,
  },
  bestTime: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
  },
  
  noteContainer: {
    backgroundColor: '#f59e0b' + '15',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 13,
    color: '#f59e0b',
    fontStyle: 'italic',
  },
  
  leadActions: {
    flexDirection: 'row',
    gap: 8,
  },
  generateButton: {
    flex: 1,
    backgroundColor: AURA_COLORS.glass.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  reactivateButton: {
    flex: 1,
    backgroundColor: AURA_COLORS.neon.cyan,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  reactivateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
  },
  
  // Tips Section
  tipsSection: {
    margin: 16,
    marginTop: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 12,
  },
  tipCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  tipText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  tipHighlight: {
    fontWeight: '600',
    color: AURA_COLORS.neon.cyan,
  },
});

export default PhoenixScreen;

