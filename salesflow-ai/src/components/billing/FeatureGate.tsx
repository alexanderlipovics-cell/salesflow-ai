/**
 * FeatureGate - Zeigt Upgrade-Prompt wenn Feature nicht verfügbar
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useBilling } from '../../hooks/useBilling';
import { PlanLimits } from '../../api/billing';

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const FEATURE_INFO: Record<string, { name: string; icon: string; requiredPlan: string; addon?: string }> = {
  leads: { name: 'Leads', icon: '👥', requiredPlan: 'basic' },
  chats_import: { name: 'Chat-Import', icon: '📥', requiredPlan: 'basic' },
  ai_analyses: { name: 'KI-Analysen', icon: '🤖', requiredPlan: 'basic' },
  follow_ups: { name: 'Follow-Ups', icon: '📋', requiredPlan: 'basic' },
  templates: { name: 'Templates', icon: '📝', requiredPlan: 'basic' },
  auto_actions: { name: 'Auto-Aktionen', icon: '⚡', requiredPlan: 'basic', addon: 'autopilot' },
  ghost_reengages: { name: 'Ghost-Buster', icon: '👻', requiredPlan: 'basic', addon: 'autopilot' },
  transactions: { name: 'Finanz-Tracking', icon: '💰', requiredPlan: 'basic', addon: 'finance' },
  lead_suggestions: { name: 'Lead-Vorschläge', icon: '🎯', requiredPlan: 'basic', addon: 'leadgen' },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: FeatureGate
// ═══════════════════════════════════════════════════════════════════════════

interface FeatureGateProps {
  feature: keyof PlanLimits;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { canUse, isFree, subscription } = useBilling();
  const [showModal, setShowModal] = React.useState(false);
  
  const featureInfo = FEATURE_INFO[feature];
  const canAccess = canUse(feature);
  
  if (canAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (!showUpgradePrompt) {
    return null;
  }
  
  return (
    <>
      <Pressable style={styles.lockedContainer} onPress={() => setShowModal(true)}>
        <View style={styles.lockedOverlay}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedText}>
            {featureInfo?.name || feature} freischalten
          </Text>
        </View>
      </Pressable>
      
      <UpgradeModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        feature={feature}
        featureInfo={featureInfo}
        isFree={isFree}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: UpgradeModal
// ═══════════════════════════════════════════════════════════════════════════

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
  featureInfo?: { name: string; icon: string; requiredPlan: string; addon?: string };
  isFree: boolean;
}

function UpgradeModal({ visible, onClose, feature, featureInfo, isFree }: UpgradeModalProps) {
  const { upgrade } = useBilling();
  
  const handleUpgrade = async () => {
    try {
      if (isFree) {
        await upgrade('basic_monthly');
      } else if (featureInfo?.addon) {
        await upgrade(`${featureInfo.addon}_starter_monthly`);
      }
      onClose();
    } catch (err) {
      console.error('Upgrade error:', err);
    }
  };
  
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalEmoji}>{featureInfo?.icon || '🚀'}</Text>
          <Text style={styles.modalTitle}>
            {featureInfo?.name || feature} freischalten
          </Text>
          
          <Text style={styles.modalDescription}>
            {isFree 
              ? 'Upgrade auf Basic um dieses Feature zu nutzen.'
              : featureInfo?.addon
                ? `Füge das ${featureInfo.addon.charAt(0).toUpperCase() + featureInfo.addon.slice(1)} Add-On hinzu.`
                : 'Upgrade deinen Plan für mehr Kapazität.'
            }
          </Text>
          
          <Pressable onPress={handleUpgrade}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.upgradeButton}
            >
              <Text style={styles.upgradeButtonText}>
                {isFree ? 'Auf Basic upgraden - €30/Monat' : 'Add-On hinzufügen - €10/Monat'}
              </Text>
            </LinearGradient>
          </Pressable>
          
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Später</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: UsageMeter
// ═══════════════════════════════════════════════════════════════════════════

interface UsageMeterProps {
  feature: keyof PlanLimits;
  showLabel?: boolean;
  compact?: boolean;
}

export function UsageMeter({ feature, showLabel = true, compact = false }: UsageMeterProps) {
  const { usage, subscription, getUsagePercent } = useBilling();
  
  const percent = getUsagePercent(feature);
  const limit = subscription?.limits?.[feature] || 0;
  const used = usage?.usage?.[feature] || 0;
  const isUnlimited = limit === -1;
  
  const getColor = () => {
    if (isUnlimited) return '#10B981';
    if (percent >= 90) return '#EF4444';
    if (percent >= 70) return '#F59E0B';
    return '#3B82F6';
  };
  
  if (compact) {
    return (
      <View style={styles.meterCompact}>
        <View style={styles.meterBarCompact}>
          <View style={[styles.meterFillCompact, { width: `${Math.min(percent, 100)}%`, backgroundColor: getColor() }]} />
        </View>
        <Text style={styles.meterTextCompact}>
          {isUnlimited ? '∞' : `${used}/${limit}`}
        </Text>
      </View>
    );
  }
  
  const featureInfo = FEATURE_INFO[feature];
  
  return (
    <View style={styles.meterContainer}>
      {showLabel && (
        <View style={styles.meterHeader}>
          <Text style={styles.meterLabel}>
            {featureInfo?.icon} {featureInfo?.name || feature}
          </Text>
          <Text style={styles.meterValue}>
            {isUnlimited ? '∞' : `${used} / ${limit}`}
          </Text>
        </View>
      )}
      <View style={styles.meterBar}>
        <View style={[styles.meterFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: getColor() }]} />
      </View>
      {percent >= 80 && !isUnlimited && (
        <Text style={styles.meterWarning}>
          ⚠️ {100 - percent}% verbleibend
        </Text>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: UpgradeBanner
// ═══════════════════════════════════════════════════════════════════════════

interface UpgradeBannerProps {
  variant?: 'default' | 'compact' | 'full';
  onUpgrade?: () => void;
}

export function UpgradeBanner({ variant = 'default', onUpgrade }: UpgradeBannerProps) {
  const { isFree } = useBilling();
  const navigation = useNavigation<any>();
  
  if (!isFree) return null;
  
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Direkt zum TestCheckout navigieren
      navigation.navigate('TestCheckout', { plan: 'basic_monthly' });
    }
  };
  
  if (variant === 'compact') {
    return (
      <Pressable style={styles.bannerCompact} onPress={handleUpgrade}>
        <Text style={styles.bannerCompactText}>
          🚀 Upgrade auf Basic für volle Power
        </Text>
      </Pressable>
    );
  }
  
  return (
    <Pressable onPress={handleUpgrade} accessibilityLabel="Upgrade auf Basic" accessibilityRole="button">
      <LinearGradient
        colors={['#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.bannerEmoji}>🚀</Text>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Upgrade auf Basic</Text>
            <Text style={styles.bannerSubtitle}>
              100 Leads, 50 Imports, KI-Coach & mehr
            </Text>
          </View>
        </View>
        <View style={styles.bannerButton}>
          <Text style={styles.bannerButtonText}>€30/Mo</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Locked State
  lockedContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    minHeight: 100,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockedIcon: {
    fontSize: 32,
  },
  lockedText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  upgradeButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
  },
  closeButtonText: {
    color: '#64748B',
    fontSize: 14,
  },
  
  // Usage Meter
  meterContainer: {
    marginBottom: 12,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meterLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  meterValue: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
  },
  meterBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  meterWarning: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 4,
  },
  
  // Compact Meter
  meterCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meterBarCompact: {
    flex: 1,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  meterFillCompact: {
    height: '100%',
    borderRadius: 2,
  },
  meterTextCompact: {
    fontSize: 11,
    color: '#64748B',
    minWidth: 40,
    textAlign: 'right',
  },
  
  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    margin: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerEmoji: {
    fontSize: 28,
  },
  bannerText: {},
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  bannerButton: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  bannerButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Compact Banner
  bannerCompact: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  bannerCompactText: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default FeatureGate;

