/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - PREMIUM DASHBOARD SCREEN                                        ║
 * ║  Sci-Fi Luxury Dark-Mode SaaS Dashboard                                    ║
 * ║  Inspired by: Linear, Bloomberg Terminal, Crypto Exchanges                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, G, Rect, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { AURA_COLORS, AURA_SHADOWS, AURA_RADIUS } from '../../components/aura';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// AURA OS LOGO COMPONENT (Animated)
// ═══════════════════════════════════════════════════════════════════════════
const AuraOsLogoSvg: React.FC<{ size?: number }> = ({ size = 40 }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* Glow background */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 1.5,
          height: size * 1.5,
          left: -size * 0.25,
          top: -size * 0.25,
          borderRadius: size,
          backgroundColor: AURA_COLORS.neon.cyan,
          opacity: pulseAnim,
        }}
      />
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="#020617" />
            <Stop offset="100%" stopColor="#00010a" />
          </RadialGradient>
          <SvgLinearGradient id="auraCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#a5f3fc" />
            <Stop offset="50%" stopColor="#22d3ee" />
            <Stop offset="100%" stopColor="#06b6d4" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="32" y="32" width="448" height="448" rx="128" fill="url(#bg)" />
        <Circle cx="256" cy="256" r="150" fill="#22d3ee" opacity={0.25} />
        <G transform="translate(256 256)" fill="none" stroke="url(#auraCyan)" strokeWidth="10">
          <Ellipse rx="122" ry="72" transform="rotate(-18)" />
          <Ellipse rx="72" ry="122" transform="rotate(32)" opacity={0.7} />
          <Circle cx="0" cy="0" r="36" stroke="url(#auraCyan)" strokeWidth="8" />
          <Circle cx="0" cy="0" r="16" fill="#a5f3fc" />
          <Circle cx="86" cy="-18" r="10" fill="#a5f3fc" />
        </G>
        <Rect x="32.5" y="32.5" width="447" height="447" rx="128" fill="none" stroke="#38bdf8" strokeOpacity={0.35} strokeWidth="2" />
      </Svg>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HEADER BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const HeaderBar: React.FC = () => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <AuraOsLogoSvg size={40} />
        <Text style={styles.headerTitle}>AURA OS</Text>
      </View>
      <View style={styles.headerRight}>
        <View style={styles.versionPill}>
          <Text style={styles.versionText}>Version 1.0 • Stable</Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDotContainer}>
            <View style={styles.statusDot} />
            <View style={styles.statusDotPing} />
          </View>
          <Text style={styles.statusText}>System active</Text>
        </View>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MODULE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
interface ModuleCardProps {
  icon: string;
  title: string;
  label: string;
  metric: string;
  onPress?: () => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ icon, title, label, metric, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      <Animated.View style={[styles.moduleCard, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.moduleIconContainer}>
          <Text style={styles.moduleIcon}>{icon}</Text>
        </View>
        <View style={styles.moduleContent}>
          <Text style={styles.moduleLabel}>{label}</Text>
          <Text style={styles.moduleTitle}>{title}</Text>
          <Text style={styles.moduleMetric}>{metric}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STATS BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
interface StatsBarProps {
  stats: Array<{ value: string; label: string }>;
}

const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient
      colors={['rgba(34, 211, 238, 0.15)', 'rgba(34, 211, 238, 0.05)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statsBar}
    >
      <View style={styles.statsLeft}>
        {stats.map((stat, index) => (
          <React.Fragment key={stat.label}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
            {index < stats.length - 1 && <View style={styles.statDivider} />}
          </React.Fragment>
        ))}
      </View>
      <View style={styles.livePill}>
        <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
    </LinearGradient>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CHIEF AUTOPILOT CARD (COCKPIT)
// ═══════════════════════════════════════════════════════════════════════════
interface ChiefAutopilotCardProps {
  agents: Array<{ name: string }>;
  metrics: Array<{ value: string; label: string }>;
  onPress?: () => void;
}

const ChiefAutopilotCard: React.FC<ChiefAutopilotCardProps> = ({ agents, metrics, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Pressable
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
      onPress={onPress}
    >
      <Animated.View style={[styles.chiefCard, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)', 'rgba(15, 23, 42, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chiefGradient}
        >
          {/* Ambient Circuit Background */}
          <View style={styles.orbitContainer}>
            <Animated.View style={[styles.orbitRing1, { opacity: glowAnim }]} />
            <Animated.View style={[styles.orbitRing2, { opacity: glowAnim }]} />
            <Animated.View style={[styles.orbitRing3, { opacity: glowAnim }]} />
            <View style={styles.glowDot1} />
            <View style={styles.glowDot2} />
            <View style={styles.glowDot3} />
          </View>

          {/* Content */}
          <View style={styles.chiefContent}>
            <View style={styles.chiefLeft}>
              <View style={styles.chiefBadgeRow}>
                <View style={styles.chiefGlowRing}>
                  <Animated.View style={[styles.chiefGlowCore, { opacity: glowAnim }]} />
                </View>
                <Text style={styles.chiefBadgeText}>AUTONOMOUS SYSTEM</Text>
              </View>
              <Text style={styles.chiefTitle}>CHIEF Autopilot</Text>
              <Text style={styles.chiefSubtitle}>System autonom</Text>
              
              {/* Agent Pills */}
              <View style={styles.agentPills}>
                {agents.map((agent) => (
                  <View key={agent.name} style={styles.agentPill}>
                    <Text style={styles.agentPillText}>{agent.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.chiefRight}>
              {metrics.map((metric) => (
                <View key={metric.label} style={styles.chiefMetric}>
                  <Text style={styles.chiefMetricValue}>{metric.value}</Text>
                  <Text style={styles.chiefMetricLabel}>{metric.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bottom Glow Line */}
          <LinearGradient
            colors={['transparent', 'rgba(251, 191, 36, 0.5)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.chiefBottomLine}
          />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
interface FeatureCardProps {
  title: string;
  metric: string;
  trend?: string;
  type: 'outreach' | 'finance';
  onPress?: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, metric, trend, type, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isOutreach = type === 'outreach';
  const color = isOutreach ? '#a855f7' : '#10b981';
  const progress = isOutreach ? 0.75 : 0.62;

  return (
    <Pressable
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      <Animated.View style={[styles.featureCard, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.featureHeader}>
          <View style={styles.featureIconRow}>
            <View style={[styles.featureIconContainer, { backgroundColor: color + '20' }]}>
              <Text style={styles.featureIcon}>{isOutreach ? '📬' : '💰'}</Text>
            </View>
            <Text style={styles.featureLabel}>{title}</Text>
          </View>
          {trend && (
            <Text style={[styles.featureTrend, { color: trend.startsWith('+') ? '#10b981' : '#f43f5e' }]}>
              {trend}
            </Text>
          )}
        </View>
        <Text style={[styles.featureMetric, { color }]}>{metric}</Text>
        <View style={styles.featureProgressBg}>
          <View style={[styles.featureProgress, { width: `${progress * 100}%`, backgroundColor: color }]} />
        </View>
        <View style={styles.featureProgressLabels}>
          <Text style={styles.featureProgressLabel}>0</Text>
          <Text style={styles.featureProgressLabel}>{isOutreach ? '500' : '€ 10.000'}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BOTTOM DOCK NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════
interface BottomDockProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

const BottomDock: React.FC<BottomDockProps> = ({ activeTab, onTabPress }) => {
  const tabs = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'autopilot', icon: '⚡', label: 'Autopilot' },
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'user', icon: '👤', label: 'Profil' },
  ];

  return (
    <View style={styles.dockContainer}>
      <View style={styles.dock}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.dockItem, isActive && styles.dockItemActive]}
              onPress={() => onTabPress(tab.id)}
            >
              {isActive && <View style={styles.dockItemGlow} />}
              <Text style={[styles.dockIcon, isActive && styles.dockIconActive]}>{tab.icon}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function AuraOsDashboardScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Demo Data
  const moduleCards = [
    { icon: '🚀', title: 'Autopilot', label: 'Module', metric: '24 active' },
    { icon: '💬', title: 'AI Chat', label: 'Module', metric: '7 threads' },
    { icon: '📋', title: 'Sequences', label: 'Module', metric: '12 flows' },
  ];

  const statsData = [
    { value: '3', label: 'Heute' },
    { value: '5', label: 'Offen' },
    { value: '12', label: 'Leads' },
  ];

  const chiefAgents = [{ name: 'Hunter' }, { name: 'Closer' }];

  const chiefMetrics = [
    { value: '27', label: 'Automationen' },
    { value: '8', label: 'Fahrtroute' },
    { value: '12', label: 'Antrillor' },
    { value: '142', label: 'Suitor' },
  ];

  const featureCards = [
    { title: 'Outreach', metric: '412 Gesendet', type: 'outreach' as const },
    { title: 'Finanzen', metric: '€ 4.200 Umsatz', trend: '+18% vs. letzte Woche', type: 'finance' as const },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'home':
        navigation.navigate('Home');
        break;
      case 'autopilot':
        navigation.navigate('AutopilotSettings');
        break;
      case 'chat':
        navigation.navigate('Chat');
        break;
      case 'user':
        // Navigate to profile/settings
        break;
    }
  };

  return (
    <View style={styles.container}>
      {/* Deep Space Background */}
      <View style={styles.backgroundContainer}>
        <View style={styles.cyanBlob} />
        <View style={styles.violetBlob} />
        <View style={styles.cyanBlob2} />
        <View style={styles.violetBlob2} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AURA_COLORS.neon.cyan}
          />
        }
      >
        {/* Header */}
        <HeaderBar />

        {/* Module Cards Row */}
        <View style={styles.moduleRow}>
          {moduleCards.map((card) => (
            <ModuleCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              label={card.label}
              metric={card.metric}
              onPress={() => {
                if (card.title === 'Autopilot') navigation.navigate('AutopilotSettings');
                if (card.title === 'AI Chat') navigation.navigate('Chat');
                if (card.title === 'Sequences') navigation.navigate('Sequences');
              }}
            />
          ))}
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBarContainer}>
          <StatsBar stats={statsData} />
        </View>

        {/* CHIEF Autopilot Cockpit */}
        <View style={styles.chiefContainer}>
          <ChiefAutopilotCard
            agents={chiefAgents}
            metrics={chiefMetrics}
            onPress={() => navigation.navigate('AutopilotSettings')}
          />
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.featureRow}>
          {featureCards.map((card) => (
            <FeatureCard
              key={card.title}
              title={card.title}
              metric={card.metric}
              trend={card.trend}
              type={card.type}
              onPress={() => {
                if (card.type === 'outreach') navigation.navigate('Outreach');
                if (card.type === 'finance') navigation.navigate('Finance');
              }}
            />
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Dock */}
      <BottomDock activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  cyanBlob: {
    position: 'absolute',
    top: -100,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  violetBlob: {
    position: 'absolute',
    bottom: 100,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  cyanBlob2: {
    position: 'absolute',
    top: '50%',
    left: '30%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(34, 211, 238, 0.05)',
  },
  violetBlob2: {
    position: 'absolute',
    bottom: '30%',
    right: '20%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  versionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: AURA_COLORS.glass.surface,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  versionText: {
    fontSize: 10,
    color: AURA_COLORS.text.muted,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDotContainer: {
    position: 'relative',
    width: 8,
    height: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusDotPing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    opacity: 0.5,
  },
  statusText: {
    fontSize: 10,
    color: AURA_COLORS.text.muted,
    fontWeight: '500',
  },

  // Module Cards
  moduleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  moduleCard: {
    flex: 1,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.xl,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    padding: 16,
    ...AURA_SHADOWS.subtle,
  },
  moduleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  moduleIcon: {
    fontSize: 20,
  },
  moduleContent: {},
  moduleLabel: {
    fontSize: 9,
    color: AURA_COLORS.text.subtle,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  moduleMetric: {
    fontSize: 12,
    color: AURA_COLORS.neon.cyan,
    marginTop: 4,
    fontWeight: '500',
  },

  // Stats Bar
  statsBarContainer: {
    marginBottom: 20,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: AURA_RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...AURA_SHADOWS.neonCyan,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.neon.cyan,
  },
  statLabel: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AURA_COLORS.neon.cyan,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: AURA_COLORS.neon.cyan,
    letterSpacing: 1,
  },

  // CHIEF Card
  chiefContainer: {
    marginBottom: 20,
  },
  chiefCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    ...AURA_SHADOWS.neonAmber,
  },
  chiefGradient: {
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  orbitContainer: {
    position: 'absolute',
    left: -80,
    top: '50%',
    transform: [{ translateY: -100 }],
  },
  orbitRing1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
  },
  orbitRing2: {
    position: 'absolute',
    left: 20,
    top: 20,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  orbitRing3: {
    position: 'absolute',
    left: 40,
    top: 40,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  glowDot1: {
    position: 'absolute',
    left: 60,
    top: 30,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(251, 191, 36, 0.6)',
  },
  glowDot2: {
    position: 'absolute',
    left: 100,
    top: 100,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(251, 191, 36, 0.5)',
  },
  glowDot3: {
    position: 'absolute',
    left: 40,
    top: 140,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(251, 191, 36, 0.7)',
  },
  chiefContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 10,
  },
  chiefLeft: {
    flex: 1,
  },
  chiefBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  chiefGlowRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chiefGlowCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fbbf24',
  },
  chiefBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(251, 191, 36, 0.8)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  chiefTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fef3c7',
    marginBottom: 4,
  },
  chiefSubtitle: {
    fontSize: 14,
    color: 'rgba(251, 191, 36, 0.7)',
    marginBottom: 16,
  },
  agentPills: {
    flexDirection: 'row',
    gap: 10,
  },
  agentPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  agentPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fde68a',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chiefRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  chiefMetric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  chiefMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fde68a',
  },
  chiefMetricLabel: {
    fontSize: 10,
    color: AURA_COLORS.text.muted,
  },
  chiefBottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },

  // Feature Cards
  featureRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.xl,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    padding: 16,
    ...AURA_SHADOWS.subtle,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 18,
  },
  featureLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: AURA_COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featureTrend: {
    fontSize: 10,
    fontWeight: '600',
  },
  featureMetric: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  featureProgressBg: {
    height: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  featureProgress: {
    height: '100%',
    borderRadius: 3,
  },
  featureProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  featureProgressLabel: {
    fontSize: 9,
    color: AURA_COLORS.text.subtle,
  },

  // Bottom Dock
  dockContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 32,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.glass,
  },
  dockItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dockItemActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
  },
  dockItemGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  dockIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  dockIconActive: {
    opacity: 1,
  },
});

