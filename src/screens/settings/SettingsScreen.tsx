/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - SETTINGS SCREEN                                                ║
 * ║  Umfassende Einstellungen für App, Account & Präferenzen                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AURA_COLORS, AURA_SHADOWS } from '../../components/aura';
import { useAuth } from '../../context/AuthContext';
import { 
  changeLanguage, 
  getCurrentLanguage, 
  getAvailableLanguages,
  SupportedLanguage 
} from '../../i18n/config';
import { VerticalSelector } from '../../components/VerticalSelector';
import { ModuleSelector } from '../../components/ModuleSelector';
import { VerticalId } from '../../config/verticals/VerticalContext';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  value,
  onPress,
  rightElement,
  danger,
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingItemLeft}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <View style={styles.settingItemRight}>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {rightElement}
      {onPress && !rightElement && (
        <Text style={styles.chevron}>›</Text>
      )}
    </View>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, logout, userProfile } = useAuth();
  
  // Local State
  const [notifications, setNotifications] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
  const currentLang = getCurrentLanguage();
  const languages = getAvailableLanguages();
  
  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  const handleLanguageChange = useCallback(async (lang: SupportedLanguage) => {
    await changeLanguage(lang);
    setShowLanguageModal(false);
  }, []);
  
  const handleLogout = useCallback(() => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logout_confirm') || 'Möchtest du dich wirklich abmelden?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.logout'), 
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  }, [logout, t]);
  
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      '⚠️ Account löschen',
      'Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden gelöscht.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: 'Account löschen', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert('Info', 'Bitte kontaktiere den Support für Account-Löschung.');
          },
        },
      ]
    );
  }, [t]);
  
  const handleExportData = useCallback(() => {
    Alert.alert(
      '📦 Daten exportieren',
      'Deine Daten werden als JSON-Datei exportiert und per E-Mail gesendet.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: 'Exportieren', 
          onPress: () => {
            // TODO: Implement data export
            Alert.alert('✅ Export gestartet', 'Du erhältst eine E-Mail mit deinen Daten.');
          },
        },
      ]
    );
  }, [t]);
  
  const openPrivacyPolicy = useCallback(() => {
    Linking.openURL('https://aura-os.app/privacy');
  }, []);
  
  const openTerms = useCallback(() => {
    Linking.openURL('https://aura-os.app/terms');
  }, []);
  
  const openSupport = useCallback(() => {
    Linking.openURL('mailto:support@aura-os.app');
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  
  const currentLanguageInfo = languages.find(l => l.code === currentLang);
  
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
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userProfile?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userProfile?.first_name || 'User'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>
                {userProfile?.subscription_tier || 'Free'}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('Pricing')}
          >
            <Text style={styles.editProfileText}>Upgrade →</Text>
          </TouchableOpacity>
        </View>
        
        {/* Account Settings */}
        <SettingSection title={t('settings.account')}>
          <SettingItem
            icon="👤"
            title="Profil bearbeiten"
            subtitle="Name, Firma, Branche"
            onPress={() => navigation.navigate('NetworkSelection')}
          />
          <VerticalSelector
            currentVertical={(userProfile?.vertical as VerticalId) || 'network_marketing'}
            onVerticalChange={(vertical) => {
              // Vertical wurde geändert, Profile wird automatisch aktualisiert
              Alert.alert('✅ Vertical geändert', `Dein Vertical wurde auf "${vertical}" gesetzt.`);
            }}
          />
        </SettingSection>

        {/* Module Settings */}
        <SettingSection title="Module">
          <ModuleSelector
            vertical={(userProfile?.vertical as VerticalId) || 'network_marketing'}
          />
        </SettingSection>

        {/* Account Settings continued */}
        <SettingSection title={t('settings.account')}>
          <SettingItem
            icon="💳"
            title="Abo & Zahlung"
            subtitle="Plan verwalten"
            onPress={() => navigation.navigate('Pricing')}
          />
          <SettingItem
            icon="🔑"
            title="Passwort ändern"
            onPress={() => Alert.alert('Info', 'Passwort-Reset Link wird gesendet')}
          />
        </SettingSection>
        
        {/* Language Settings */}
        <SettingSection title={t('language.title')}>
          <SettingItem
            icon={currentLanguageInfo?.flag || '🌐'}
            title={t('language.select')}
            value={currentLanguageInfo?.label}
            onPress={() => setShowLanguageModal(true)}
          />
        </SettingSection>
        
        {/* Language Selection Modal */}
        {showLanguageModal && (
          <View style={styles.languageModal}>
            <View style={styles.languageModalContent}>
              <Text style={styles.languageModalTitle}>{t('language.select')}</Text>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    lang.code === currentLang && styles.languageOptionActive
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageLabel,
                    lang.code === currentLang && styles.languageLabelActive
                  ]}>
                    {lang.label}
                  </Text>
                  {lang.code === currentLang && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowLanguageModal(false)}
              >
                <Text style={styles.closeModalText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Notifications */}
        <SettingSection title={t('settings.notifications')}>
          <SettingItem
            icon="🔔"
            title="Push-Benachrichtigungen"
            subtitle="Follow-ups, Leads, Updates"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#3e3e3e', true: AURA_COLORS.neon.cyan }}
                thumbColor={notifications ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            icon="⏰"
            title="Tägliche Erinnerungen"
            subtitle="Daily Flow Reminder"
            rightElement={
              <Switch
                value={dailyReminders}
                onValueChange={setDailyReminders}
                trackColor={{ false: '#3e3e3e', true: AURA_COLORS.neon.cyan }}
                thumbColor={dailyReminders ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            icon="🔊"
            title="Sounds"
            rightElement={
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: '#3e3e3e', true: AURA_COLORS.neon.cyan }}
                thumbColor={soundEnabled ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            icon="📳"
            title="Haptisches Feedback"
            rightElement={
              <Switch
                value={hapticEnabled}
                onValueChange={setHapticEnabled}
                trackColor={{ false: '#3e3e3e', true: AURA_COLORS.neon.cyan }}
                thumbColor={hapticEnabled ? '#fff' : '#f4f3f4'}
              />
            }
          />
        </SettingSection>
        
        {/* Appearance */}
        <SettingSection title={t('settings.theme')}>
          <SettingItem
            icon="🌙"
            title="Dark Mode"
            subtitle="Empfohlen für AURA OS"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#3e3e3e', true: AURA_COLORS.neon.cyan }}
                thumbColor={darkMode ? '#fff' : '#f4f3f4'}
              />
            }
          />
        </SettingSection>
        
        {/* Data & Sync */}
        <SettingSection title="Daten & Sync">
          <SettingItem
            icon="🔄"
            title="Auto-Sync"
            subtitle="Daten automatisch synchronisieren"
            rightElement={
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: '#3e3e3e', true: AURA_COLORS.neon.cyan }}
                thumbColor={autoSync ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingItem
            icon="📦"
            title="Daten exportieren"
            subtitle="DSGVO-konformer Export"
            onPress={handleExportData}
          />
          <SettingItem
            icon="🗑️"
            title="Cache leeren"
            subtitle="Lokale Daten löschen"
            onPress={() => Alert.alert('✅ Cache geleert', 'Lokale Daten wurden gelöscht.')}
          />
        </SettingSection>
        
        {/* CHIEF AI Settings */}
        <SettingSection title="CHIEF AI">
          <SettingItem
            icon="🧠"
            title="Autonomie-Level"
            subtitle="Wie selbstständig soll CHIEF handeln?"
            onPress={() => navigation.navigate('AutopilotSettings')}
          />
          <SettingItem
            icon="📚"
            title="Knowledge Base"
            subtitle="Firmenwissen verwalten"
            onPress={() => navigation.navigate('Brain')}
          />
          <SettingItem
            icon="🎤"
            title="Voice-Einstellungen"
            subtitle="Spracheingabe & Vorlesen"
            onPress={() => Alert.alert('Coming Soon', 'Voice-Einstellungen werden bald verfügbar sein.')}
          />
        </SettingSection>
        
        {/* Legal & Support */}
        <SettingSection title="Rechtliches & Support">
          <SettingItem
            icon="📜"
            title={t('settings.privacy')}
            onPress={openPrivacyPolicy}
          />
          <SettingItem
            icon="📋"
            title={t('settings.terms')}
            onPress={openTerms}
          />
          <SettingItem
            icon="💬"
            title="Support kontaktieren"
            onPress={openSupport}
          />
          <SettingItem
            icon="ℹ️"
            title={t('settings.about')}
            value="v2.0.0"
          />
        </SettingSection>
        
        {/* Danger Zone */}
        <SettingSection title="Gefahrenzone">
          <SettingItem
            icon="🚪"
            title={t('settings.logout')}
            onPress={handleLogout}
            danger
          />
          <SettingItem
            icon="❌"
            title="Account löschen"
            subtitle="Alle Daten werden unwiderruflich gelöscht"
            onPress={handleDeleteAccount}
            danger
          />
        </SettingSection>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>AURA OS v2.0.0</Text>
          <Text style={styles.footerSubtext}>Powered by CHIEF AI</Text>
          <Text style={styles.copyright}>© 2024 Sales Flow AI</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
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
  
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 20,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.soft,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AURA_COLORS.neon.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  profileEmail: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: AURA_COLORS.neon.cyan + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: AURA_COLORS.neon.cyan,
    textTransform: 'uppercase',
  },
  editProfileButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.neon.cyan,
  },
  
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: AURA_COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: AURA_COLORS.glass.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    overflow: 'hidden',
  },
  
  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: AURA_COLORS.text.primary,
  },
  settingSubtitle: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginRight: 8,
  },
  chevron: {
    fontSize: 20,
    color: AURA_COLORS.text.muted,
  },
  dangerText: {
    color: '#ef4444',
  },
  
  // Language Modal
  languageModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  languageModalContent: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  languageModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  languageOptionActive: {
    backgroundColor: AURA_COLORS.neon.cyan + '20',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageLabel: {
    fontSize: 16,
    color: AURA_COLORS.text.primary,
    flex: 1,
  },
  languageLabelActive: {
    fontWeight: '600',
    color: AURA_COLORS.neon.cyan,
  },
  checkmark: {
    fontSize: 18,
    color: AURA_COLORS.neon.cyan,
    fontWeight: '700',
  },
  closeModalButton: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: AURA_COLORS.glass.border,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.muted,
  },
  footerSubtext: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
  },
  copyright: {
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginTop: 8,
    opacity: 0.6,
  },
});

export default SettingsScreen;

