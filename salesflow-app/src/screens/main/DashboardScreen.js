/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - DASHBOARD SCREEN                                                ║
 * ║  HIGH-END DARK GLASSMORPHISM DESIGN                                        ║
 * ║  Premium Sci-Fi Interface inspired by Linear, Bloomberg Terminal           ║
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
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../services/apiConfig';
import { CoachOverlay } from '../../components/live-assist';
import { ChatImportModal } from '../../components/chat-import';
import { CustomerRetentionWidget } from '../../components/retention';
import { CompanyBanner, ZinzinoQuickInfo } from '../../components/branding';
import { AutopilotWidget } from '../../components/autopilot';
import { BrainWidget } from '../../components/autonomous';
import { UpgradeBanner } from '../../components/billing';
import { useToast, LanguageSwitcher } from '../../components/ui';
import { SkeletonStatsCard } from '../../components/ui/Skeleton';
import { 
  AuraLogo, 
  GlassCard, 
  NeonBadge,
  AURA_COLORS,
  AURA_SHADOWS,
} from '../../components/aura';

// Import i18n config
import '../../i18n';

// API URL aus zentraler Config
const getBaseUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

// ═══════════════════════════════════════════════════════════════════════════
// GLASS STAT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const GlassStatCard = ({ value, label, color, trend }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  return (
    <Pressable 
      style={styles.glassStatCard}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {/* Accent Line */}
        <View style={[styles.statAccentLine, { backgroundColor: color }]} />
        <Text style={[styles.glassStatValue, { color }]}>{value}</Text>
        <Text style={styles.glassStatLabel}>{label}</Text>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? AURA_COLORS.neon.greenSubtle : AURA_COLORS.neon.roseSubtle }]}>
            <Text style={[styles.trendText, { color: trend > 0 ? AURA_COLORS.neon.green : AURA_COLORS.neon.rose }]}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// GLASS ACTION CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const GlassActionCard = ({ icon, title, description, color, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
        ]).start();
      }}
      onPressOut={() => {
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
        ]).start();
      }}
      style={styles.actionCardWrapper}
    >
      <Animated.View style={[styles.glassActionCard, { transform: [{ scale: scaleAnim }] }]}>
        {/* Glow Effect on Press */}
        <Animated.View 
          style={[
            styles.actionGlow, 
            { 
              backgroundColor: color,
              opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] })
            }
          ]} 
        />
        
        {/* Accent Border */}
        <View style={[styles.actionAccent, { backgroundColor: color }]} />
        
        {/* Content */}
        <View style={styles.actionContent}>
          <View style={[styles.actionIconContainer, { backgroundColor: color + '20' }]}>
            <Text style={styles.actionIcon}>{icon}</Text>
          </View>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function DashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, profile, signOut, companySlug, firstName, isFounder, hasAutopilotAccess } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chatImportModalVisible, setChatImportModalVisible] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    openFollowUps: 5,
    todayTasks: 3,
    totalLeads: 12,
    conversionRate: 24
  });

  const fetchStats = async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/health`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.log('API not available');
    }
  };

  const fetchDashboardData = async () => {
    if (!stats) return;
    
    try {
      const leadsResponse = await fetch(`${API_CONFIG.baseUrl}/leads?user_id=${user?.id || ''}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json();
        const leads = leadsData.leads || leadsData || [];
        setDashboardData(prev => ({ ...prev, totalLeads: leads.length }));
      }

      const followUpsResponse = await fetch(`${API_CONFIG.baseUrl}/follow-ups?user_id=${user?.id || ''}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (followUpsResponse.ok) {
        const followUpsData = await followUpsResponse.json();
        const followUps = followUpsData.follow_ups || followUpsData || [];
        const openFollowUps = followUps.filter(f => !f.completed).length;
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = followUps.filter(f => !f.completed && f.due_date === today).length;
        setDashboardData(prev => ({ ...prev, openFollowUps, todayTasks }));
      }
    } catch (error) {
      // Silent error handling
    }
  };

  useEffect(() => { 
    const loadInitialData = async () => {
      setIsLoading(true);
      await Promise.all([fetchStats(), fetchDashboardData()]);
      setIsLoading(false);
    };
    loadInitialData();
  }, []);

  const onRefresh = async () => { 
    setRefreshing(true); 
    try {
      await Promise.all([fetchStats(), fetchDashboardData()]);
      toast.success(t('common.updated'), t('common.dashboard_reloaded'));
    } catch (e) {
      toast.error(t('common.error'), t('common.could_not_load'));
    }
    setRefreshing(false); 
  };

  // Quick Actions mit i18n
  const quickActions = [
    { icon: '✨', titleKey: 'actions.aura_dashboard', screen: 'AuraOsDashboard', color: AURA_COLORS.neon.cyan, descKey: 'actions.aura_dashboard_desc' },
    { icon: '🤖', titleKey: 'actions.autopilot', screen: 'AutopilotSettings', color: AURA_COLORS.neon.amber, descKey: 'actions.autopilot_desc' },
    { icon: '💬', titleKey: 'actions.ai_chat', screen: 'Chat', color: AURA_COLORS.neon.cyan, descKey: 'actions.ai_chat_desc' },
    { icon: '📬', titleKey: 'actions.sequences', screen: 'Sequences', color: AURA_COLORS.neon.rose, descKey: 'actions.sequences_desc' },
    { icon: '📧', titleKey: 'actions.email_accounts', screen: 'EmailAccounts', color: AURA_COLORS.neon.purple, descKey: 'actions.email_accounts_desc' },
    { icon: '📱', titleKey: 'actions.outreach', screen: 'Outreach', color: '#f97316', descKey: 'actions.outreach_desc' },
    { icon: '👻', titleKey: 'actions.ghosts', screen: 'GhostBuster', color: AURA_COLORS.neon.purple, descKey: 'actions.ghosts_desc' },
    { icon: '💰', titleKey: 'actions.finance', screen: 'Finance', color: AURA_COLORS.neon.green, descKey: 'actions.finance_desc' },
    { icon: '👥', titleKey: 'actions.leads', screen: 'Leads', color: AURA_COLORS.neon.cyan, descKey: 'actions.leads_desc' },
    { icon: '📥', titleKey: 'actions.import', screen: 'DataImport', color: AURA_COLORS.neon.blue, descKey: 'actions.import_desc' },
    { icon: '📋', titleKey: 'actions.followups', screen: 'FollowUps', color: AURA_COLORS.neon.amber, descKey: 'actions.followups_desc' },
    { icon: '📚', titleKey: 'actions.playbooks', screen: 'Playbooks', color: AURA_COLORS.neon.purple, descKey: 'actions.playbooks_desc' },
    { icon: '📊', titleKey: 'actions.analytics', screen: 'AnalyticsDashboard', color: AURA_COLORS.neon.cyan, descKey: 'actions.analytics_desc' },
  ];
  
  // Admin Actions
  const adminActions = [
    { icon: '🔒', titleKey: 'actions.security', screen: 'SecurityDashboard', color: AURA_COLORS.neon.rose, descKey: 'actions.security_desc' },
    { icon: '⚖️', titleKey: 'actions.compliance', screen: 'ComplianceReport', color: AURA_COLORS.neon.green, descKey: 'actions.compliance_desc' },
    { icon: '🧪', titleKey: 'actions.ab_tests', screen: 'ABTestDashboard', color: AURA_COLORS.neon.purple, descKey: 'actions.ab_tests_desc' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetings.morning');
    if (hour < 18) return t('greetings.afternoon');
    return t('greetings.evening');
  };

  const getUserName = () => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.first_name) return `${profile.first_name} ${profile.last_name || ''}`.trim();
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.user_metadata?.first_name) return user.user_metadata.first_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Sales Pro';
  };

  return (
    <View style={styles.rootContainer}>
      {/* ═══════════════════════════════════════════════════════════════════════════
          AMBIENT BACKGROUND BLOBS
          ═══════════════════════════════════════════════════════════════════════════ */}
      <View style={styles.ambientBackground}>
        <View style={styles.cyanBlob} />
        <View style={styles.purpleBlob} />
        <View style={styles.amberBlob} />
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={AURA_COLORS.neon.cyan}
            colors={[AURA_COLORS.neon.cyan]}
          />
        }
      >
        {/* ═══════════════════════════════════════════════════════════════════════════
            HEADER WITH AURA OS LOGO
            ═══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <AuraLogo size="sm" />
            <View style={styles.headerRight}>
              <LanguageSwitcher variant="minimal" />
              <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
                <Text style={styles.logoutText}>{t('common.logout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerGreeting}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{getUserName()}</Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════════
            UPGRADE BANNER - TEST ZAHLUNG
            ═══════════════════════════════════════════════════════════════════════════ */}
        <UpgradeBanner />

        {/* ═══════════════════════════════════════════════════════════════════════════
            STATS CARDS - GLASSMORPHISM
            ═══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.statsContainer}>
          <GlassStatCard 
            value={dashboardData.todayTasks} 
            label={t('dashboard.today')} 
            color={AURA_COLORS.neon.cyan}
            trend={12}
          />
          <GlassStatCard 
            value={dashboardData.openFollowUps} 
            label={t('dashboard.open')} 
            color={AURA_COLORS.neon.amber}
          />
          <GlassStatCard 
            value={dashboardData.totalLeads} 
            label={t('dashboard.leads')} 
            color={AURA_COLORS.neon.purple}
            trend={8}
          />
          <GlassStatCard 
            value={`${dashboardData.conversionRate}%`} 
            label={t('dashboard.conversion')} 
            color={AURA_COLORS.neon.green}
            trend={5}
          />
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════════
            SYSTEM STATUS - GLASS CARD
            ═══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.statusCardContainer}>
          <View style={styles.glassCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>{t('dashboard.system_status')}</Text>
              <NeonBadge 
                text={stats ? 'ONLINE' : 'DEMO MODE'} 
                variant={stats ? 'green' : 'amber'} 
                pulse={true}
              />
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: stats ? AURA_COLORS.neon.green : AURA_COLORS.neon.amber }]} />
              <Text style={styles.statusValue}>
                {stats ? t('dashboard.backend_connected') : t('dashboard.backend_offline')}
              </Text>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════════
            AUTOPILOT WIDGET - NUR FÜR GRÜNDER / PREMIUM USER
            ═══════════════════════════════════════════════════════════════════════════ */}
        {hasAutopilotAccess ? (
          // VOLLER ZUGANG - Gründer sieht das komplette Autopilot Widget
          <View style={styles.autopilotContainer}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('AutopilotSettings')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.15)', 'rgba(15, 23, 42, 0.9)', 'rgba(15, 23, 42, 0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.autopilotCard}
              >
                {/* Background Glow */}
                <View style={styles.autopilotGlow} />
                
                {/* Founder Badge */}
                {isFounder && (
                  <View style={styles.founderBadge}>
                    <Text style={styles.founderBadgeText}>👑 FOUNDER ACCESS</Text>
                  </View>
                )}
                
                <View style={styles.autopilotHeader}>
                  <View>
                    <View style={styles.autopilotTitleRow}>
                      <Text style={styles.autopilotPulse}>●</Text>
                      <Text style={styles.autopilotTitle}>CHIEF Autopilot</Text>
                    </View>
                    <Text style={styles.autopilotSubtitle}>System läuft autonom • Genehmigung erforderlich</Text>
                  </View>
                  <View style={styles.autopilotBadge}>
                    <Text style={styles.autopilotBadgeText}>LIVE MODE</Text>
                  </View>
                </View>

                {/* Autopilot Stats */}
                <View style={styles.autopilotStats}>
                  <View style={styles.autopilotStatItem}>
                    <Text style={styles.autopilotStatValue}>24</Text>
                    <Text style={styles.autopilotStatLabel}>Messages</Text>
                  </View>
                  <View style={styles.autopilotStatDivider} />
                  <View style={styles.autopilotStatItem}>
                    <Text style={styles.autopilotStatValue}>3</Text>
                    <Text style={styles.autopilotStatLabel}>Pending</Text>
                  </View>
                  <View style={styles.autopilotStatDivider} />
                  <View style={styles.autopilotStatItem}>
                    <Text style={styles.autopilotStatValue}>98%</Text>
                    <Text style={styles.autopilotStatLabel}>Accuracy</Text>
                  </View>
                </View>

                {/* Mode Chips */}
                <View style={styles.modeChips}>
                  {['Hunter', 'Closer', 'Supporter'].map((mode, idx) => (
                    <View key={mode} style={[styles.modeChip, idx === 0 && styles.modeChipActive]}>
                      <Text style={[styles.modeChipText, idx === 0 && styles.modeChipTextActive]}>{mode}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          // TEASER - Normale User sehen "Coming Soon"
          <View style={styles.autopilotContainer}>
            <View style={styles.autopilotTeaser}>
              <View style={styles.autopilotTeaserIcon}>
                <Text style={styles.autopilotTeaserEmoji}>🤖</Text>
              </View>
              <Text style={styles.autopilotTeaserTitle}>CHIEF Autopilot</Text>
              <Text style={styles.autopilotTeaserSubtitle}>
                Automatische Antworten, Ghost-Buster & Smart Sequences
              </Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>🚀 Coming Soon</Text>
              </View>
              <Text style={styles.autopilotTeaserHint}>
                Als einer der Ersten informiert werden?
              </Text>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════
            CHAT IMPORT - GLASS CARD
            ═══════════════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity 
          style={styles.chatImportCard}
          onPress={() => setChatImportModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.chatImportLeft}>
            <View style={styles.chatImportIconContainer}>
              <Text style={styles.chatImportIcon}>📥</Text>
            </View>
            <View>
              <Text style={styles.chatImportTitle}>{t('dashboard.chat_import')}</Text>
              <Text style={styles.chatImportDescription}>
                {t('dashboard.chat_import_platforms')}
              </Text>
            </View>
          </View>
          <Text style={styles.chatImportArrow}>→</Text>
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════════════════════════
            QUICK ACTIONS GRID - GLASSMORPHISM
            ═══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('dashboard.quick_actions')}</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <GlassActionCard
                key={index}
                icon={action.icon}
                title={t(action.titleKey)}
                description={t(action.descKey)}
                color={action.color}
                onPress={() => navigation.navigate(action.screen)}
              />
            ))}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════════
            ADMIN TOOLS - GLASS CARDS
            ═══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('dashboard.admin_tools')}</Text>
          <View style={styles.adminGrid}>
            {adminActions.map((action, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.adminCard, { borderColor: action.color + '50' }]}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.8}
              >
                <View style={[styles.adminIconBg, { backgroundColor: action.color + '20' }]}>
                  <Text style={styles.adminIcon}>{action.icon}</Text>
                </View>
                <View style={styles.adminTextContainer}>
                  <Text style={[styles.adminTitle, { color: action.color }]}>{t(action.titleKey)}</Text>
                  <Text style={styles.adminDescription}>{t(action.descKey)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════════
            DAILY TIP - GLASS CARD
            ═══════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.tipContainer}>
          <LinearGradient
            colors={['rgba(34, 211, 238, 0.1)', 'rgba(15, 23, 42, 0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tipCard}
          >
            <View style={styles.tipIconRow}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipLabel}>{t('dashboard.daily_tip')}</Text>
            </View>
            <Text style={styles.tipText}>{t('dashboard.daily_tip_text')}</Text>
            <TouchableOpacity 
              style={styles.tipButton}
              onPress={() => navigation.navigate('Chat')}
            >
              <Text style={styles.tipButtonText}>{t('dashboard.try_now')} →</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Coach Overlay */}
      <CoachOverlay
        userId={user?.id || 'demo-user'}
        companyId={user?.user_metadata?.company_id || 'demo-company'}
        companyName={user?.user_metadata?.company_name || 'Dein Team'}
        vertical={user?.user_metadata?.vertical || 'network_marketing'}
        position="bottom-right"
        initialMinimized={true}
        onApplyTip={(tip) => {
          if (tip.action_type === 'training') navigation.navigate('Playbooks');
          else if (tip.action_type === 'follow_up') navigation.navigate('FollowUps');
        }}
        onDismissTip={(tipId) => console.log('Tip dismissed:', tipId)}
      />

      {/* Chat Import Modal */}
      <ChatImportModal
        visible={chatImportModalVisible}
        onClose={() => setChatImportModalVisible(false)}
        onSuccess={(result) => {
          fetchDashboardData();
          Alert.alert(
            t('dashboard.lead_imported'),
            result.message || t('dashboard.chat_analyzed'),
            [{ text: t('dashboard.go_to_leads'), onPress: () => navigation.navigate('Leads') }]
          );
        }}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES - HIGH-END DARK GLASSMORPHISM
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // Root & Background
  rootContainer: { 
    flex: 1, 
    backgroundColor: AURA_COLORS.bg.primary,
  },
  ambientBackground: {
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
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
  },
  purpleBlob: {
    position: 'absolute',
    bottom: 100,
    right: -150,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
  },
  amberBlob: {
    position: 'absolute',
    top: '40%',
    left: '30%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
  },
  container: { 
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: { 
    padding: 24, 
    paddingTop: 60, 
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerGreeting: {
    marginTop: 4,
  },
  greeting: { 
    fontSize: 16, 
    color: AURA_COLORS.text.muted,
  },
  userName: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: AURA_COLORS.text.primary, 
    marginTop: 4,
    letterSpacing: -0.5,
  },
  logoutButton: { 
    backgroundColor: AURA_COLORS.glass.surface, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  logoutText: { 
    color: AURA_COLORS.text.secondary, 
    fontWeight: '600',
    fontSize: 13,
  },

  // Stats Container
  statsContainer: { 
    flexDirection: 'row', 
    marginHorizontal: 16, 
    gap: 10,
  },
  glassStatCard: {
    flex: 1,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    overflow: 'hidden',
    ...AURA_SHADOWS.subtle,
  },
  statAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  glassStatValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  glassStatLabel: {
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendBadge: {
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Status Card
  statusCardContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  glassCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.glass,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: AURA_COLORS.text.primary,
  },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  statusDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 10,
  },
  statusValue: { 
    color: AURA_COLORS.text.secondary, 
    fontWeight: '500',
    fontSize: 14,
  },

  // Autopilot Card
  autopilotContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  autopilotCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    overflow: 'hidden',
    ...AURA_SHADOWS.neonAmber,
  },
  autopilotGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  autopilotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  autopilotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autopilotPulse: {
    color: AURA_COLORS.neon.amber,
    fontSize: 12,
  },
  autopilotTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  autopilotSubtitle: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
  },
  autopilotBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  autopilotBadgeText: {
    color: AURA_COLORS.neon.amber,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  autopilotStats: {
    flexDirection: 'row',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: AURA_COLORS.glass.border,
  },
  autopilotStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  autopilotStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  autopilotStatLabel: {
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  autopilotStatDivider: {
    width: 1,
    backgroundColor: AURA_COLORS.glass.border,
    marginHorizontal: 10,
  },
  modeChips: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    backgroundColor: AURA_COLORS.glass.surface,
  },
  modeChipActive: {
    borderColor: AURA_COLORS.neon.amber,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: AURA_COLORS.text.muted,
  },
  modeChipTextActive: {
    color: AURA_COLORS.neon.amber,
  },
  
  // Founder Badge
  founderBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: AURA_COLORS.neon.purple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 20,
  },
  founderBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // Autopilot Teaser (für nicht-Premium User)
  autopilotTeaser: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    alignItems: 'center',
  },
  autopilotTeaserIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  autopilotTeaserEmoji: {
    fontSize: 32,
  },
  autopilotTeaserTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
  },
  autopilotTeaserSubtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 280,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  comingSoonText: {
    color: AURA_COLORS.neon.cyan,
    fontSize: 13,
    fontWeight: '600',
  },
  autopilotTeaserHint: {
    fontSize: 12,
    color: AURA_COLORS.text.subtle,
  },

  // Chat Import
  chatImportCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.glass.surface,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    ...AURA_SHADOWS.neonCyan,
  },
  chatImportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chatImportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: AURA_COLORS.neon.cyanSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatImportIcon: {
    fontSize: 24,
  },
  chatImportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  chatImportDescription: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  chatImportArrow: {
    fontSize: 20,
    color: AURA_COLORS.neon.cyan,
    fontWeight: '600',
  },

  // Section
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 16,
    color: AURA_COLORS.text.primary,
    letterSpacing: -0.3,
  },

  // Actions Grid
  actionsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCardWrapper: {
    width: '48%',
  },
  glassActionCard: { 
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    overflow: 'hidden',
    minHeight: 140,
    ...AURA_SHADOWS.subtle,
  },
  actionGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  actionAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  actionContent: {
    position: 'relative',
    zIndex: 10,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionIcon: { 
    fontSize: 22,
  },
  actionTitle: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: AURA_COLORS.text.primary,
  },
  actionDescription: { 
    fontSize: 12, 
    color: AURA_COLORS.text.muted, 
    marginTop: 4,
    lineHeight: 16,
  },

  // Admin Grid
  adminGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  adminCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: AURA_COLORS.glass.surface,
    gap: 12,
  },
  adminIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminIcon: {
    fontSize: 20,
  },
  adminTextContainer: {
    flex: 1,
  },
  adminTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  adminDescription: {
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },

  // Tip Card
  tipContainer: {
    marginHorizontal: 16,
    marginTop: 32,
  },
  tipCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  tipIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipIcon: {
    fontSize: 20,
  },
  tipLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: AURA_COLORS.neon.cyan,
  },
  tipText: { 
    fontSize: 14, 
    color: AURA_COLORS.text.secondary, 
    lineHeight: 22,
  },
  tipButton: { 
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  tipButtonText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: AURA_COLORS.neon.cyan,
  },

  bottomSpacer: { 
    height: 120,
  },
});
