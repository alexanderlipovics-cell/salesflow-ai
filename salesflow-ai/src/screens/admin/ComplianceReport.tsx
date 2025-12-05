/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMPLIANCE REPORT                                                         ║
 * ║  Übersicht für Team-Leader: Liability Shield Statistiken                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =============================================================================
// TYPES
// =============================================================================

interface TeamMemberCompliance {
  id: string;
  name: string;
  avatar?: string;
  totalResponses: number;
  complianceScore: number;
  issuesCorrected: number;
  criticalIssues: number;
}

interface ComplianceStats {
  overallScore: number;
  totalResponses: number;
  totalCorrections: number;
  byCategory: {
    health_claims: number;
    financial_guarantees: number;
    misleading_promises: number;
    other: number;
  };
}

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_STATS: ComplianceStats = {
  overallScore: 94.5,
  totalResponses: 1247,
  totalCorrections: 68,
  byCategory: {
    health_claims: 42,
    financial_guarantees: 12,
    misleading_promises: 8,
    other: 6,
  },
};

const MOCK_TEAM: TeamMemberCompliance[] = [
  { id: '1', name: 'Max Müller', totalResponses: 312, complianceScore: 98.2, issuesCorrected: 6, criticalIssues: 0 },
  { id: '2', name: 'Anna Schmidt', totalResponses: 287, complianceScore: 95.8, issuesCorrected: 12, criticalIssues: 1 },
  { id: '3', name: 'Thomas Weber', totalResponses: 245, complianceScore: 92.4, issuesCorrected: 19, criticalIssues: 2 },
  { id: '4', name: 'Lisa Bauer', totalResponses: 198, complianceScore: 97.0, issuesCorrected: 6, criticalIssues: 0 },
  { id: '5', name: 'Peter Hoffmann', totalResponses: 205, complianceScore: 89.7, issuesCorrected: 25, criticalIssues: 3 },
];

// =============================================================================
// COMPONENTS
// =============================================================================

const ScoreGauge = ({ score }: { score: number }) => {
  const getColor = (s: number) => {
    if (s >= 95) return '#22C55E';
    if (s >= 85) return '#F59E0B';
    if (s >= 70) return '#F97316';
    return '#EF4444';
  };
  
  const color = getColor(score);
  
  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeOuter}>
        <View style={[styles.gaugeInner, { backgroundColor: color + '30' }]}>
          <Text style={[styles.gaugeScore, { color }]}>{score.toFixed(1)}%</Text>
          <Text style={styles.gaugeLabel}>Compliance Score</Text>
        </View>
      </View>
      <View style={[styles.gaugeIndicator, { backgroundColor: color }]} />
    </View>
  );
};

const CategoryBar = ({ 
  label, 
  count, 
  total, 
  color 
}: { 
  label: string; 
  count: number; 
  total: number; 
  color: string;
}) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <View style={styles.categoryBar}>
      <View style={styles.categoryLabelRow}>
        <Text style={styles.categoryLabel}>{label}</Text>
        <Text style={styles.categoryCount}>{count}</Text>
      </View>
      <View style={styles.categoryTrack}>
        <View 
          style={[
            styles.categoryFill, 
            { width: `${percentage}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
};

const TeamMemberRow = ({ member }: { member: TeamMemberCompliance }) => {
  const getScoreColor = (score: number) => {
    if (score >= 95) return '#22C55E';
    if (score >= 85) return '#F59E0B';
    return '#EF4444';
  };
  
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>
          {member.name.split(' ').map(n => n[0]).join('')}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.memberStats}>
          {member.totalResponses} Antworten • {member.issuesCorrected} korrigiert
        </Text>
      </View>
      <View style={styles.memberScore}>
        <Text style={[styles.memberScoreValue, { color: getScoreColor(member.complianceScore) }]}>
          {member.complianceScore.toFixed(1)}%
        </Text>
        {member.criticalIssues > 0 && (
          <View style={styles.criticalBadge}>
            <Text style={styles.criticalBadgeText}>⚠️ {member.criticalIssues}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ComplianceReport() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  const stats = MOCK_STATS;
  const team = MOCK_TEAM;
  
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark" size={28} color="#22C55E" />
        </View>
        <View>
          <Text style={styles.headerTitle}>⚖️ Compliance Report</Text>
          <Text style={styles.headerSubtitle}>Liability Shield™ Statistiken</Text>
        </View>
      </View>
      
      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['7d', '30d', '90d'] as const).map(range => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.timeRangeButtonActive
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[
              styles.timeRangeText,
              timeRange === range && styles.timeRangeTextActive
            ]}>
              {range === '7d' ? '7 Tage' : range === '30d' ? '30 Tage' : '90 Tage'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Overall Score */}
      <View style={styles.scoreSection}>
        <ScoreGauge score={stats.overallScore} />
        
        <View style={styles.scoreStats}>
          <View style={styles.scoreStat}>
            <Ionicons name="chatbubbles-outline" size={20} color="#3B82F6" />
            <Text style={styles.scoreStatValue}>{stats.totalResponses}</Text>
            <Text style={styles.scoreStatLabel}>Antworten</Text>
          </View>
          <View style={styles.scoreStat}>
            <Ionicons name="construct-outline" size={20} color="#F59E0B" />
            <Text style={styles.scoreStatValue}>{stats.totalCorrections}</Text>
            <Text style={styles.scoreStatLabel}>Korrekturen</Text>
          </View>
          <View style={styles.scoreStat}>
            <Ionicons name="trending-up-outline" size={20} color="#22C55E" />
            <Text style={styles.scoreStatValue}>
              {((1 - stats.totalCorrections / stats.totalResponses) * 100).toFixed(1)}%
            </Text>
            <Text style={styles.scoreStatLabel}>Fehlerfreiheit</Text>
          </View>
        </View>
      </View>
      
      {/* Issues by Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Korrekturen nach Kategorie</Text>
        <View style={styles.categoriesCard}>
          <CategoryBar 
            label="🏥 Heilversprechen" 
            count={stats.byCategory.health_claims}
            total={stats.totalCorrections}
            color="#EF4444"
          />
          <CategoryBar 
            label="💰 Finanzgarantien" 
            count={stats.byCategory.financial_guarantees}
            total={stats.totalCorrections}
            color="#F59E0B"
          />
          <CategoryBar 
            label="🎯 Irreführende Versprechen" 
            count={stats.byCategory.misleading_promises}
            total={stats.totalCorrections}
            color="#8B5CF6"
          />
          <CategoryBar 
            label="📋 Sonstige" 
            count={stats.byCategory.other}
            total={stats.totalCorrections}
            color="#6B7280"
          />
        </View>
      </View>
      
      {/* Team Leaderboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Team Compliance</Text>
        <View style={styles.teamCard}>
          {team
            .sort((a, b) => b.complianceScore - a.complianceScore)
            .map((member, index) => (
              <React.Fragment key={member.id}>
                {index > 0 && <View style={styles.divider} />}
                <TeamMemberRow member={member} />
              </React.Fragment>
            ))
          }
        </View>
      </View>
      
      {/* Tips Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Verbesserungstipps</Text>
        <View style={styles.tipsCard}>
          <View style={styles.tipItem}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Heilversprechen vermeiden:</Text> Statt "heilt" oder "kuriert" → "kann unterstützen bei"
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Keine Garantien:</Text> Statt "garantiert" → "in Studien als wirksam gezeigt"
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Best Practice:</Text> Immer auf Studien und Fakten verweisen
            </Text>
          </View>
        </View>
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          📈 Compliance-Daten werden automatisch aktualisiert
        </Text>
      </View>
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#22C55E20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  
  // Time Range
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  timeRangeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Score Section
  scoreSection: {
    padding: 16,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gaugeOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: '#22C55E40',
  },
  gaugeInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeScore: {
    fontSize: 36,
    fontWeight: '800',
  },
  gaugeLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  gaugeIndicator: {
    position: 'absolute',
    bottom: 20,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scoreStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreStat: {
    alignItems: 'center',
  },
  scoreStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 8,
  },
  scoreStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  
  // Sections
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  
  // Categories
  categoriesCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  categoryBar: {
    marginBottom: 16,
  },
  categoryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#F8FAFC',
  },
  categoryCount: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  categoryTrack: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Team
  teamCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  memberStats: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  memberScore: {
    alignItems: 'flex-end',
  },
  memberScoreValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  criticalBadge: {
    backgroundColor: '#EF444420',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  criticalBadgeText: {
    fontSize: 10,
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginHorizontal: 12,
  },
  
  // Tips
  tipsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: '600',
    color: '#F8FAFC',
  },
  
  // Footer
  footer: {
    padding: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

