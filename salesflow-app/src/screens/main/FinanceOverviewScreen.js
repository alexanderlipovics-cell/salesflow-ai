/**
 * AURA OS - Finance Overview Screen
 * Finanz-Dashboard mit Charts und Transaktionen
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../hooks/useFinance';
import {
  formatMoney,
  formatPercentage,
  getRelativeDate,
  CATEGORY_META,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '../../types/finance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ MAIN SCREEN ============

export default function FinanceOverviewScreen({ navigation }) {
  const { user } = useAuth();
  const {
    summary,
    monthlyData,
    incomeBreakdown,
    expenseBreakdown,
    transactions,
    isLoading,
    error,
    refetch,
    addTransaction,
    updateGoal,
    transactionFilter,
    setTransactionFilter,
  } = useFinance(user?.id);

  const [activeTab, setActiveTab] = useState('income');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Refresh handler
  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={onRefresh} 
            tintColor="#06b6d4"
            colors={['#06b6d4']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>💰 Finanzen</Text>
              <Text style={styles.headerSubtitle}>
                {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Buchung</Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {error.message}</Text>
          </View>
        )}

        {/* Loading State */}
        {isLoading && !summary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={styles.loadingText}>Lade Finanzdaten...</Text>
          </View>
        ) : (
          <>
            {/* KPI Cards */}
            {summary && <KpiSection summary={summary} />}

            {/* Goal Progress */}
            {summary?.summary?.goal_amount && (
              <GoalProgressCard
                current={summary.summary.income_total}
                goal={summary.summary.goal_amount}
                progress={summary.summary.goal_progress || 0}
                onEdit={() => setShowGoalModal(true)}
              />
            )}

            {/* Set Goal Button (if no goal) */}
            {summary && !summary.summary?.goal_amount && (
              <TouchableOpacity 
                style={styles.setGoalButton}
                onPress={() => setShowGoalModal(true)}
              >
                <Text style={styles.setGoalButtonText}>🎯 Monatsziel setzen</Text>
              </TouchableOpacity>
            )}

            {/* Revenue Chart */}
            {monthlyData.length > 0 && (
              <RevenueSection data={monthlyData} />
            )}

            {/* Category Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'income' && styles.tabActive]}
                onPress={() => setActiveTab('income')}
              >
                <Text style={[styles.tabText, activeTab === 'income' && styles.tabTextActive]}>
                  📈 Einnahmen
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'expense' && styles.tabActive]}
                onPress={() => setActiveTab('expense')}
              >
                <Text style={[styles.tabText, activeTab === 'expense' && styles.tabTextActive]}>
                  📉 Ausgaben
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category Breakdown */}
            <CategoryBreakdownSection
              data={activeTab === 'income' ? incomeBreakdown : expenseBreakdown}
              type={activeTab}
            />

            {/* Recent Transactions */}
            <TransactionsList
              transactions={transactions}
              filter={transactionFilter}
              onFilterChange={setTransactionFilter}
            />

            {/* Bottom Spacing */}
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={async (data) => {
          try {
            await addTransaction(data);
            setShowAddModal(false);
            Alert.alert('✅ Erfolg', 'Buchung wurde hinzugefügt');
          } catch (err) {
            Alert.alert('Fehler', err.message);
          }
        }}
      />

      {/* Goal Modal */}
      <GoalModal
        visible={showGoalModal}
        currentGoal={summary?.summary?.goal_amount}
        onClose={() => setShowGoalModal(false)}
        onSubmit={async (amount) => {
          try {
            await updateGoal(amount);
            setShowGoalModal(false);
            Alert.alert('✅ Erfolg', 'Monatsziel wurde gesetzt');
          } catch (err) {
            Alert.alert('Fehler', err.message);
          }
        }}
      />
    </View>
  );
}

// ============ KPI SECTION ============

function KpiSection({ summary }) {
  const { income_total, expense_total, profit, profit_margin } = summary.summary;

  return (
    <View style={styles.kpiContainer}>
      <View style={styles.kpiRow}>
        <KpiCard
          label="Einnahmen"
          value={formatMoney(income_total)}
          color="#10B981"
          emoji="📈"
        />
        <KpiCard
          label="Ausgaben"
          value={formatMoney(expense_total)}
          color="#EF4444"
          emoji="📉"
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label="Gewinn"
          value={formatMoney(profit)}
          color={profit >= 0 ? '#10B981' : '#EF4444'}
          emoji={profit >= 0 ? '💰' : '⚠️'}
        />
        <KpiCard
          label="Marge"
          value={formatPercentage(profit_margin)}
          color="#06B6D4"
          emoji="📊"
        />
      </View>
    </View>
  );
}

// ============ KPI CARD ============

function KpiCard({ label, value, color, emoji }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiEmoji}>{emoji}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

// ============ GOAL PROGRESS ============

function GoalProgressCard({ current, goal, progress, onEdit }) {
  const percentage = Math.min(progress * 100, 100);
  const isAchieved = percentage >= 100;

  return (
    <TouchableOpacity style={styles.goalCard} onPress={onEdit}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalTitle}>
          {isAchieved ? '🎉' : '🎯'} Monatsziel
        </Text>
        <Text style={styles.goalTarget}>{formatMoney(goal)}</Text>
      </View>
      <View style={styles.goalBarContainer}>
        <View 
          style={[
            styles.goalBar, 
            { 
              width: `${percentage}%`,
              backgroundColor: isAchieved ? '#10B981' : '#06b6d4'
            }
          ]} 
        />
      </View>
      <View style={styles.goalFooter}>
        <Text style={[styles.goalCurrent, isAchieved && { color: '#10B981' }]}>
          {formatMoney(current)}
        </Text>
        <Text style={styles.goalPercentage}>
          {percentage.toFixed(1)}% {isAchieved && '✅'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============ REVENUE SECTION ============

function RevenueSection({ data }) {
  // Simple text-based chart for compatibility
  const maxIncome = Math.max(...data.map(d => d.income), 1);
  
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>📈 Umsatz (6 Monate)</Text>
      
      <View style={styles.simpleChart}>
        {data.map((item, index) => {
          const barHeight = (item.income / maxIncome) * 100;
          return (
            <View key={item.month} style={styles.chartBarContainer}>
              <View style={styles.chartBarWrapper}>
                <View 
                  style={[
                    styles.chartBar, 
                    { height: `${Math.max(barHeight, 5)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.chartLabel}>{item.month_label}</Text>
              <Text style={styles.chartValue}>
                {formatMoney(item.income).replace('€', '').trim()}
              </Text>
            </View>
          );
        })}
      </View>
      
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Einnahmen</Text>
        </View>
      </View>
    </View>
  );
}

// ============ CATEGORY BREAKDOWN ============

function CategoryBreakdownSection({ data, type }) {
  if (!data.length) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>📭</Text>
        <Text style={styles.emptyText}>
          Keine {type === 'income' ? 'Einnahmen' : 'Ausgaben'} in diesem Monat
        </Text>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>
        {type === 'income' ? '💰 Einnahmen' : '💸 Ausgaben'} nach Kategorie
      </Text>
      
      {/* Category Bars */}
      {data.map(item => (
        <View key={item.category} style={styles.categoryRow}>
          <View style={styles.categoryInfo}>
            <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
            <Text style={styles.categoryLabel}>{item.category_label}</Text>
          </View>
          <View style={styles.categoryBarContainer}>
            <View 
              style={[
                styles.categoryBar, 
                { 
                  width: `${(item.total / total) * 100}%`,
                  backgroundColor: item.color 
                }
              ]} 
            />
          </View>
          <View style={styles.categoryValues}>
            <Text style={styles.categoryAmount}>{formatMoney(item.total)}</Text>
            <Text style={styles.categoryPercent}>{formatPercentage(item.percentage)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ============ TRANSACTIONS LIST ============

function TransactionsList({ transactions, filter, onFilterChange }) {
  return (
    <View style={styles.transactionsCard}>
      <View style={styles.transactionsHeader}>
        <Text style={styles.chartTitle}>📋 Letzte Buchungen</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterBtn, !filter && styles.filterBtnActive]}
            onPress={() => onFilterChange(null)}
          >
            <Text style={[styles.filterBtnText, !filter && styles.filterBtnTextActive]}>
              Alle
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'income' && styles.filterBtnActive]}
            onPress={() => onFilterChange('income')}
          >
            <Text style={[styles.filterBtnText, filter === 'income' && styles.filterBtnTextActive]}>
              +
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'expense' && styles.filterBtnActive]}
            onPress={() => onFilterChange('expense')}
          >
            <Text style={[styles.filterBtnText, filter === 'expense' && styles.filterBtnTextActive]}>
              -
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyTransactions}>
          <Text style={styles.emptyText}>Noch keine Buchungen</Text>
        </View>
      ) : (
        transactions.slice(0, 15).map((tx, index) => (
          <View 
            key={tx.id} 
            style={[
              styles.transactionRow,
              index === transactions.length - 1 && { borderBottomWidth: 0 }
            ]}
          >
            <View style={styles.transactionIcon}>
              <Text style={styles.transactionEmoji}>
                {CATEGORY_META[tx.category]?.emoji || '📝'}
              </Text>
            </View>
            <View style={styles.transactionContent}>
              <Text style={styles.transactionTitle} numberOfLines={1}>
                {tx.title}
              </Text>
              <Text style={styles.transactionMeta}>
                {tx.category_label} • {getRelativeDate(tx.transaction_date)}
              </Text>
            </View>
            <Text
              style={[
                styles.transactionAmount,
                { color: tx.transaction_type === 'income' ? '#10B981' : '#EF4444' },
              ]}
            >
              {tx.transaction_type === 'income' ? '+' : '-'}
              {formatMoney(tx.amount)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

// ============ ADD TRANSACTION MODAL ============

function AddTransactionModal({ visible, onClose, onSubmit }) {
  const [type, setType] = useState('income');
  const [category, setCategory] = useState('commission');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async () => {
    if (!amount || !title) {
      Alert.alert('Fehler', 'Bitte Betrag und Titel eingeben');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: parseFloat(amount.replace(',', '.')),
        transaction_type: type,
        category,
        title,
      });
      // Reset form
      setAmount('');
      setTitle('');
      setType('income');
      setCategory('commission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Neue Buchung</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
            <Text style={[styles.modalSave, isSubmitting && { opacity: 0.5 }]}>
              {isSubmitting ? '...' : 'Speichern'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Type Toggle */}
          <Text style={styles.inputLabel}>Art</Text>
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'income' && styles.typeButtonActiveIncome]}
              onPress={() => {
                setType('income');
                setCategory('commission');
              }}
            >
              <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>
                📈 Einnahme
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'expense' && styles.typeButtonActiveExpense]}
              onPress={() => {
                setType('expense');
                setCategory('product_purchase');
              }}
            >
              <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>
                📉 Ausgabe
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <Text style={styles.inputLabel}>Betrag (€)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
          />

          {/* Title */}
          <Text style={styles.inputLabel}>Titel</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="z.B. Provision Max Mustermann"
            placeholderTextColor="#64748b"
          />

          {/* Category */}
          <Text style={styles.inputLabel}>Kategorie</Text>
          <View style={styles.categoryGrid}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  category === cat.value && styles.categoryChipActive
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Text style={[
                  styles.categoryChipText,
                  category === cat.value && styles.categoryChipTextActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============ GOAL MODAL ============

function GoalModal({ visible, currentGoal, onClose, onSubmit }) {
  const [amount, setAmount] = useState(currentGoal?.toString() || '5000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Fehler', 'Bitte gültigen Betrag eingeben');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(numAmount);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>🎯 Monatsziel</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
            <Text style={[styles.modalSave, isSubmitting && { opacity: 0.5 }]}>
              {isSubmitting ? '...' : 'Setzen'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <Text style={styles.goalModalDescription}>
            Setze dein monatliches Umsatzziel für {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </Text>

          <Text style={styles.inputLabel}>Ziel-Umsatz (€)</Text>
          <TextInput
            style={[styles.input, styles.goalInput]}
            value={amount}
            onChangeText={setAmount}
            placeholder="5000"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            autoFocus
          />

          <View style={styles.goalPresets}>
            {[3000, 5000, 7500, 10000].map(preset => (
              <TouchableOpacity
                key={preset}
                style={styles.goalPreset}
                onPress={() => setAmount(preset.toString())}
              >
                <Text style={styles.goalPresetText}>{formatMoney(preset)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollView: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 22,
    color: '#f8fafc',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#020617',
    fontWeight: '600',
    fontSize: 14,
  },

  // Error
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 13,
  },

  // Loading
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
  },

  // KPI
  kpiContainer: {
    padding: 20,
    gap: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Goal
  goalCard: {
    marginHorizontal: 20,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
  goalTarget: {
    fontSize: 14,
    color: '#94a3b8',
  },
  goalBarContainer: {
    height: 10,
    backgroundColor: '#1e293b',
    borderRadius: 5,
    overflow: 'hidden',
  },
  goalBar: {
    height: '100%',
    borderRadius: 5,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  goalCurrent: {
    fontSize: 12,
    color: '#06b6d4',
    fontWeight: '600',
  },
  goalPercentage: {
    fontSize: 12,
    color: '#94a3b8',
  },
  setGoalButton: {
    marginHorizontal: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  setGoalButtonText: {
    color: '#94a3b8',
    fontSize: 14,
  },

  // Chart
  chartCard: {
    marginHorizontal: 20,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
  },
  
  // Simple Chart
  simpleChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    marginBottom: 8,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarWrapper: {
    width: 30,
    height: 100,
    justifyContent: 'flex-end',
    backgroundColor: '#1e293b',
    borderRadius: 6,
    overflow: 'hidden',
  },
  chartBar: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 6,
  },
  chartValue: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#94a3b8',
  },

  // Empty
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },

  // Category Breakdown
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  categoryBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  categoryBar: {
    height: '100%',
    borderRadius: 4,
  },
  categoryValues: {
    alignItems: 'flex-end',
    width: 90,
  },
  categoryAmount: {
    fontSize: 12,
    color: '#f8fafc',
    fontWeight: '500',
  },
  categoryPercent: {
    fontSize: 10,
    color: '#64748b',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#06b6d4',
  },
  tabText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#020617',
  },

  // Transactions
  transactionsCard: {
    marginHorizontal: 20,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  filterBtnActive: {
    backgroundColor: '#06b6d4',
  },
  filterBtnText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  filterBtnTextActive: {
    color: '#020617',
  },
  emptyTransactions: {
    padding: 24,
    alignItems: 'center',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionEmoji: {
    fontSize: 16,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '500',
  },
  transactionMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f8fafc',
  },
  modalCancel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  modalSave: {
    fontSize: 16,
    color: '#06b6d4',
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },

  // Input
  inputLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },

  // Type Toggle
  typeToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActiveIncome: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  typeButtonActiveExpense: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#f8fafc',
  },

  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  categoryChipActive: {
    backgroundColor: '#06b6d4',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  categoryChipTextActive: {
    color: '#020617',
    fontWeight: '500',
  },

  // Goal Modal
  goalModalDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  goalInput: {
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  goalPresets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  goalPreset: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  goalPresetText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});

