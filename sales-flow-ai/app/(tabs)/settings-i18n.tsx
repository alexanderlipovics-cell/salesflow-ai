/**
 * Settings Screen with i18n
 * Example of how to use i18n in Sales Flow AI
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function SettingsI18nScreen() {
  const { t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    console.log('Language changed to:', language);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.title')}</Text>
          <Text style={styles.subtitle}>
            {t('common.app_name')} - Internationalization Demo
          </Text>
        </View>

        {/* Language Switcher Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <Text style={styles.sectionDescription}>
            Choose your preferred language for the app
          </Text>
          
          <LanguageSwitcher 
            showLabel={true}
            onLanguageChange={handleLanguageChange}
          />
        </View>

        {/* Demo Translations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Translation Examples</Text>
          
          <View style={styles.demoCard}>
            <Text style={styles.demoLabel}>Dashboard:</Text>
            <Text style={styles.demoText}>{t('dashboard.title')}</Text>
          </View>

          <View style={styles.demoCard}>
            <Text style={styles.demoLabel}>Leads:</Text>
            <Text style={styles.demoText}>{t('leads.title')}</Text>
          </View>

          <View style={styles.demoCard}>
            <Text style={styles.demoLabel}>Follow-ups:</Text>
            <Text style={styles.demoText}>{t('followups.title')}</Text>
          </View>

          <View style={styles.demoCard}>
            <Text style={styles.demoLabel}>Lead Status (New):</Text>
            <Text style={styles.demoText}>{t('lead_status.new')}</Text>
          </View>

          <View style={styles.demoCard}>
            <Text style={styles.demoLabel}>Lead Status (Won):</Text>
            <Text style={styles.demoText}>{t('lead_status.won')}</Text>
          </View>

          <View style={styles.demoCard}>
            <Text style={styles.demoLabel}>Actions (Save):</Text>
            <Text style={styles.demoText}>{t('common.save')}</Text>
          </View>

          <View style={styles.demoCard}>
            <Text style={styles.demoLabel}>Actions (Cancel):</Text>
            <Text style={styles.demoText}>{t('common.cancel')}</Text>
          </View>
        </View>

        {/* Usage Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Use i18n</Text>
          
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>1. Import useTranslation</Text>
            <Text style={styles.codeText}>
              import {'{ useTranslation }'} from 'react-i18next';
            </Text>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>2. Get t function</Text>
            <Text style={styles.codeText}>
              const {'{ t }'} = useTranslation();
            </Text>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>3. Use translations</Text>
            <Text style={styles.codeText}>
              {'<Text>{t("dashboard.title")}</Text>'}
            </Text>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>4. With variables</Text>
            <Text style={styles.codeText}>
              {'{t("validation.min_length", { count: 5 })}'}
            </Text>
          </View>
        </View>

        {/* Available Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supported Languages</Text>
          
          <View style={styles.languageGrid}>
            {[
              { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
              { code: 'en', name: 'English', flag: '🇬🇧' },
              { code: 'fr', name: 'Français', flag: '🇫🇷' },
              { code: 'es', name: 'Español', flag: '🇪🇸' },
              { code: 'it', name: 'Italiano', flag: '🇮🇹' },
              { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
              { code: 'pt', name: 'Português', flag: '🇵🇹' },
              { code: 'pl', name: 'Polski', flag: '🇵🇱' }
            ].map(lang => (
              <View key={lang.code} style={styles.languageCard}>
                <Text style={styles.languageCardFlag}>{lang.flag}</Text>
                <Text style={styles.languageCardName}>{lang.name}</Text>
                <Text style={styles.languageCardCode}>{lang.code}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Test Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>{t('common.save')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]}>
            <Ionicons name="close" size={20} color="#06b6d4" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]}>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617'
  },
  scrollView: {
    flex: 1
  },
  header: {
    padding: 24,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8'
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16
  },
  demoCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12
  },
  demoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4
  },
  demoText: {
    fontSize: 16,
    color: '#06b6d4',
    fontWeight: '600'
  },
  instructionCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12
  },
  instructionTitle: {
    fontSize: 14,
    color: '#f1f5f9',
    fontWeight: '600',
    marginBottom: 8
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#a3e635',
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 6
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  languageCard: {
    width: '22%',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center'
  },
  languageCardFlag: {
    fontSize: 32,
    marginBottom: 8
  },
  languageCardName: {
    fontSize: 12,
    color: '#f1f5f9',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4
  },
  languageCardCode: {
    fontSize: 10,
    color: '#94a3b8'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#06b6d4'
  },
  actionButtonDanger: {
    backgroundColor: '#ef4444'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  actionButtonTextSecondary: {
    color: '#06b6d4'
  }
});

