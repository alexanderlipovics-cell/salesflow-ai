/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CLOSERCLUB - SPEED HUNTER SCREEN                                          ║
 * ║  Intent Intelligence Monitor für Mobile                                    ║
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';

const { width } = Dimensions.get('window');

interface HotAccount {
  id: string;
  name: string;
  meta: string;
  value: string;
  score: number;
  freshness: string;
  owner: string;
  signals: string[];
}

interface SpeedHunterData {
  stats: Array<{
    label: string;
    value: string;
    helper: string;
  }>;
  accounts: HotAccount[];
}

export default function SpeedHunterScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedWindow, setSelectedWindow] = useState('24h');
  const [data, setData] = useState<SpeedHunterData>({
    stats: [
      { label: 'Neue Buying Signals', value: '+58', helper: '12 Accounts ↑' },
      { label: 'Intent Intensität', value: '91', helper: 'Top 10% ICP' },
      { label: 'Net-New Pipeline', value: '€420k', helper: '5 opps entdeckt' },
    ],
    accounts: [
      {
        id: 'nexonic',
        name: 'Nexonic GmbH',
        meta: 'Series B · 420 MAUs',
        value: '€210k',
        score: 92,
        freshness: 'vor 2h',
        owner: 'Lena',
        signals: ['Board Pressure', 'RFP ready', 'Reactivated trial'],
      },
      {
        id: 'datagen',
        name: 'DataGenics AG',
        meta: 'Enterprise · 5 Länder',
        value: '€160k',
        score: 88,
        freshness: 'vor 4h',
        owner: 'Marco',
        signals: ['Loss Alert', 'Champion switched', 'Open webhook'],
      },
      {
        id: 'altair',
        name: 'Altair Systems',
        meta: 'Scale-up · 180 reps',
        value: '€85k',
        score: 84,
        freshness: 'vor 35m',
        owner: 'Sara',
        signals: ['New Buying Unit', 'Website spike'],
      },
    ],
  });

  useEffect(() => {
    loadSpeedHunterData();
  }, [selectedWindow]);

  const loadSpeedHunterData = async () => {
    try {
      setLoading(true);
      // TODO: API Call implementieren
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('Fehler beim Laden der SpeedHunter-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSpeedHunterData();
    setRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return COLORS.hot;
    if (score >= 80) return COLORS.warm;
    return COLORS.cold;
  };

  const AccountCard = ({ account }: { account: HotAccount }) => (
    <TouchableOpacity 
      style={styles.accountCard}
      activeOpacity={0.8}
    >
      <View style={styles.accountHeader}>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{account.name}</Text>
          <Text style={styles.accountMeta}>{account.meta}</Text>
        </View>
        <View style={[styles.scoreBadge, { borderColor: getScoreColor(account.score) }]}>
          <Text style={[styles.scoreText, { color: getScoreColor(account.score) }]}>
            {account.score}
          </Text>
        </View>
      </View>

      <View style={styles.accountBody}>
        <View style={styles.accountRow}>
          <Text style={styles.accountLabel}>💰 Value</Text>
          <Text style={styles.accountValue}>{account.value}</Text>
        </View>
        <View style={styles.accountRow}>
          <Text style={styles.accountLabel}>⏰ Freshness</Text>
          <Text style={styles.accountValue}>{account.freshness}</Text>
        </View>
        <View style={styles.accountRow}>
          <Text style={styles.accountLabel}>👤 Owner</Text>
          <Text style={styles.accountValue}>{account.owner}</Text>
        </View>
      </View>

      <View style={styles.signalsContainer}>
        <Text style={styles.signalsLabel}>Buying Signals:</Text>
        <View style={styles.signalsList}>
          {account.signals.map((signal, index) => (
            <View key={index} style={styles.signalBadge}>
              <Text style={styles.signalText}>{signal}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.actionButton}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.actionButtonGradient}
        >
          <Text style={styles.actionButtonText}>Kontakt aufnehmen</Text>
        </LinearGradient>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const StatCard = ({ stat }: { stat: { label: string; value: string; helper: string } }) => (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{stat.label}</Text>
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statHelper}>{stat.helper}</Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Analysiere Buying Signals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerKicker}>SPEEDHUNTER MODUL</Text>
          <Text style={styles.headerTitle}>Intent Intelligence</Text>
          <Text style={styles.headerSubtitle}>
            Vereint Buying Signals, AI-Rankings und Autopilot-Taktiken pro Account.
          </Text>
        </View>

        {/* Time Window Selector */}
        <View style={styles.windowSelector}>
          {['24h', '7d', '30d'].map((window) => (
            <TouchableOpacity
              key={window}
              style={[
                styles.windowButton,
                selectedWindow === window && styles.windowButtonActive,
              ]}
              onPress={() => setSelectedWindow(window)}
            >
              <Text
                style={[
                  styles.windowButtonText,
                  selectedWindow === window && styles.windowButtonTextActive,
                ]}
              >
                {window}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {data.stats.map((stat, index) => (
            <StatCard key={index} stat={stat} />
          ))}
        </View>

        {/* Hot Accounts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Hot Accounts</Text>
            <Text style={styles.sectionCount}>{data.accounts.length}</Text>
          </View>

          {data.accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  headerKicker: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  windowSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  windowButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  windowButtonActive: {
    backgroundColor: COLORS.glass,
    borderColor: COLORS.primary,
  },
  windowButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  windowButtonTextActive: {
    color: COLORS.primary,
  },
  statsGrid: {
    marginBottom: SPACING.xl,
  },
  statCard: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  statHelper: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  sectionCount: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    backgroundColor: COLORS.glass,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.sm,
  },
  accountCard: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  accountMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  scoreBadge: {
    width: 48,
    height: 48,
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
  accountBody: {
    marginBottom: SPACING.md,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  accountLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
  },
  accountValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '600',
  },
  signalsContainer: {
    marginBottom: SPACING.md,
  },
  signalsLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  signalsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  signalBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  signalText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  actionButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  actionButtonGradient: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
});

