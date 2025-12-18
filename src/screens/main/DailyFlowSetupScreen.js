/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - DAILY FLOW SETUP SCREEN                                  ║
 * ║  Konfiguration für Monatsziele und Arbeitsrahmen                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDailyFlowConfig } from '../../hooks/useDailyFlow';
import { TARGET_PERIOD_LABELS } from '../../types/dailyFlow';

// ═══════════════════════════════════════════════════════════════════════════
// SLIDER COMPONENT (Simple)
// ═══════════════════════════════════════════════════════════════════════════

const SimpleSlider = ({ value, onChange, min, max, step, label, unit }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  const increment = () => {
    if (value + step <= max) onChange(value + step);
  };
  
  const decrement = () => {
    if (value - step >= min) onChange(value - step);
  };

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value}{unit}</Text>
      </View>
      <View style={styles.sliderControls}>
        <Pressable style={styles.sliderButton} onPress={decrement}>
          <Text style={styles.sliderButtonText}>−</Text>
        </Pressable>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${percentage}%` }]} />
        </View>
        <Pressable style={styles.sliderButton} onPress={increment}>
          <Text style={styles.sliderButtonText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.sliderRange}>
        <Text style={styles.sliderRangeText}>{min}{unit}</Text>
        <Text style={styles.sliderRangeText}>{max}{unit}</Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CHIP SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ChipSelector = ({ options, value, onChange, label }) => (
  <View style={styles.chipContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.chipRow}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.chip,
            value === option.value && styles.chipActive,
          ]}
          onPress={() => onChange(option.value)}
        >
          <Text style={[
            styles.chipText,
            value === option.value && styles.chipTextActive,
          ]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// INFO BOX COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const InfoBox = ({ icon, title, text, color = '#06b6d4' }) => (
  <View style={[styles.infoBox, { borderColor: color }]}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View style={styles.infoContent}>
      <Text style={[styles.infoTitle, { color }]}>{title}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function DailyFlowSetupScreen({ navigation }) {
  const { config, isConfigured, isLoading, isSaving, saveConfig } = useDailyFlowConfig();

  // Form State
  const [targetPeriod, setTargetPeriod] = useState('month');
  const [targetDeals, setTargetDeals] = useState('10');
  const [workingDays, setWorkingDays] = useState(5);
  const [maxActions, setMaxActions] = useState(40);
  const [newToFollowupRatio, setNewToFollowupRatio] = useState(40); // Prozent
  const [manualConversionRate, setManualConversionRate] = useState('5'); // Prozent

  // Load existing config
  useEffect(() => {
    if (config) {
      setTargetPeriod(config.target_period || 'month');
      setTargetDeals(config.target_deals_per_period?.toString() || '10');
      setWorkingDays(config.working_days_per_week || 5);
      setMaxActions(config.max_actions_per_day || 40);
      setNewToFollowupRatio(Math.round((config.new_to_followup_ratio || 0.4) * 100));
      setManualConversionRate(((config.manual_contact_to_deal_rate || 0.05) * 100).toString());
    }
  }, [config]);

  // Calculate estimates
  const estimateCalculations = () => {
    const deals = parseInt(targetDeals) || 10;
    const convRate = parseFloat(manualConversionRate) / 100 || 0.05;
    const daysPerWeek = workingDays;
    const weeksInPeriod = targetPeriod === 'week' ? 1 : targetPeriod === 'month' ? 4 : 13;
    
    const neededContacts = Math.ceil(deals / convRate);
    const workingDaysTotal = daysPerWeek * weeksInPeriod;
    const contactsPerDay = Math.ceil(neededContacts / workingDaysTotal);
    
    return {
      neededContacts,
      contactsPerDay,
      workingDaysTotal,
    };
  };

  const estimates = estimateCalculations();

  // Save Handler
  const handleSave = async () => {
    const dealsNum = parseInt(targetDeals);
    const convRateNum = parseFloat(manualConversionRate) / 100;

    if (!dealsNum || dealsNum < 1) {
      Alert.alert('Fehler', 'Bitte gib ein gültiges Ziel an.');
      return;
    }

    if (!convRateNum || convRateNum <= 0 || convRateNum > 1) {
      Alert.alert('Fehler', 'Bitte gib eine gültige Conversion Rate an (1-100%).');
      return;
    }

    try {
      await saveConfig({
        target_period: targetPeriod,
        target_deals_per_period: dealsNum,
        working_days_per_week: workingDays,
        max_actions_per_day: maxActions,
        new_to_followup_ratio: newToFollowupRatio / 100,
        manual_contact_to_deal_rate: convRateNum,
        is_active: true,
      });

      Alert.alert(
        '✅ Gespeichert',
        'Deine Ziele wurden gespeichert. Der Daily Flow Agent plant ab jetzt deine Tage.',
        [
          {
            text: 'Los geht\'s!',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Fehler', 'Einstellungen konnten nicht gespeichert werden.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Einstellungen werden geladen...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Zurück</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Daily Flow Setup</Text>
        <Text style={styles.headerSubtitle}>
          Definiere deine Ziele und ich plane jeden Tag die richtigen Aktionen.
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Target Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Dein Ziel</Text>
          
          <ChipSelector
            label="Zeitraum"
            value={targetPeriod}
            onChange={setTargetPeriod}
            options={[
              { value: 'week', label: 'Woche' },
              { value: 'month', label: 'Monat' },
              { value: 'quarter', label: 'Quartal' },
            ]}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Ziel: Abschlüsse pro {TARGET_PERIOD_LABELS[targetPeriod]}
            </Text>
            <TextInput
              style={styles.inputLarge}
              value={targetDeals}
              onChangeText={setTargetDeals}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor="#475569"
            />
          </View>
        </View>

        {/* Work Frame Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Arbeitsrahmen</Text>
          
          <SimpleSlider
            label="Arbeitstage pro Woche"
            value={workingDays}
            onChange={setWorkingDays}
            min={1}
            max={7}
            step={1}
            unit=" Tage"
          />

          <SimpleSlider
            label="Max. Aktionen pro Tag"
            value={maxActions}
            onChange={setMaxActions}
            min={10}
            max={80}
            step={5}
            unit=""
          />

          <SimpleSlider
            label="Anteil neue Kontakte"
            value={newToFollowupRatio}
            onChange={setNewToFollowupRatio}
            min={10}
            max={80}
            step={5}
            unit="%"
          />
          <Text style={styles.helperText}>
            {newToFollowupRatio}% neue Kontakte, {100 - newToFollowupRatio}% Follow-ups
          </Text>
        </View>

        {/* Conversion Rate Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Conversion Rate</Text>
          <Text style={styles.sectionSubtitle}>
            Wie viele deiner Kontakte werden typischerweise zu Abschlüssen?
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kontakt-zu-Deal Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={manualConversionRate}
              onChangeText={setManualConversionRate}
              keyboardType="decimal-pad"
              placeholder="5"
              placeholderTextColor="#475569"
            />
          </View>

          <View style={styles.conversionPresets}>
            {[
              { label: '3%', value: '3' },
              { label: '5%', value: '5' },
              { label: '10%', value: '10' },
              { label: '15%', value: '15' },
            ].map((preset) => (
              <Pressable
                key={preset.value}
                style={[
                  styles.presetChip,
                  manualConversionRate === preset.value && styles.presetChipActive,
                ]}
                onPress={() => setManualConversionRate(preset.value)}
              >
                <Text style={[
                  styles.presetChipText,
                  manualConversionRate === preset.value && styles.presetChipTextActive,
                ]}>
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Estimate Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Berechnung</Text>
          
          <InfoBox
            icon="💡"
            title="Dein Tagesplan"
            text={`Um ${targetDeals} Abschlüsse pro ${TARGET_PERIOD_LABELS[targetPeriod]} zu erreichen, brauchst du etwa ${estimates.neededContacts} Kontakte. Bei ${estimates.workingDaysTotal} Arbeitstagen sind das ca. ${estimates.contactsPerDay} neue Kontakte pro Tag.`}
            color="#06b6d4"
          />

          <InfoBox
            icon="🎯"
            title="Daily Flow Ergebnis"
            text={`Der Agent wird dir jeden Tag ${Math.min(estimates.contactsPerDay, Math.round(maxActions * newToFollowupRatio / 100))} neue Kontakte und ${Math.round(maxActions * (100 - newToFollowupRatio) / 100)} Follow-ups einplanen.`}
            color="#10b981"
          />
        </View>

        {/* Save Button */}
        <Pressable 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isConfigured ? '💾 Einstellungen speichern' : '🚀 Daily Flow aktivieren'}
            </Text>
          )}
        </Pressable>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
  },
  header: {
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#06b6d4',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#f8fafc',
  },
  inputLarge: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  chipContainer: {
    marginBottom: 20,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  chipActive: {
    borderColor: '#06b6d4',
    backgroundColor: '#06b6d4' + '20',
  },
  chipText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#06b6d4',
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#06b6d4',
  },
  sliderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    fontSize: 24,
    color: '#f8fafc',
    fontWeight: '300',
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#06b6d4',
    borderRadius: 4,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderRangeText: {
    fontSize: 12,
    color: '#64748b',
  },
  conversionPresets: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  presetChipActive: {
    borderColor: '#10b981',
    backgroundColor: '#10b981' + '20',
  },
  presetChipText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#10b981',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  saveButton: {
    margin: 20,
    backgroundColor: '#06b6d4',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 40,
  },
});

