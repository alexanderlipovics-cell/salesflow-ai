/**
 * COMPANY GOAL WIZARD SCREEN
 * 
 * 3-Step Wizard zum Festlegen von MLM-Einkommenszielen.
 * 
 * Flow:
 * 1. Firma wählen (Zinzino, PM, LR, etc.)
 * 2. Ziel definieren (Einkommen oder Rang + Zeitraum)
 * 3. Plan anzeigen (berechnete Daily Flow Targets)
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGoalEngine } from '../../hooks/useGoalEngine';
import { StepCompanySelect } from '../../components/goal-wizard/StepCompanySelect';
import { StepGoalDefine } from '../../components/goal-wizard/StepGoalDefine';
import { StepPlanSummary } from '../../components/goal-wizard/StepPlanSummary';
import { WizardStep } from '../../types/compensation';

interface CompanyGoalWizardScreenProps {
  onComplete?: () => void;
}

export const CompanyGoalWizardScreen: React.FC<CompanyGoalWizardScreenProps> = ({ 
  onComplete 
}) => {
  const navigation = useNavigation();
  
  const {
    companies,
    selectedPlan,
    step,
    setStep,
    canProceed,
    companyId,
    selectCompany,
    goalType,
    setGoalType,
    targetIncome,
    setTargetIncome,
    targetRankId,
    setTargetRankId,
    timeframeMonths,
    setTimeframeMonths,
    result,
    calculate,
    saveGoal,
    reset,
    isCalculating,
    isSaving,
    error,
  } = useGoalEngine();

  // Auto-calculate when entering step 3
  useEffect(() => {
    if (step === 3 && !result && !isCalculating) {
      calculate();
    }
  }, [step, result, isCalculating, calculate]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleNext = useCallback(() => {
    if (step < 3) {
      setStep((step + 1) as WizardStep);
    }
  }, [step, setStep]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((step - 1) as WizardStep);
    }
  }, [step, setStep]);

  const handleClose = useCallback(() => {
    Alert.alert(
      'Wizard beenden?',
      'Dein Fortschritt wird nicht gespeichert.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Beenden', 
          style: 'destructive',
          onPress: () => {
            reset();
            navigation.goBack();
          }
        },
      ]
    );
  }, [reset, navigation]);

  const handleFinish = useCallback(async () => {
    const success = await saveGoal();
    
    if (success) {
      Alert.alert(
        '✅ Ziel gespeichert!',
        'Deine täglichen Aktivitäten wurden in den Daily Flow übernommen.',
        [
          {
            text: 'Super!',
            onPress: () => {
              onComplete?.();
              navigation.goBack();
            }
          }
        ]
      );
    }
  }, [saveGoal, onComplete, navigation]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🎯 Ziel festlegen</Text>
            <Text style={styles.headerSubtitle}>
              {step === 1 && 'Schritt 1 von 3: Firma wählen'}
              {step === 2 && 'Schritt 2 von 3: Ziel definieren'}
              {step === 3 && 'Schritt 3 von 3: Dein Plan'}
            </Text>
          </View>
          
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Step Indicator */}
        <StepIndicator current={step} />

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <StepCompanySelect
              companies={companies}
              selectedId={companyId}
              onSelect={selectCompany}
            />
          )}

          {step === 2 && selectedPlan && (
            <StepGoalDefine
              plan={selectedPlan}
              goalType={goalType}
              onGoalTypeChange={setGoalType}
              targetIncome={targetIncome}
              onTargetIncomeChange={setTargetIncome}
              targetRankId={targetRankId}
              onTargetRankIdChange={setTargetRankId}
              timeframeMonths={timeframeMonths}
              onTimeframeChange={setTimeframeMonths}
            />
          )}

          {step === 3 && result && selectedPlan && (
            <StepPlanSummary
              plan={selectedPlan}
              result={result}
              goalType={goalType}
              targetIncome={targetIncome}
              timeframeMonths={timeframeMonths}
            />
          )}

          {/* Loading State */}
          {step === 3 && isCalculating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#06b6d4" />
              <Text style={styles.loadingText}>Berechne deinen Plan...</Text>
            </View>
          )}
        </ScrollView>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigation}>
          {step > 1 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Zurück</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}

          {step < 3 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                !canProceed && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed}
              activeOpacity={0.7}
            >
              <Text style={styles.nextButtonText}>Weiter →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.finishButton,
                (isSaving || !result) && styles.finishButtonDisabled,
              ]}
              onPress={handleFinish}
              disabled={isSaving || !result}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#020617" />
              ) : (
                <Text style={styles.finishButtonText}>
                  ✅ In Daily Flow übernehmen
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// ============================================
// STEP INDICATOR COMPONENT
// ============================================

interface StepIndicatorProps {
  current: WizardStep;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ current }) => {
  const steps = [
    { id: 1, label: 'Firma', icon: '🏢' },
    { id: 2, label: 'Ziel', icon: '🎯' },
    { id: 3, label: 'Plan', icon: '📋' },
  ];

  return (
    <View style={indicatorStyles.container}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          {/* Step Circle */}
          <View style={indicatorStyles.stepWrapper}>
            <View
              style={[
                indicatorStyles.circle,
                step.id < current && indicatorStyles.circleCompleted,
                step.id === current && indicatorStyles.circleActive,
              ]}
            >
              {step.id < current ? (
                <Text style={indicatorStyles.checkmark}>✓</Text>
              ) : (
                <Text style={[
                  indicatorStyles.number,
                  step.id === current && indicatorStyles.numberActive,
                ]}>
                  {step.id}
                </Text>
              )}
            </View>
            <Text style={[
              indicatorStyles.label,
              step.id === current && indicatorStyles.labelActive,
            ]}>
              {step.label}
            </Text>
          </View>

          {/* Connector Line */}
          {index < steps.length - 1 && (
            <View style={[
              indicatorStyles.line,
              step.id < current && indicatorStyles.lineCompleted,
            ]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const indicatorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  stepWrapper: {
    alignItems: 'center',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleActive: {
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  circleCompleted: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  number: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  numberActive: {
    color: '#06b6d4',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#020617',
  },
  label: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
  },
  labelActive: {
    color: '#06b6d4',
    fontWeight: '600',
  },
  line: {
    width: 50,
    height: 2,
    backgroundColor: '#334155',
    marginHorizontal: 8,
    marginBottom: 20,
  },
  lineCompleted: {
    backgroundColor: '#06b6d4',
  },
});

// ============================================
// MAIN STYLES
// ============================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 16,
  },
  
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#ef4444',
    lineHeight: 18,
  },
  
  // Navigation
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  backButtonText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
  backButtonPlaceholder: {
    width: 100,
  },
  nextButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: 15,
    color: '#020617',
    fontWeight: '600',
  },
  finishButton: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
  },
  finishButtonDisabled: {
    opacity: 0.4,
  },
  finishButtonText: {
    fontSize: 15,
    color: '#020617',
    fontWeight: '700',
  },
});

export default CompanyGoalWizardScreen;

