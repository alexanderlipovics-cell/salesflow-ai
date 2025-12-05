/**
 * CompanyBrandedHeader - Header mit Company-spezifischem Branding
 * Mit i18n-Integration für globale Sprachunterstützung
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { CompanyBranding } from '../../hooks/useCompanyBranding';

interface Props {
  branding: CompanyBranding;
  title?: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
  onBack?: () => void;
  showCompliance?: boolean;
  dailyProgress?: number;
}

export function CompanyBrandedHeader({
  branding,
  title,
  subtitle,
  rightComponent,
  onBack,
  showCompliance = false,
  dailyProgress,
}: Props) {
  const { t } = useTranslation();
  const { colors, gradients, chiefConfig, compliance, name, tagline } = branding;

  return (
    <LinearGradient
      colors={gradients.header as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        {/* Back Button */}
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>
        )}

        {/* Emoji & Title */}
        <Text style={styles.headerEmoji}>{chiefConfig.emoji}</Text>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{title || `${name} Coach`}</Text>
          <Text style={styles.headerSubtitle}>
            {subtitle || tagline || chiefConfig.personality}
          </Text>
        </View>
      </View>

      {/* Right Side */}
      <View style={styles.headerRight}>
        {/* Compliance Badge */}
        {showCompliance && compliance.level === 'strict' && (
          <View style={styles.complianceBadge}>
            <Text style={styles.complianceBadgeText}>{t('branding.strict')}</Text>
          </View>
        )}

        {/* Daily Progress */}
        {dailyProgress !== undefined && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{dailyProgress}%</Text>
          </View>
        )}

        {/* Custom Right Component */}
        {rightComponent}
      </View>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPANY INFO BANNER (optional unter Header)
// ═══════════════════════════════════════════════════════════════════════════

interface BannerProps {
  branding: CompanyBranding;
  showFocusAreas?: boolean;
}

export function CompanyInfoBanner({ branding, showFocusAreas = true }: BannerProps) {
  const { t } = useTranslation();
  const { colors, chiefConfig, compliance } = branding;

  return (
    <View style={[styles.banner, { backgroundColor: colors.secondary + '15' }]}>
      {/* Focus Areas */}
      {showFocusAreas && (
        <View style={styles.focusAreasRow}>
          {chiefConfig.focusAreas.slice(0, 4).map((area, idx) => (
            <View 
              key={idx} 
              style={[styles.focusChip, { backgroundColor: colors.primary + '20' }]}
            >
              <Text style={[styles.focusChipText, { color: colors.primary }]}>
                {area}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Compliance Warnings */}
      {compliance.warnings.length > 0 && (
        <View style={styles.complianceWarningsRow}>
          <Text style={styles.complianceWarningLabel}>{t('branding.note')}</Text>
          {compliance.warnings.slice(0, 2).map((warning, idx) => (
            <Text key={idx} style={styles.complianceWarningText}>
              • {warning}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
  },
  headerEmoji: {
    fontSize: 32,
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  complianceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  complianceBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  progressBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },

  // Banner
  banner: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  focusAreasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  focusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  focusChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  complianceWarningsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  complianceWarningLabel: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  complianceWarningText: {
    fontSize: 11,
    color: '#B45309',
  },
});

export default CompanyBrandedHeader;

