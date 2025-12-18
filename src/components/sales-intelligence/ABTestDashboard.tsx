/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  A/B TEST DASHBOARD                                                        ║
 * ║  Übersicht über laufende und abgeschlossene A/B Tests                     ║
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ABTest } from '../../types/salesIntelligence';

interface ABTestDashboardProps {
  tests?: ABTest[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onTestPress?: (test: ABTest) => void;
  onCreateTest?: () => void;
}

interface TestCardProps {
  test: ABTest;
  onPress?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running': return '#10B981';
    case 'completed': return '#3B82F6';
    case 'paused': return '#F59E0B';
    default: return '#6B7280';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'running': return 'Läuft';
    case 'completed': return 'Abgeschlossen';
    case 'paused': return 'Pausiert';
    default: return status;
  }
};

const TestCard: React.FC<TestCardProps> = ({ test, onPress }) => {
  const statusColor = getStatusColor(test.status);
  const totalA = test.variant_a_count;
  const totalB = test.variant_b_count;
  const total = totalA + totalB;
  
  const rateA = test.variant_a_rate * 100;
  const rateB = test.variant_b_rate * 100;
  const difference = rateA - rateB;
  
  const hasWinner = test.winner !== null;
  const winnerIsA = test.winner === 'a';

  return (
    <TouchableOpacity
      style={styles.testCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName}>{test.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(test.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.cardType}>{test.test_type}</Text>
      </View>

      {/* Variants */}
      <View style={styles.variantsContainer}>
        {/* Variant A */}
        <View style={[
          styles.variantBox,
          hasWinner && winnerIsA && styles.winnerBox,
        ]}>
          <View style={styles.variantHeader}>
            <Text style={styles.variantLabel}>Variante A</Text>
            {hasWinner && winnerIsA && (
              <View style={styles.winnerBadge}>
                <Ionicons name="trophy" size={12} color="#F59E0B" />
                <Text style={styles.winnerText}>Winner</Text>
              </View>
            )}
          </View>
          <Text style={styles.variantName}>{test.variant_a}</Text>
          <View style={styles.variantStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalA}</Text>
              <Text style={styles.statLabel}>Tests</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{test.variant_a_conversions}</Text>
              <Text style={styles.statLabel}>Conversions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.rateValue]}>
                {rateA.toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar,
                { width: `${Math.min(rateA, 100)}%` },
                winnerIsA && styles.winnerBar,
              ]} 
            />
          </View>
        </View>

        {/* VS Divider */}
        <View style={styles.vsDivider}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* Variant B */}
        <View style={[
          styles.variantBox,
          hasWinner && !winnerIsA && styles.winnerBox,
        ]}>
          <View style={styles.variantHeader}>
            <Text style={styles.variantLabel}>Variante B</Text>
            {hasWinner && !winnerIsA && (
              <View style={styles.winnerBadge}>
                <Ionicons name="trophy" size={12} color="#F59E0B" />
                <Text style={styles.winnerText}>Winner</Text>
              </View>
            )}
          </View>
          <Text style={styles.variantName}>{test.variant_b}</Text>
          <View style={styles.variantStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalB}</Text>
              <Text style={styles.statLabel}>Tests</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{test.variant_b_conversions}</Text>
              <Text style={styles.statLabel}>Conversions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.rateValue]}>
                {rateB.toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Rate</Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar,
                { width: `${Math.min(rateB, 100)}%` },
                !winnerIsA && hasWinner && styles.winnerBar,
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Difference Indicator */}
      {total >= 20 && (
        <View style={styles.differenceContainer}>
          <Text style={styles.differenceLabel}>Differenz:</Text>
          <Text style={[
            styles.differenceValue,
            difference > 0 ? styles.positiveValue : difference < 0 ? styles.negativeValue : null,
          ]}>
            {difference > 0 ? '+' : ''}{difference.toFixed(1)}%
          </Text>
          {test.statistical_significance > 0 && (
            <Text style={styles.significanceText}>
              ({(test.statistical_significance * 100).toFixed(0)}% Signifikanz)
            </Text>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>
          Gesamt: {total} Tests • Erstellt: {new Date(test.created_at).toLocaleDateString('de-DE')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );
};

// Summary Stats Component
const SummaryStats: React.FC<{ tests: ABTest[] }> = ({ tests }) => {
  const runningTests = tests.filter(t => t.status === 'running').length;
  const completedTests = tests.filter(t => t.status === 'completed').length;
  const totalConversions = tests.reduce((sum, t) => 
    sum + t.variant_a_conversions + t.variant_b_conversions, 0
  );
  const avgConversionRate = tests.length > 0
    ? tests.reduce((sum, t) => sum + (t.variant_a_rate + t.variant_b_rate) / 2, 0) / tests.length * 100
    : 0;

  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryItem}>
        <View style={[styles.summaryIcon, { backgroundColor: '#10B98120' }]}>
          <Ionicons name="play-circle" size={20} color="#10B981" />
        </View>
        <Text style={styles.summaryValue}>{runningTests}</Text>
        <Text style={styles.summaryLabel}>Laufend</Text>
      </View>
      <View style={styles.summaryItem}>
        <View style={[styles.summaryIcon, { backgroundColor: '#3B82F620' }]}>
          <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
        </View>
        <Text style={styles.summaryValue}>{completedTests}</Text>
        <Text style={styles.summaryLabel}>Abgeschlossen</Text>
      </View>
      <View style={styles.summaryItem}>
        <View style={[styles.summaryIcon, { backgroundColor: '#F59E0B20' }]}>
          <Ionicons name="trending-up" size={20} color="#F59E0B" />
        </View>
        <Text style={styles.summaryValue}>{totalConversions}</Text>
        <Text style={styles.summaryLabel}>Conversions</Text>
      </View>
      <View style={styles.summaryItem}>
        <View style={[styles.summaryIcon, { backgroundColor: '#8B5CF620' }]}>
          <Ionicons name="analytics" size={20} color="#8B5CF6" />
        </View>
        <Text style={styles.summaryValue}>{avgConversionRate.toFixed(1)}%</Text>
        <Text style={styles.summaryLabel}>Ø Rate</Text>
      </View>
    </View>
  );
};

export const ABTestDashboard: React.FC<ABTestDashboardProps> = ({
  tests = [],
  isLoading = false,
  onRefresh,
  onTestPress,
  onCreateTest,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  };

  const runningTests = tests.filter(t => t.status === 'running');
  const completedTests = tests.filter(t => t.status === 'completed');

  if (isLoading && tests.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Lade A/B Tests...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#3B82F6"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>A/B Tests</Text>
          <Text style={styles.subtitle}>Teste verschiedene Strategien</Text>
        </View>
        {onCreateTest && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={onCreateTest}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.createButtonText}>Neuer Test</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Stats */}
      {tests.length > 0 && <SummaryStats tests={tests} />}

      {/* Empty State */}
      {tests.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="flask-outline" size={64} color="#374151" />
          <Text style={styles.emptyTitle}>Keine A/B Tests</Text>
          <Text style={styles.emptyText}>
            Starte deinen ersten A/B Test um herauszufinden, welche Strategien am besten funktionieren.
          </Text>
          {onCreateTest && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={onCreateTest}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.emptyButtonText}>Ersten Test erstellen</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Running Tests */}
      {runningTests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="play-circle" size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Laufende Tests</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{runningTests.length}</Text>
            </View>
          </View>
          {runningTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onPress={() => onTestPress?.(test)}
            />
          ))}
        </View>
      )}

      {/* Completed Tests */}
      {completedTests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Abgeschlossene Tests</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{completedTests.length}</Text>
            </View>
          </View>
          {completedTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onPress={() => onTestPress?.(test)}
            />
          ))}
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Summary
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // Test Card
  testCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },

  // Variants
  variantsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  variantBox: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  winnerBox: {
    borderColor: '#F59E0B',
    backgroundColor: '#78350F20',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  variantLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  winnerText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '700',
  },
  variantName: {
    fontSize: 13,
    color: '#F9FAFB',
    fontWeight: '600',
    marginBottom: 12,
  },
  variantStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  rateValue: {
    color: '#10B981',
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  winnerBar: {
    backgroundColor: '#F59E0B',
  },
  vsDivider: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
  },

  // Difference
  differenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 8,
  },
  differenceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  differenceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  positiveValue: {
    color: '#10B981',
  },
  negativeValue: {
    color: '#EF4444',
  },
  significanceText: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerText: {
    fontSize: 11,
    color: '#6B7280',
  },

  bottomSpacer: {
    height: 40,
  },
});

export default ABTestDashboard;

