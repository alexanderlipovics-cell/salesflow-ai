/**
 * STEP 2: GOAL DEFINE
 * 
 * Zweite Seite des Goal Wizards.
 * User definiert sein Ziel (Einkommen oder Rang) und Zeitraum.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { CompensationPlan, GoalType, RankDefinition } from '../../types/compensation';

interface StepGoalDefineProps {
  plan: CompensationPlan;
  goalType: GoalType;
  onGoalTypeChange: (type: GoalType) => void;
  targetIncome: number;
  onTargetIncomeChange: (value: number) => void;
  targetRankId: string | null;
  onTargetRankIdChange: (id: string) => void;
  timeframeMonths: number;
  onTimeframeChange: (value: number) => void;
}

export const StepGoalDefine: React.FC<StepGoalDefineProps> = ({
  plan,
  goalType,
  onGoalTypeChange,
  targetIncome,
  onTargetIncomeChange,
  targetRankId,
  onTargetRankIdChange,
  timeframeMonths,
  onTimeframeChange,
}) => {
  // Filtere Ränge mit Einkommensschätzung
  const ranksWithIncome = plan.ranks.filter(r => 
    r.earning_estimate && r.earning_estimate.avg_monthly_income > 0
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Was ist dein Ziel?</Text>
      <Text style={styles.subtitle}>
        Wähle zwischen monatlichem Einkommen oder einem Ziel-Rang bei {plan.company_name}.
      </Text>

      {/* Goal Type Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            goalType === 'income' && styles.toggleButtonActive,
          ]}
          onPress={() => onGoalTypeChange('income')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.toggleText,
            goalType === 'income' && styles.toggleTextActive,
          ]}>
            💰 Einkommen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            goalType === 'rank' && styles.toggleButtonActive,
          ]}
          onPress={() => onGoalTypeChange('rank')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.toggleText,
            goalType === 'rank' && styles.toggleTextActive,
          ]}>
            🏆 Rang
          </Text>
        </TouchableOpacity>
      </View>

      {/* Income Input */}
      {goalType === 'income' && (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Wunsch-Einkommen pro Monat</Text>
          <View style={styles.incomeDisplay}>
            <Text style={styles.incomeValue}>
              {targetIncome.toLocaleString('de-DE')} €
            </Text>
            <Text style={styles.incomeHint}>monatlich</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={500}
            maximumValue={15000}
            step={100}
            value={targetIncome}
            onValueChange={onTargetIncomeChange}
            minimumTrackTintColor="#06b6d4"
            maximumTrackTintColor="#334155"
            thumbTintColor="#06b6d4"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>500 €</Text>
            <Text style={styles.sliderLabel}>15.000 €</Text>
          </View>
          
          {/* Quick Select Buttons */}
          <View style={styles.quickSelect}>
            {[1000, 2000, 3000, 5000].map(amount => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.quickButton,
                  targetIncome === amount && styles.quickButtonActive,
                ]}
                onPress={() => onTargetIncomeChange(amount)}
              >
                <Text style={[
                  styles.quickButtonText,
                  targetIncome === amount && styles.quickButtonTextActive,
                ]}>
                  {amount.toLocaleString('de-DE')} €
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Rank Selection */}
      {goalType === 'rank' && (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Ziel-Rang</Text>
          <View style={styles.rankList}>
            {ranksWithIncome.map((rank) => (
              <RankItem
                key={rank.id}
                rank={rank}
                isSelected={targetRankId === rank.id}
                onSelect={() => onTargetRankIdChange(rank.id)}
                unitLabel={plan.unit_label}
              />
            ))}
          </View>
        </View>
      )}

      {/* Timeframe */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>In welchem Zeitraum?</Text>
        <View style={styles.timeframeDisplay}>
          <Text style={styles.timeframeValue}>{timeframeMonths}</Text>
          <Text style={styles.timeframeUnit}>Monate</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={3}
          maximumValue={24}
          step={1}
          value={timeframeMonths}
          onValueChange={onTimeframeChange}
          minimumTrackTintColor="#06b6d4"
          maximumTrackTintColor="#334155"
          thumbTintColor="#06b6d4"
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>3 Monate</Text>
          <Text style={styles.sliderLabel}>24 Monate</Text>
        </View>
        
        {/* Quick Select Buttons */}
        <View style={styles.quickSelect}>
          {[3, 6, 12, 18].map(months => (
            <TouchableOpacity
              key={months}
              style={[
                styles.quickButton,
                timeframeMonths === months && styles.quickButtonActive,
              ]}
              onPress={() => onTimeframeChange(months)}
            >
              <Text style={[
                styles.quickButtonText,
                timeframeMonths === months && styles.quickButtonTextActive,
              ]}>
                {months} Mon.
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

// ============================================
// RANK ITEM COMPONENT
// ============================================

interface RankItemProps {
  rank: RankDefinition;
  isSelected: boolean;
  onSelect: () => void;
  unitLabel: string;
}

const RankItem: React.FC<RankItemProps> = ({
  rank,
  isSelected,
  onSelect,
  unitLabel,
}) => {
  const avgIncome = rank.earning_estimate?.avg_monthly_income ?? 0;
  const range = rank.earning_estimate?.range;
  const groupVolume = rank.requirements.min_group_volume ?? 0;

  return (
    <TouchableOpacity
      style={[styles.rankItem, isSelected && styles.rankItemSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.rankHeader}>
        <Text style={[styles.rankName, isSelected && styles.rankNameSelected]}>
          {rank.name}
        </Text>
        {isSelected && (
          <View style={styles.rankCheckmark}>
            <Text style={styles.rankCheckmarkText}>✓</Text>
          </View>
        )}
      </View>
      <View style={styles.rankDetails}>
        <Text style={styles.rankIncome}>
          ~{avgIncome.toLocaleString('de-DE')} €/Monat
        </Text>
        {range && (
          <Text style={styles.rankRange}>
            ({range[0].toLocaleString('de-DE')} – {range[1].toLocaleString('de-DE')} €)
          </Text>
        )}
      </View>
      <Text style={styles.rankVolume}>
        {groupVolume.toLocaleString('de-DE')} {unitLabel} Gruppenvolumen
      </Text>
    </TouchableOpacity>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    lineHeight: 20,
  },
  
  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#06b6d4',
  },
  toggleText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#020617',
  },
  
  // Input Section
  inputSection: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
    fontWeight: '500',
  },
  
  // Income Display
  incomeDisplay: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  incomeValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#06b6d4',
  },
  incomeHint: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  
  // Slider
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  sliderLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  
  // Quick Select
  quickSelect: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickButtonActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06b6d4',
  },
  quickButtonText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  quickButtonTextActive: {
    color: '#06b6d4',
  },
  
  // Timeframe Display
  timeframeDisplay: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  timeframeValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#06b6d4',
  },
  timeframeUnit: {
    fontSize: 18,
    color: '#64748b',
    marginLeft: 8,
  },
  
  // Rank List
  rankList: {
    gap: 10,
  },
  rankItem: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  rankItemSelected: {
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  rankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  rankNameSelected: {
    color: '#06b6d4',
  },
  rankCheckmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankCheckmarkText: {
    color: '#020617',
    fontSize: 12,
    fontWeight: '700',
  },
  rankDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rankIncome: {
    fontSize: 14,
    color: '#22d3ee',
    fontWeight: '600',
  },
  rankRange: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  rankVolume: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
});

export default StepGoalDefine;

