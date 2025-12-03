/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AUTOPILOT SETTINGS SCREEN                                                 ║
 * ║  Konfiguration für den CHIEF v3.2 Autopiloten                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../services/apiConfig';

// API URL für Autopilot Endpoints
const API_BASE_URL = API_CONFIG.baseUrl;

// ═══════════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  background: '#0D0D12',
  card: '#1A1A24',
  cardBorder: '#2A2A3A',
  primary: '#6366F1',
  primaryLight: '#818CF8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTONOMY LEVELS (keys for i18n)
// ═══════════════════════════════════════════════════════════════════════════════

const AUTONOMY_LEVEL_CONFIG = [
  { id: 'observer', icon: '👁️', color: COLORS.textMuted },
  { id: 'assistant', icon: '🤝', color: COLORS.primary },
  { id: 'autopilot', icon: '🚀', color: COLORS.success },
  { id: 'full_auto', icon: '🤖', color: COLORS.warning },
];

// Helper function to get translated autonomy levels
const getAutonomyLevels = (t) => AUTONOMY_LEVEL_CONFIG.map(level => ({
  ...level,
  label: t(`autopilot.settings.${level.id}`),
  description: t(`autopilot.settings.${level.id}_desc`),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AutopilotSettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Get translated autonomy levels
  const AUTONOMY_LEVELS = getAutonomyLevels(t);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState({
    autonomy_level: 'assistant',
    confidence_threshold: 90,
    
    // Permissions
    auto_info_replies: true,
    auto_simple_questions: true,
    auto_followups: true,
    auto_scheduling: true,
    auto_calendar_booking: false,
    auto_price_replies: false,
    auto_objection_handling: false,
    auto_closing: false,
    
    // Notifications
    notify_hot_lead: true,
    notify_human_needed: true,
    notify_daily_summary: true,
    notify_every_action: false,
    
    // Working Hours
    working_hours_start: '09:00',
    working_hours_end: '20:00',
    send_on_weekends: false,
  });
  
  // Stats
  const [stats, setStats] = useState(null);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────────
  
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/autopilot/settings`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [session]);
  
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/autopilot/stats?period=week`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [session]);
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadSettings(), loadStats()]);
      setLoading(false);
    };
    loadData();
  }, [loadSettings, loadStats]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSettings(), loadStats()]);
    setRefreshing(false);
  };
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SAVE SETTINGS
  // ─────────────────────────────────────────────────────────────────────────────
  
  const saveSettings = async (newSettings) => {
    setSaving(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/autopilot/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        Alert.alert(t('common.error'), t('errors.server'));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert(t('common.error'), t('errors.network'));
    }
    
    setSaving(false);
  };
  
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings({ [key]: value });
  };
  
  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ {t('autopilot.settings.title')}</Text>
        {saving && <ActivityIndicator size="small" color={COLORS.primary} />}
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Stats Card */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>📊 Diese Woche</Text>
            <View style={styles.statsRow}>
              <StatItem
                icon="🤖"
                value={stats.auto_sent}
                label="Auto-gesendet"
                color={COLORS.success}
              />
              <StatItem
                icon="📝"
                value={stats.drafts_created}
                label="Entwürfe"
                color={COLORS.warning}
              />
              <StatItem
                icon="⏱️"
                value={`${stats.estimated_time_saved_minutes}m`}
                label="Gespart"
                color={COLORS.primary}
              />
            </View>
          </View>
        )}
        
        {/* Autonomy Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎚️ {t('autopilot.settings.autonomy_level')}</Text>
          <Text style={styles.sectionDescription}>
            {t('autopilot.settings.autonomy_desc')}
          </Text>
          
          <View style={styles.autonomyGrid}>
            {AUTONOMY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.autonomyCard,
                  settings.autonomy_level === level.id && styles.autonomyCardActive,
                ]}
                onPress={() => updateSetting('autonomy_level', level.id)}
              >
                <Text style={styles.autonomyIcon}>{level.icon}</Text>
                <Text style={styles.autonomyLabel}>{level.label}</Text>
                <Text style={styles.autonomyDescription}>{level.description}</Text>
                {settings.autonomy_level === level.id && (
                  <View style={[styles.autonomyBadge, { backgroundColor: level.color }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Confidence Threshold */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 {t('autopilot.settings.confidence')}</Text>
          <Text style={styles.sectionDescription}>
            {t('autopilot.settings.confidence_desc')}
          </Text>
          
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={50}
              maximumValue={100}
              step={5}
              value={settings.confidence_threshold}
              onSlidingComplete={(value) => updateSetting('confidence_threshold', value)}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.cardBorder}
              thumbTintColor={COLORS.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>{t('autopilot.settings.more_auto')}</Text>
              <Text style={styles.sliderValue}>{settings.confidence_threshold}%</Text>
              <Text style={styles.sliderLabel}>{t('autopilot.settings.safer')}</Text>
            </View>
          </View>
        </View>
        
        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔓 {t('autopilot.settings.permissions')}</Text>
          <Text style={styles.sectionDescription}>
            {t('autopilot.settings.permissions_desc')}
          </Text>
          
          <SettingToggle
            label={t('autopilot.settings.answer_info')}
            description="Einfache 'Was macht ihr?' Fragen"
            value={settings.auto_info_replies}
            onToggle={(v) => updateSetting('auto_info_replies', v)}
          />
          <SettingToggle
            label="Knowledge Base Fragen"
            description="Fragen die in der Knowledge Base sind"
            value={settings.auto_simple_questions}
            onToggle={(v) => updateSetting('auto_simple_questions', v)}
          />
          <SettingToggle
            label={t('actions.followups')}
            description="Geplante Nachfass-Nachrichten"
            value={settings.auto_followups}
            onToggle={(v) => updateSetting('auto_followups', v)}
          />
          <SettingToggle
            label={t('autopilot.settings.suggest_meetings')}
            description="Bei Interesse einen Call vorschlagen"
            value={settings.auto_scheduling}
            onToggle={(v) => updateSetting('auto_scheduling', v)}
          />
          <SettingToggle
            label={t('autopilot.settings.book_meetings')}
            description="Direkt in den Kalender eintragen"
            value={settings.auto_calendar_booking}
            onToggle={(v) => updateSetting('auto_calendar_booking', v)}
            warning
          />
          <SettingToggle
            label={t('autopilot.settings.mention_prices')}
            description="Auf Preisfragen automatisch antworten"
            value={settings.auto_price_replies}
            onToggle={(v) => updateSetting('auto_price_replies', v)}
            warning
          />
          <SettingToggle
            label={t('autopilot.settings.handle_objections')}
            description="Auf 'zu teuer', 'keine Zeit' etc. reagieren"
            value={settings.auto_objection_handling}
            onToggle={(v) => updateSetting('auto_objection_handling', v)}
            warning
          />
          <SettingToggle
            label="Closing-Versuche"
            description="Aktiv zum Abschluss führen"
            value={settings.auto_closing}
            onToggle={(v) => updateSetting('auto_closing', v)}
            danger
          />
        </View>
        
        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Benachrichtigungen</Text>
          
          <SettingToggle
            label="Hot Lead Alert"
            description="Sofort-Benachrichtigung bei kaufbereiten Leads"
            value={settings.notify_hot_lead}
            onToggle={(v) => updateSetting('notify_hot_lead', v)}
          />
          <SettingToggle
            label="Human Needed"
            description="Wenn deine persönliche Antwort gefragt ist"
            value={settings.notify_human_needed}
            onToggle={(v) => updateSetting('notify_human_needed', v)}
          />
          <SettingToggle
            label="Tages-Summary"
            description="Morgen- und Abend-Briefing"
            value={settings.notify_daily_summary}
            onToggle={(v) => updateSetting('notify_daily_summary', v)}
          />
          <SettingToggle
            label="Jede Aktion"
            description="Bei jeder Auto-Aktion benachrichtigen"
            value={settings.notify_every_action}
            onToggle={(v) => updateSetting('notify_every_action', v)}
          />
        </View>
        
        {/* Working Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Arbeitszeiten</Text>
          <Text style={styles.sectionDescription}>
            Wann darf CHIEF automatisch senden?
          </Text>
          
          <View style={styles.workingHoursRow}>
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>Von</Text>
              <Text style={styles.timeValue}>{settings.working_hours_start}</Text>
            </View>
            <Text style={styles.timeSeparator}>→</Text>
            <View style={styles.timeInput}>
              <Text style={styles.timeLabel}>Bis</Text>
              <Text style={styles.timeValue}>{settings.working_hours_end}</Text>
            </View>
          </View>
          
          <SettingToggle
            label="Auch am Wochenende"
            description="Samstag und Sonntag aktiv"
            value={settings.send_on_weekends}
            onToggle={(v) => updateSetting('send_on_weekends', v)}
          />
        </View>
        
        {/* Pending Drafts Link */}
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => navigation.navigate('AutopilotDrafts')}
        >
          <View style={styles.linkCardContent}>
            <Text style={styles.linkCardIcon}>📝</Text>
            <View style={styles.linkCardText}>
              <Text style={styles.linkCardTitle}>Entwürfe prüfen</Text>
              <Text style={styles.linkCardDescription}>
                Nachrichten die auf deine Freigabe warten
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function StatItem({ icon, value, label, color }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingToggle({ label, description, value, onToggle, warning, danger }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleContent}>
        <View style={styles.toggleLabelRow}>
          <Text style={styles.toggleLabel}>{label}</Text>
          {warning && <Text style={styles.warningBadge}>⚠️</Text>}
          {danger && <Text style={styles.dangerBadge}>🔥</Text>}
        </View>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
        thumbColor={value ? COLORS.primaryLight : COLORS.textMuted}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

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
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  
  // Stats Card
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  
  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  
  // Autonomy Grid
  autonomyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  autonomyCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    position: 'relative',
  },
  autonomyCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  autonomyIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  autonomyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  autonomyDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },
  autonomyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Slider
  sliderContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sliderValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  toggleContent: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  toggleDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  warningBadge: {
    fontSize: 12,
  },
  dangerBadge: {
    fontSize: 12,
  },
  
  // Working Hours
  workingHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  timeInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minWidth: 100,
  },
  timeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  timeSeparator: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  
  // Link Card
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  linkCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkCardIcon: {
    fontSize: 28,
  },
  linkCardText: {
    flex: 1,
  },
  linkCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  linkCardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

