/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMPANY BANNER                                                            ║
 * ║  Elegantes, modernes Design für Company-Branding                           ║
 * ║  Mit i18n-Integration für globale Unterstützung                            ║
 * ║  - Standard: Sales Flow Copilot mit Quick Actions                          ║
 * ║  - Spezifisch: Zinzino, PM-International, etc.                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { AURA_COLORS, AURA_SHADOWS, AURA_RADIUS } from '../aura/theme';
import { AuraLogo } from '../aura/AuraLogo';

// ═══════════════════════════════════════════════════════════════════════════
// COMPANY CONFIGURATIONS (mit Translation-Keys statt harten Texten)
// ═══════════════════════════════════════════════════════════════════════════

interface QuickAction {
  icon: string;
  labelKey: string; // Translation Key statt hartem Text
  action: string;
}

interface CompanyConfig {
  nameKey: string;      // Translation Key
  taglineKey: string;   // Translation Key
  colors: string[];
  accentColor: string;
  icon: string;
  quickLinks: { labelKey: string; url: string }[];
  quickActions: QuickAction[];
  featureKeys: string[]; // Translation Keys
  tipKeys: string[];     // Translation Keys
}

const COMPANY_CONFIGS: Record<string, CompanyConfig> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // AURA OS - Standard Edition (für alle ohne spezifisches Network)
  // ═══════════════════════════════════════════════════════════════════════════
  default: {
    nameKey: 'editions.aura.name',
    taglineKey: 'editions.aura.tagline',
    colors: [AURA_COLORS.bg.primary, AURA_COLORS.bg.secondary],
    accentColor: AURA_COLORS.neon.cyan,
    icon: 'aura', // Special: Zeigt AuraLogo statt Emoji
    quickLinks: [],
    quickActions: [
      { icon: '💬', labelKey: 'actions.ask_chief', action: 'Chat' },
      { icon: '📋', labelKey: 'actions.playbooks', action: 'Playbooks' },
      { icon: '✨', labelKey: 'actions.templates', action: 'Templates' },
      { icon: '📊', labelKey: 'actions.analytics', action: 'Analytics' },
    ],
    featureKeys: [
      'editions.default.features.messages',
      'editions.default.features.analytics',
      'editions.default.features.ai_support',
      'editions.default.features.automation',
    ],
    tipKeys: [
      'editions.default.tips.tip1',
      'editions.default.tips.tip2',
      'editions.default.tips.tip3',
      'editions.default.tips.tip4',
      'editions.default.tips.tip5',
    ],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ZINZINO
  // ═══════════════════════════════════════════════════════════════════════════
  zinzino: {
    nameKey: 'editions.zinzino.name',
    taglineKey: 'editions.zinzino.tagline',
    colors: ['#1E3A5F', '#0F4C81'],
    accentColor: '#38BDF8',
    icon: '🧬',
    quickLinks: [
      { labelKey: '📊 BalanceTest', url: 'https://www.zinzino.com/balance-test' },
      { labelKey: '💰 Comp Plan', url: 'https://www.zinzino.com/compensation-plan' },
      { labelKey: '📚 Produkte', url: 'https://www.zinzino.com/products' },
    ],
    quickActions: [
      { icon: '🧬', labelKey: 'editions.zinzino.quick_questions.balance_test', action: 'Chat' },
      { icon: '💰', labelKey: 'actions.stats', action: 'Chat' },
      { icon: '📋', labelKey: 'actions.playbooks', action: 'Playbooks' },
      { icon: '👥', labelKey: 'actions.team', action: 'TeamLeader' },
    ],
    featureKeys: [
      'editions.zinzino.features.balance_test',
      'editions.zinzino.features.omega_ratio',
      'editions.zinzino.features.products',
      'editions.zinzino.features.comp_plan',
    ],
    tipKeys: [
      'editions.zinzino.tips.tip1',
      'editions.zinzino.tips.tip2',
      'editions.zinzino.tips.tip3',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PM-INTERNATIONAL
  // ═══════════════════════════════════════════════════════════════════════════
  'pm-international': {
    nameKey: 'editions.pm_international.name',
    taglineKey: 'editions.pm_international.tagline',
    colors: ['#1E40AF', '#1D4ED8'],
    accentColor: '#60A5FA',
    icon: '💪',
    quickLinks: [
      { labelKey: '🏆 Top-Produkte', url: 'https://www.pm-international.com' },
      { labelKey: '📈 Karriere', url: 'https://www.pm-international.com/career' },
    ],
    quickActions: [
      { icon: '💪', labelKey: 'editions.pm_international.features.products', action: 'Chat' },
      { icon: '📋', labelKey: 'actions.playbooks', action: 'Playbooks' },
      { icon: '👥', labelKey: 'actions.team', action: 'TeamLeader' },
      { icon: '📊', labelKey: 'actions.stats', action: 'Analytics' },
    ],
    featureKeys: [
      'editions.pm_international.features.products',
      'editions.pm_international.features.tracking',
      'editions.pm_international.features.team_building',
    ],
    tipKeys: [
      'editions.pm_international.tips.tip1',
      'editions.pm_international.tips.tip2',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LR HEALTH & BEAUTY
  // ═══════════════════════════════════════════════════════════════════════════
  'lr-health-beauty': {
    nameKey: 'editions.lr_health_beauty.name',
    taglineKey: 'editions.lr_health_beauty.tagline',
    colors: ['#065F46', '#047857'],
    accentColor: '#34D399',
    icon: '🌿',
    quickLinks: [
      { labelKey: '💄 Beauty', url: 'https://www.lrworld.com' },
      { labelKey: '💪 Health', url: 'https://www.lrworld.com' },
    ],
    quickActions: [
      { icon: '🌿', labelKey: 'editions.lr_health_beauty.features.beauty', action: 'Chat' },
      { icon: '📋', labelKey: 'actions.playbooks', action: 'Playbooks' },
      { icon: '👥', labelKey: 'actions.team', action: 'TeamLeader' },
      { icon: '📊', labelKey: 'actions.stats', action: 'Analytics' },
    ],
    featureKeys: [
      'editions.lr_health_beauty.features.beauty',
      'editions.lr_health_beauty.features.supplements',
      'editions.lr_health_beauty.features.gifts',
    ],
    tipKeys: [
      'editions.lr_health_beauty.tips.tip1',
      'editions.lr_health_beauty.tips.tip2',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOTERRA
  // ═══════════════════════════════════════════════════════════════════════════
  doterra: {
    nameKey: 'editions.doterra.name',
    taglineKey: 'editions.doterra.tagline',
    colors: ['#5B21B6', '#7C3AED'],
    accentColor: '#A78BFA',
    icon: '🌸',
    quickLinks: [
      { labelKey: '🌿 Öle', url: 'https://www.doterra.com' },
      { labelKey: '📖 Wellness', url: 'https://www.doterra.com' },
    ],
    quickActions: [
      { icon: '🌸', labelKey: 'editions.doterra.features.oils', action: 'Chat' },
      { icon: '📋', labelKey: 'actions.playbooks', action: 'Playbooks' },
      { icon: '👥', labelKey: 'actions.team', action: 'TeamLeader' },
      { icon: '📊', labelKey: 'actions.stats', action: 'Analytics' },
    ],
    featureKeys: [
      'editions.doterra.features.oils',
      'editions.doterra.features.wellness',
      'editions.doterra.features.tips',
    ],
    tipKeys: [
      'editions.doterra.tips.tip1',
      'editions.doterra.tips.tip2',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AURA OS | B2B EDITION
  // ═══════════════════════════════════════════════════════════════════════════
  'b2b_sales': {
    nameKey: 'editions.aura.name',
    taglineKey: 'editions.b2b.tagline',
    colors: [AURA_COLORS.bg.primary, '#1E3A5F'],
    accentColor: '#3B82F6',
    icon: 'aura',
    quickLinks: [],
    quickActions: [
      { icon: '📊', labelKey: 'editions.b2b.actions.roi_calculator', action: 'Chat' },
      { icon: '🎯', labelKey: 'editions.b2b.actions.stakeholder', action: 'Chat' },
      { icon: '📋', labelKey: 'actions.playbooks', action: 'Playbooks' },
      { icon: '💼', labelKey: 'editions.b2b.actions.pipeline', action: 'Analytics' },
    ],
    featureKeys: [
      'editions.b2b.features.roi',
      'editions.b2b.features.value_selling',
      'editions.b2b.features.enterprise',
      'editions.b2b.features.stakeholder',
    ],
    tipKeys: [
      'editions.b2b.tips.tip1',
      'editions.b2b.tips.tip2',
      'editions.b2b.tips.tip3',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AURA OS | NETWORK PRO EDITION
  // ═══════════════════════════════════════════════════════════════════════════
  'network_marketing': {
    nameKey: 'editions.aura.name',
    taglineKey: 'editions.network_pro.tagline',
    colors: [AURA_COLORS.bg.primary, '#3B0764'],
    accentColor: '#8B5CF6',
    icon: 'aura',
    quickLinks: [],
    quickActions: [
      { icon: '🚀', labelKey: 'editions.network_pro.actions.duplication', action: 'Chat' },
      { icon: '📈', labelKey: 'editions.network_pro.actions.rank', action: 'Analytics' },
      { icon: '👥', labelKey: 'actions.team', action: 'TeamLeader' },
      { icon: '📋', labelKey: 'actions.playbooks', action: 'Playbooks' },
    ],
    featureKeys: [
      'editions.network_pro.features.duplication',
      'editions.network_pro.features.rank_tracking',
      'editions.network_pro.features.team_building',
      'editions.network_pro.features.events',
    ],
    tipKeys: [
      'editions.network_pro.tips.tip1',
      'editions.network_pro.tips.tip2',
      'editions.network_pro.tips.tip3',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AURA OS | MAKLER EDITION
  // ═══════════════════════════════════════════════════════════════════════════
  'real_estate': {
    nameKey: 'editions.aura.name',
    taglineKey: 'editions.makler.tagline',
    colors: [AURA_COLORS.bg.primary, '#064E3B'],
    accentColor: '#10B981',
    icon: 'aura',
    quickLinks: [],
    quickActions: [
      { icon: '📝', labelKey: 'editions.makler.actions.expose', action: 'Chat' },
      { icon: '🏠', labelKey: 'editions.makler.actions.objects', action: 'Leads' },
      { icon: '👤', labelKey: 'editions.makler.actions.qualify', action: 'Chat' },
      { icon: '📊', labelKey: 'actions.analytics', action: 'Analytics' },
    ],
    featureKeys: [
      'editions.makler.features.expose_generator',
      'editions.makler.features.lead_scoring',
      'editions.makler.features.object_management',
      'editions.makler.features.acquisition',
    ],
    tipKeys: [
      'editions.makler.tips.tip1',
      'editions.makler.tips.tip2',
      'editions.makler.tips.tip3',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AURA OS | COACHING EDITION
  // ═══════════════════════════════════════════════════════════════════════════
  'coaching': {
    nameKey: 'editions.aura.name',
    taglineKey: 'editions.coaching.tagline',
    colors: [AURA_COLORS.bg.primary, '#78350F'],
    accentColor: '#F59E0B',
    icon: 'aura',
    quickLinks: [],
    quickActions: [
      { icon: '🎯', labelKey: 'editions.coaching.actions.discovery', action: 'Chat' },
      { icon: '💎', labelKey: 'editions.coaching.actions.high_ticket', action: 'Chat' },
      { icon: '📋', labelKey: 'actions.playbooks', action: 'Playbooks' },
      { icon: '📊', labelKey: 'actions.analytics', action: 'Analytics' },
    ],
    featureKeys: [
      'editions.coaching.features.high_ticket',
      'editions.coaching.features.discovery',
      'editions.coaching.features.retention',
      'editions.coaching.features.upselling',
    ],
    tipKeys: [
      'editions.coaching.tips.tip1',
      'editions.coaching.tips.tip2',
      'editions.coaching.tips.tip3',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AURA OS | FINANCE EDITION
  // ═══════════════════════════════════════════════════════════════════════════
  'finance': {
    nameKey: 'editions.aura.name',
    taglineKey: 'editions.finance.tagline',
    colors: [AURA_COLORS.bg.primary, '#164E63'],
    accentColor: '#06B6D4',
    icon: 'aura',
    quickLinks: [],
    quickActions: [
      { icon: '📊', labelKey: 'editions.finance.actions.analysis', action: 'Chat' },
      { icon: '🛡️', labelKey: 'editions.finance.actions.compliance', action: 'Chat' },
      { icon: '🌟', labelKey: 'editions.finance.actions.referral', action: 'Chat' },
      { icon: '📋', labelKey: 'actions.playbooks', action: 'Playbooks' },
    ],
    featureKeys: [
      'editions.finance.features.consulting',
      'editions.finance.features.referral',
      'editions.finance.features.compliance',
      'editions.finance.features.planning',
    ],
    tipKeys: [
      'editions.finance.tips.tip1',
      'editions.finance.tips.tip2',
      'editions.finance.tips.tip3',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  companySlug: string;
  showQuickLinks?: boolean;
  showQuickActions?: boolean;
  showDailyTip?: boolean;
  showFeatures?: boolean;
  onActionPress?: (action: string) => void;
  onFeaturePress?: (feature: string) => void;
  userName?: string;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPANY BANNER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function CompanyBanner({ 
  companySlug, 
  showQuickLinks = true,
  showQuickActions = true,
  showDailyTip = true,
  showFeatures = false,
  onActionPress,
  onFeaturePress,
  userName,
  compact = false,
}: Props) {
  const { t } = useTranslation();
  const config = COMPANY_CONFIGS[companySlug] || COMPANY_CONFIGS.default;
  const isDefault = !COMPANY_CONFIGS[companySlug] || companySlug === 'default';
  
  // Random daily tip mit Translation
  const [dailyTip] = useState(() => {
    const tipIndex = Math.floor(Math.random() * config.tipKeys.length);
    return config.tipKeys[tipIndex];
  });
  
  // Subtle pulse animation for icon
  const [pulseAnim] = useState(new Animated.Value(1));
  
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);
  
  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(err => console.warn('Link error:', err));
  };
  
  const handleActionPress = (action: string) => {
    if (action.startsWith('url:')) {
      handleLinkPress(action.replace('url:', ''));
    } else {
      onActionPress?.(action);
    }
  };

  // Compact version for smaller spaces
  if (compact) {
    return (
      <LinearGradient
        colors={config.colors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.compactContainer}
      >
        <View style={styles.compactContent}>
          <Text style={styles.compactIcon}>{config.icon}</Text>
          <View style={styles.compactText}>
            <Text style={styles.compactName}>{t(config.nameKey)}</Text>
            <Text style={styles.compactTagline}>{t(config.taglineKey)}</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Main Banner */}
      <LinearGradient
        colors={config.colors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        
        {/* Header */}
        <View style={styles.header}>
          <Animated.View style={[
            styles.iconContainer,
            { transform: [{ scale: pulseAnim }] },
            isDefault && styles.auraIconContainer,
          ]}>
            {config.icon === 'aura' ? (
              <AuraLogo size="sm" withText={false} />
            ) : (
              <Text style={styles.icon}>{config.icon}</Text>
            )}
          </Animated.View>
          
          <View style={styles.headerText}>
            <Text style={styles.companyName}>{t(config.nameKey)}</Text>
            <Text style={styles.tagline}>{t(config.taglineKey)}</Text>
          </View>
          
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: config.accentColor + '30' }]}>
            <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.statusText}>{t('common.online')}</Text>
          </View>
        </View>

        {/* Quick Links (for specific companies like Zinzino) */}
        {showQuickLinks && config.quickLinks.length > 0 && (
          <View style={styles.quickLinks}>
            {config.quickLinks.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickLink}
                onPress={() => handleLinkPress(link.url)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickLinkText}>{link.labelKey}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions (für Standard-Version) */}
        {showQuickActions && isDefault && (
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsLabel}>{t('editions.default.quick_access')}</Text>
            <View style={styles.quickActions}>
              {config.quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickAction}
                  onPress={() => handleActionPress(action.action)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: config.accentColor + '20' }]}>
                    <Text style={styles.quickActionEmoji}>{action.icon}</Text>
                  </View>
                  <Text style={styles.quickActionLabel}>{t(action.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Daily Tip Card (outside gradient for better readability) */}
      {showDailyTip && isDefault && (
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipLabel}>{t('branding.tip_of_day')}</Text>
          </View>
          <Text style={styles.tipText}>{t(dailyTip)}</Text>
        </View>
      )}

      {/* Features */}
      {showFeatures && config.featureKeys.length > 0 && (
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>{t('branding.chief_helps')}</Text>
          {config.featureKeys.map((featureKey, index) => (
            <TouchableOpacity
              key={index}
              style={styles.featureItem}
              onPress={() => onFeaturePress?.(t(featureKey))}
            >
              <Text style={styles.featureText}>{t(featureKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ZINZINO QUICK INFO (Spezifische Schnellhilfe)
// ═══════════════════════════════════════════════════════════════════════════

export function ZinzinoQuickInfo({ onAskChief }: { onAskChief?: (question: string) => void }) {
  const { t } = useTranslation();
  
  const quickQuestions = [
    { emoji: '🧬', questionKey: 'editions.zinzino.quick_questions.balance_test', short: 'BalanceTest' },
    { emoji: '📊', questionKey: 'editions.zinzino.quick_questions.omega_ratio', short: 'Omega-Ratio' },
    { emoji: '💰', questionKey: 'editions.zinzino.quick_questions.comp_plan', short: 'Comp Plan' },
    { emoji: '🥄', questionKey: 'editions.zinzino.quick_questions.usage', short: 'Anwendung' },
  ];

  return (
    <View style={styles.quickInfo}>
      <Text style={styles.quickInfoTitle}>{t('editions.zinzino.quick_help')}</Text>
      <View style={styles.quickQuestions}>
        {quickQuestions.map((q, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickQuestion}
            onPress={() => onAskChief?.(t(q.questionKey))}
            activeOpacity={0.7}
          >
            <Text style={styles.quickQuestionEmoji}>{q.emoji}</Text>
            <Text style={styles.quickQuestionText}>{q.short}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STANDARD QUICK INFO (Für alle ohne spezifisches Network)
// ═══════════════════════════════════════════════════════════════════════════

export function StandardQuickInfo({ onAction }: { onAction?: (action: string) => void }) {
  const { t } = useTranslation();
  
  const quickActions = [
    { emoji: '💬', labelKey: 'actions.ask_chief', action: 'Chat', color: '#3B82F6' },
    { emoji: '📋', labelKey: 'actions.playbooks', action: 'Playbooks', color: '#8B5CF6' },
    { emoji: '✨', labelKey: 'actions.templates', action: 'Templates', color: '#EC4899' },
    { emoji: '📊', labelKey: 'actions.analytics', action: 'Analytics', color: '#10B981' },
  ];

  return (
    <View style={styles.standardQuickInfo}>
      <Text style={styles.standardQuickInfoTitle}>⚡ {t('editions.default.quick_access')}</Text>
      <View style={styles.standardQuickActions}>
        {quickActions.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.standardQuickAction, { borderColor: item.color + '30' }]}
            onPress={() => onAction?.(item.action)}
            activeOpacity={0.7}
          >
            <View style={[styles.standardQuickActionIcon, { backgroundColor: item.color + '15' }]}>
              <Text style={styles.standardQuickActionEmoji}>{item.emoji}</Text>
            </View>
            <Text style={[styles.standardQuickActionLabel, { color: item.color }]}>{t(item.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  
  // Main Container
  container: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  
  // Decorative Elements
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 26,
  },
  headerText: {
    flex: 1,
  },
  companyName: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  
  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Quick Links
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  quickLink: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickLinkText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Quick Actions (Standard Version)
  quickActionsContainer: {
    marginTop: 18,
  },
  quickActionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionEmoji: {
    fontSize: 20,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  
  // Tip Card
  tipCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  
  // Features
  features: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  featuresTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureItem: {
    paddingVertical: 8,
  },
  featureText: {
    color: 'white',
    fontSize: 14,
  },
  
  // Compact Version
  compactContainer: {
    borderRadius: 14,
    padding: 14,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  compactText: {
    flex: 1,
  },
  compactName: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  compactTagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  
  // Quick Info (Zinzino)
  quickInfo: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  quickInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 12,
  },
  quickQuestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickQuestionEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  quickQuestionText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600',
  },
  
  // Standard Quick Info
  standardQuickInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  standardQuickInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  standardQuickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  standardQuickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  standardQuickActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  standardQuickActionEmoji: {
    fontSize: 14,
  },
  standardQuickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CompanyBanner;
