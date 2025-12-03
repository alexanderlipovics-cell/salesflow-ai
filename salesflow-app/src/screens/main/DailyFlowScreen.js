/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - DAILY FLOW SCREEN                                        ║
 * ║  Tagesplan-Ansicht mit Actions, Fortschritt und Quick-Actions             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useDailyFlow } from '../../hooks/useDailyFlow';
import { useFollowUps } from '../../hooks/useFollowUps';
import { useTodaysContactPlans } from '../../hooks/useContactPlans';
import {
  getActionTypeConfig,
  getChannelConfig,
  getStateColor,
  getStateLabel,
  formatTime,
  formatDate,
  DAILY_FLOW_STATES,
} from '../../types/dailyFlow';
import { QuickLogWidget } from '../../components/outreach';

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ProgressBar = ({ progress, done, total }) => (
  <View style={styles.progressContainer}>
    <View style={styles.progressHeader}>
      <Text style={styles.progressTitle}>Tagesfortschritt</Text>
      <Text style={styles.progressText}>
        {done}/{total} ({progress}%)
      </Text>
    </View>
    <View style={styles.progressBar}>
      <View 
        style={[
          styles.progressFill, 
          { width: `${Math.min(progress, 100)}%` },
          progress >= 80 && styles.progressFillComplete,
        ]} 
      />
    </View>
    {progress >= 80 && (
      <Text style={styles.progressSuccess}>🎉 Tagesziel erreicht!</Text>
    )}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// GOAL SUMMARY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const GoalSummary = ({ config, plan }) => {
  if (!config || !plan) return null;

  return (
    <View style={styles.goalSummary}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalIcon}>🎯</Text>
        <Text style={styles.goalTitle}>
          Ziel: {config.target_deals_per_period} Abschlüsse/Monat
        </Text>
      </View>
      <View style={styles.goalStats}>
        <View style={styles.goalStat}>
          <Text style={styles.goalStatNumber}>{plan.planned_new_contacts}</Text>
          <Text style={styles.goalStatLabel}>Neue Kontakte</Text>
        </View>
        <View style={styles.goalStatDivider} />
        <View style={styles.goalStat}>
          <Text style={styles.goalStatNumber}>{plan.planned_followups}</Text>
          <Text style={styles.goalStatLabel}>Follow-ups</Text>
        </View>
        <View style={styles.goalStatDivider} />
        <View style={styles.goalStat}>
          <Text style={styles.goalStatNumber}>{plan.planned_actions_total}</Text>
          <Text style={styles.goalStatLabel}>Gesamt</Text>
        </View>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ACTION CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ActionCard = ({ action, onComplete, onSkip, onSnooze, onStart }) => {
  const typeConfig = getActionTypeConfig(action.action_type);
  const channelConfig = getChannelConfig(action.channel);
  const isDone = action.status === 'done';
  const isSkipped = action.status === 'skipped';
  const isSnoozed = action.status === 'snoozed';
  const isInProgress = action.status === 'in_progress';
  const isPending = action.status === 'pending';

  return (
    <View style={[
      styles.actionCard,
      isDone && styles.actionCardDone,
      isSkipped && styles.actionCardSkipped,
      isSnoozed && styles.actionCardSnoozed,
      isInProgress && styles.actionCardInProgress,
    ]}>
      {/* Header */}
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconContainer, { backgroundColor: typeConfig.bgColor }]}>
          <Text style={styles.actionIcon}>{typeConfig.icon}</Text>
        </View>
        <View style={styles.actionInfo}>
          <Text style={[
            styles.actionTitle, 
            isDone && styles.actionTitleDone,
            isSkipped && styles.actionTitleSkipped,
          ]}>
            {action.title}
          </Text>
          {action.description && (
            <Text style={styles.actionDescription} numberOfLines={2}>
              {action.description}
            </Text>
          )}
          <View style={styles.actionMeta}>
            <Text style={styles.actionMetaText}>
              {channelConfig.icon} {channelConfig.label}
            </Text>
            <Text style={styles.actionMetaDot}>•</Text>
            <Text style={styles.actionMetaText}>
              {formatTime(action.due_at)}
            </Text>
            {action.lead_name && (
              <>
                <Text style={styles.actionMetaDot}>•</Text>
                <Text style={styles.actionMetaText}>
                  {action.lead_name}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Buttons für Pending Actions */}
      {isPending && (
        <View style={styles.actionButtons}>
          <Pressable 
            style={styles.btnDone} 
            onPress={onComplete}
          >
            <Text style={styles.btnDoneText}>✓ Erledigt</Text>
          </Pressable>
          <Pressable 
            style={styles.btnSecondary} 
            onPress={onSkip}
          >
            <Text style={styles.btnSecondaryText}>Skip</Text>
          </Pressable>
          <Pressable 
            style={styles.btnSecondary} 
            onPress={onSnooze}
          >
            <Text style={styles.btnSecondaryText}>⏰</Text>
          </Pressable>
        </View>
      )}

      {/* In Progress Status */}
      {isInProgress && (
        <View style={styles.actionButtons}>
          <Pressable 
            style={styles.btnDone} 
            onPress={onComplete}
          >
            <Text style={styles.btnDoneText}>✓ Abschließen</Text>
          </Pressable>
        </View>
      )}

      {/* Status Badges */}
      {isDone && (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>✓ Erledigt</Text>
        </View>
      )}
      {isSkipped && action.skip_reason && (
        <View style={[styles.statusBadge, styles.statusBadgeSkipped]}>
          <Text style={styles.statusBadgeTextSkipped}>
            ⏭️ {action.skip_reason}
          </Text>
        </View>
      )}
      {isSnoozed && (
        <View style={[styles.statusBadge, styles.statusBadgeSnoozed]}>
          <Text style={styles.statusBadgeTextSnoozed}>
            ⏰ Verschoben auf {formatDate(action.snoozed_until)}
          </Text>
        </View>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const SectionHeader = ({ title, count, icon, color = '#f8fafc' }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionIcon}>{icon}</Text>
    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
    {count !== undefined && (
      <View style={[styles.sectionBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.sectionBadgeText, { color }]}>{count}</Text>
      </View>
    )}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const EmptyState = ({ icon, title, subtitle, buttonText, onPress }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{subtitle}</Text>
    {buttonText && onPress && (
      <Pressable style={styles.emptyButton} onPress={onPress}>
        <Text style={styles.emptyButtonText}>{buttonText}</Text>
      </Pressable>
    )}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// SKIP REASON MODAL
// ═══════════════════════════════════════════════════════════════════════════

const SkipReasonModal = ({ visible, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  
  const QUICK_REASONS = [
    'Nicht erreichbar',
    'Kein Interesse',
    'Falscher Zeitpunkt',
    'Bereits kontaktiert',
    'Sonstiges',
  ];

  const handleSubmit = (selectedReason) => {
    onSubmit(selectedReason || reason);
    setReason('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Grund angeben</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Warum überspringst du diese Aktion?
          </Text>
          
          <View style={styles.quickReasons}>
            {QUICK_REASONS.map((r) => (
              <Pressable 
                key={r} 
                style={styles.quickReasonChip}
                onPress={() => handleSubmit(r)}
              >
                <Text style={styles.quickReasonText}>{r}</Text>
              </Pressable>
            ))}
          </View>
          
          <TextInput
            style={styles.modalInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Oder eigenen Grund eingeben..."
            placeholderTextColor="#64748b"
          />
          
          <Pressable 
            style={[styles.modalButton, !reason && styles.modalButtonDisabled]}
            onPress={() => handleSubmit(reason)}
            disabled={!reason}
          >
            <Text style={styles.modalButtonText}>Überspringen</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function DailyFlowScreen({ navigation }) {
  const {
    config,
    isConfigured,
    plan,
    planState,
    isCompleted,
    pendingActions,
    completedActions,
    skippedActions,
    snoozedActions,
    progress,
    actionsRemaining,
    isLoading,
    isGenerating,
    isUpdating,
    error,
    refetch,
    generatePlan,
    completeAction,
    skipAction,
    snoozeAction,
  } = useDailyFlow();
  
  // Follow-ups Integration
  const {
    grouped: followUpGroups,
    dailyFlowFollowUps,
    stats: followUpStats,
    toggleComplete: toggleFollowUpComplete,
    refetch: refetchFollowUps,
    loading: followUpsLoading,
  } = useFollowUps();
  
  // Contact Plans Integration (aus Chat-Import)
  const {
    plans: contactPlans,
    stats: contactPlanStats,
    refetch: refetchContactPlans,
    completeContactPlan,
    getActionTypeIcon,
    getActionTypeLabel,
    getActionTypeColor,
  } = useTodaysContactPlans();

  const [refreshing, setRefreshing] = useState(false);
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Kombinierte Stats für Header
  const combinedStats = useMemo(() => {
    const dailyActionsCount = pendingActions?.length || 0;
    const followUpsCount = (followUpGroups?.today?.length || 0) + (followUpGroups?.overdue?.length || 0);
    const contactPlansCount = contactPlans?.length || 0;
    const paymentChecks = contactPlanStats?.checkPayment || 0;
    return {
      totalTasks: dailyActionsCount + followUpsCount + contactPlansCount,
      dailyActions: dailyActionsCount,
      followUps: followUpsCount,
      overdueFollowUps: followUpGroups?.overdue?.length || 0,
      contactPlans: contactPlansCount,
      paymentChecks: paymentChecks,
    };
  }, [pendingActions, followUpGroups, contactPlans, contactPlanStats]);

  // Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchFollowUps(), refetchContactPlans()]);
    setRefreshing(false);
  }, [refetch, refetchFollowUps, refetchContactPlans]);

  // Action Handlers
  const handleComplete = useCallback(async (actionId) => {
    try {
      await completeAction(actionId);
    } catch (err) {
      Alert.alert('Fehler', 'Action konnte nicht abgeschlossen werden.');
    }
  }, [completeAction]);

  const handleSkipPress = useCallback((actionId) => {
    setSelectedActionId(actionId);
    setSkipModalVisible(true);
  }, []);

  const handleSkipSubmit = useCallback(async (reason) => {
    if (selectedActionId && reason) {
      try {
        await skipAction(selectedActionId, reason);
      } catch (err) {
        Alert.alert('Fehler', 'Action konnte nicht übersprungen werden.');
      }
    }
    setSelectedActionId(null);
  }, [selectedActionId, skipAction]);

  const handleSnooze = useCallback(async (actionId) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    try {
      await snoozeAction(actionId, tomorrow.toISOString());
    } catch (err) {
      Alert.alert('Fehler', 'Action konnte nicht verschoben werden.');
    }
  }, [snoozeAction]);

  // Loading State
  if (isLoading && !plan) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>
          {isGenerating ? 'Plan wird generiert...' : 'Daily Flow lädt...'}
        </Text>
      </View>
    );
  }

  // Not Configured State
  if (!isConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎯 Daily Flow</Text>
          <Text style={styles.headerDate}>{formatDate(new Date().toISOString())}</Text>
        </View>
        <EmptyState
          icon="⚙️"
          title="Daily Flow einrichten"
          subtitle="Sag mir dein Monatsziel und ich plane dir jeden Tag die richtigen Aktionen, um es zu erreichen."
          buttonText="Ziel festlegen"
          onPress={() => navigation.navigate('DailyFlowSetup')}
        />
      </View>
    );
  }

  // No Plan State
  if (!plan || planState === 'BLOCKED') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎯 Daily Flow</Text>
          <Text style={styles.headerDate}>{formatDate(new Date().toISOString())}</Text>
        </View>
        <EmptyState
          icon={planState === 'BLOCKED' ? '🚫' : '📋'}
          title={planState === 'BLOCKED' ? 'Keine Leads verfügbar' : 'Kein Plan für heute'}
          subtitle={planState === 'BLOCKED' 
            ? 'Füge neue Leads hinzu, um deinen Tagesplan zu füllen.'
            : 'Generiere jetzt deinen Tagesplan basierend auf deinen Zielen.'}
          buttonText={planState === 'BLOCKED' ? 'Leads hinzufügen' : 'Plan generieren'}
          onPress={planState === 'BLOCKED' 
            ? () => navigation.navigate('Leads')
            : generatePlan}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🎯 Daily Flow</Text>
          <Pressable 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('DailyFlowSetup')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </Pressable>
        </View>
        <Text style={styles.headerDate}>{formatDate(new Date().toISOString())}</Text>
        <View style={[styles.stateBadge, { backgroundColor: getStateColor(planState) + '20' }]}>
          <Text style={[styles.stateBadgeText, { color: getStateColor(planState) }]}>
            {getStateLabel(planState)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || isUpdating} 
            onRefresh={onRefresh}
            tintColor="#06b6d4"
          />
        }
      >
        {/* Progress */}
        <ProgressBar
          progress={progress}
          done={plan.actions_done}
          total={plan.planned_actions_total}
        />

        {/* Goal Summary */}
        <GoalSummary config={config} plan={plan} />
        
        {/* ═══════════════════════════════════════════════════════════════════
            FOLLOW-UPS SECTION - Direkt aus Follow-ups Screen integriert
        ═══════════════════════════════════════════════════════════════════ */}
        {combinedStats.followUps > 0 && (
          <View style={styles.followUpSection}>
            <View style={styles.followUpHeader}>
              <View style={styles.followUpHeaderLeft}>
                <Text style={styles.followUpIcon}>📋</Text>
                <Text style={styles.followUpTitle}>Follow-ups heute</Text>
              </View>
              <View style={styles.followUpBadge}>
                <Text style={styles.followUpBadgeText}>{combinedStats.followUps}</Text>
              </View>
            </View>
            
            {/* Überfällige Follow-ups */}
            {followUpGroups.overdue?.length > 0 && (
              <View style={styles.followUpCategory}>
                <Text style={styles.followUpCategoryLabel}>
                  ⚠️ Überfällig ({followUpGroups.overdue.length})
                </Text>
                {followUpGroups.overdue.map((followUp) => (
                  <Pressable
                    key={followUp.id}
                    style={[styles.followUpCard, styles.followUpCardOverdue]}
                    onPress={() => navigation.navigate('FollowUps')}
                  >
                    <View style={styles.followUpCardContent}>
                      <View style={styles.followUpLeadInfo}>
                        <Text style={styles.followUpLeadName}>{followUp.lead_name}</Text>
                        <Text style={styles.followUpDescription} numberOfLines={1}>
                          {followUp.description}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.followUpCheckbox}
                        onPress={() => toggleFollowUpComplete(followUp.id)}
                      >
                        <Text style={styles.followUpCheckboxText}>✓</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            
            {/* Heute fällige Follow-ups */}
            {followUpGroups.today?.length > 0 && (
              <View style={styles.followUpCategory}>
                <Text style={styles.followUpCategoryLabel}>
                  📅 Heute ({followUpGroups.today.length})
                </Text>
                {followUpGroups.today.map((followUp) => (
                  <Pressable
                    key={followUp.id}
                    style={styles.followUpCard}
                    onPress={() => navigation.navigate('FollowUps')}
                  >
                    <View style={styles.followUpCardContent}>
                      <View style={styles.followUpLeadInfo}>
                        <Text style={styles.followUpLeadName}>{followUp.lead_name}</Text>
                        <Text style={styles.followUpDescription} numberOfLines={1}>
                          {followUp.description}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.followUpCheckbox}
                        onPress={() => toggleFollowUpComplete(followUp.id)}
                      >
                        <Text style={styles.followUpCheckboxText}>✓</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            
            {/* Link zu allen Follow-ups */}
            <Pressable
              style={styles.viewAllFollowUps}
              onPress={() => navigation.navigate('FollowUps')}
            >
              <Text style={styles.viewAllFollowUpsText}>
                Alle Follow-ups anzeigen →
              </Text>
            </Pressable>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CONTACT PLANS SECTION - Aus Chat-Import System
        ═══════════════════════════════════════════════════════════════════ */}
        {contactPlans?.length > 0 && (
          <View style={styles.contactPlansSection}>
            <View style={styles.contactPlansHeader}>
              <View style={styles.contactPlansHeaderLeft}>
                <Text style={styles.contactPlansIcon}>📥</Text>
                <Text style={styles.contactPlansTitle}>Contact Plans</Text>
              </View>
              <View style={styles.contactPlansBadge}>
                <Text style={styles.contactPlansBadgeText}>{contactPlans.length}</Text>
              </View>
            </View>
            
            {/* Zahlungs-Checks zuerst (wichtig!) */}
            {contactPlanStats?.checkPayment > 0 && (
              <View style={styles.paymentCheckBanner}>
                <Text style={styles.paymentCheckIcon}>💳</Text>
                <Text style={styles.paymentCheckText}>
                  {contactPlanStats.checkPayment} Zahlung{contactPlanStats.checkPayment > 1 ? 'en' : ''} prüfen
                </Text>
              </View>
            )}
            
            {/* Contact Plan Cards */}
            {contactPlans.map((plan) => (
              <Pressable
                key={plan.id}
                style={[
                  styles.contactPlanCard,
                  plan.isOverdue && styles.contactPlanCardOverdue,
                  plan.action_type === 'check_payment' && styles.contactPlanCardPayment,
                ]}
                onPress={() => {
                  if (plan.suggested_message) {
                    Alert.alert(
                      `${getActionTypeIcon(plan.action_type)} ${plan.lead_name || 'Lead'}`,
                      plan.suggested_message,
                      [
                        { text: 'Abbrechen', style: 'cancel' },
                        { text: 'Text kopieren', onPress: () => {
                          // Clipboard copy würde hier kommen
                        }},
                        { text: '✓ Erledigt', onPress: () => completeContactPlan(plan.id) },
                      ]
                    );
                  }
                }}
              >
                <View style={styles.contactPlanCardContent}>
                  <View style={[
                    styles.contactPlanTypeIcon,
                    { backgroundColor: getActionTypeColor(plan.action_type) + '20' }
                  ]}>
                    <Text style={styles.contactPlanTypeEmoji}>
                      {getActionTypeIcon(plan.action_type)}
                    </Text>
                  </View>
                  <View style={styles.contactPlanInfo}>
                    <Text style={styles.contactPlanLeadName}>
                      {plan.lead_name || 'Unbekannt'}
                    </Text>
                    <Text style={styles.contactPlanAction} numberOfLines={1}>
                      {getActionTypeLabel(plan.action_type)}
                      {plan.action_description && ` • ${plan.action_description}`}
                    </Text>
                    {plan.isOverdue && (
                      <Text style={styles.contactPlanOverdueLabel}>
                        ⚠️ Überfällig ({plan.days_overdue || 1} Tag{(plan.days_overdue || 1) > 1 ? 'e' : ''})
                      </Text>
                    )}
                  </View>
                  <Pressable
                    style={styles.contactPlanCheckbox}
                    onPress={() => completeContactPlan(plan.id)}
                  >
                    <Text style={styles.contactPlanCheckboxText}>✓</Text>
                  </Pressable>
                </View>
                
                {/* Vorgeschlagene Nachricht Preview */}
                {plan.suggested_message && (
                  <View style={styles.contactPlanMessagePreview}>
                    <Text style={styles.contactPlanMessageText} numberOfLines={2}>
                      💬 {plan.suggested_message}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Offen"
              count={pendingActions.length}
              icon="📌"
              color="#f59e0b"
            />
            {pendingActions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onComplete={() => handleComplete(action.id)}
                onSkip={() => handleSkipPress(action.id)}
                onSnooze={() => handleSnooze(action.id)}
              />
            ))}
          </View>
        )}

        {/* All Done Banner */}
        {pendingActions.length === 0 && completedActions.length > 0 && (
          <View style={styles.allDoneBanner}>
            <Text style={styles.allDoneIcon}>🎉</Text>
            <Text style={styles.allDoneTitle}>Tagesziel erreicht!</Text>
            <Text style={styles.allDoneText}>
              Du hast alle Aktionen für heute abgeschlossen. Großartige Arbeit!
            </Text>
          </View>
        )}

        {/* Completed Toggle */}
        {completedActions.length > 0 && (
          <Pressable 
            style={styles.toggleSection}
            onPress={() => setShowCompleted(!showCompleted)}
          >
            <Text style={styles.toggleText}>
              {showCompleted ? '▼' : '▶'} Erledigte anzeigen ({completedActions.length})
            </Text>
          </Pressable>
        )}

        {/* Completed Actions */}
        {showCompleted && completedActions.length > 0 && (
          <View style={styles.section}>
            {completedActions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onComplete={() => {}}
                onSkip={() => {}}
                onSnooze={() => {}}
              />
            ))}
          </View>
        )}

        {/* Snoozed Actions */}
        {snoozedActions.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Verschoben"
              count={snoozedActions.length}
              icon="⏰"
              color="#64748b"
            />
            {snoozedActions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onComplete={() => handleComplete(action.id)}
                onSkip={() => {}}
                onSnooze={() => {}}
              />
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating CHIEF Button */}
      <Pressable 
        style={styles.chiefFab}
        onPress={() => navigation.navigate('Chat', { 
          initialMessage: `Wie stehe ich heute? Ich habe ${plan.actions_done}/${plan.planned_actions_total} Aktionen erledigt.`,
          context: {
            dailyFlow: {
              progress,
              pending: pendingActions.length,
              completed: completedActions.length,
              planState,
            }
          }
        })}
      >
        <Text style={styles.chiefFabText}>🧠</Text>
        <Text style={styles.chiefFabLabel}>CHIEF</Text>
      </Pressable>

      {/* Skip Reason Modal */}
      <SkipReasonModal
        visible={skipModalVisible}
        onClose={() => {
          setSkipModalVisible(false);
          setSelectedActionId(null);
        }}
        onSubmit={handleSkipSubmit}
      />

      {/* Quick-Log Widget für Outreach Tracking */}
      <QuickLogWidget style={styles.quickLogWidget} />
    </View>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  headerDate: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  stateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  stateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  progressContainer: {
    margin: 16,
    padding: 20,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#06b6d4',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#06b6d4',
    borderRadius: 6,
  },
  progressFillComplete: {
    backgroundColor: '#10b981',
  },
  progressSuccess: {
    marginTop: 12,
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    textAlign: 'center',
  },
  goalSummary: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#06b6d4',
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  goalStat: {
    alignItems: 'center',
  },
  goalStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  goalStatLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  goalStatDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionCardDone: {
    opacity: 0.7,
    borderColor: '#10b981',
  },
  actionCardSkipped: {
    opacity: 0.5,
    borderColor: '#64748b',
  },
  actionCardSnoozed: {
    opacity: 0.7,
    borderColor: '#f59e0b',
  },
  actionCardInProgress: {
    borderColor: '#06b6d4',
    borderWidth: 2,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  actionTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  actionTitleSkipped: {
    color: '#64748b',
  },
  actionDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  actionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  actionMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  actionMetaDot: {
    fontSize: 12,
    color: '#475569',
    marginHorizontal: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  btnDone: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDoneText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  btnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  statusBadge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#10b981' + '20',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  statusBadgeSkipped: {
    backgroundColor: '#64748b' + '20',
  },
  statusBadgeTextSkipped: {
    color: '#94a3b8',
    fontSize: 12,
  },
  statusBadgeSnoozed: {
    backgroundColor: '#f59e0b' + '20',
  },
  statusBadgeTextSnoozed: {
    color: '#f59e0b',
    fontSize: 12,
  },
  toggleSection: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#0f172a',
    borderRadius: 12,
  },
  toggleText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  allDoneBanner: {
    margin: 16,
    padding: 32,
    backgroundColor: '#10b981' + '15',
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981' + '40',
  },
  allDoneIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  allDoneTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  allDoneText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: '#06b6d4',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: '#020617',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomSpacer: {
    height: 100,
  },
  // CHIEF FAB Button
  chiefFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#0891b2',
  },
  chiefFabText: {
    fontSize: 24,
    marginBottom: -4,
  },
  chiefFabLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#020617',
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
    padding: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },
  quickReasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickReasonChip: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickReasonText: {
    color: '#f8fafc',
    fontSize: 13,
  },
  modalInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#f8fafc',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: '#020617',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FOLLOW-UP SECTION STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  
  followUpSection: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  followUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  followUpHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followUpIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  followUpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  followUpBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  followUpBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  followUpCategory: {
    marginBottom: 12,
  },
  followUpCategoryLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: '600',
  },
  followUpCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  followUpCardOverdue: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  followUpCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  followUpLeadInfo: {
    flex: 1,
    marginRight: 12,
  },
  followUpLeadName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  followUpDescription: {
    fontSize: 13,
    color: '#94a3b8',
  },
  followUpCheckbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followUpCheckboxText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllFollowUps: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 10,
  },
  viewAllFollowUpsText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Contact Plans Styles
  contactPlansSection: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  contactPlansHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactPlansHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactPlansIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  contactPlansTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  contactPlansBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  contactPlansBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentCheckBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  paymentCheckIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  paymentCheckText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
  },
  contactPlanCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactPlanCardOverdue: {
    borderColor: '#ef4444',
    backgroundColor: '#ef444410',
  },
  contactPlanCardPayment: {
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b10',
  },
  contactPlanCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactPlanTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactPlanTypeEmoji: {
    fontSize: 20,
  },
  contactPlanInfo: {
    flex: 1,
  },
  contactPlanLeadName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  contactPlanAction: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  contactPlanOverdueLabel: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    fontWeight: '500',
  },
  contactPlanCheckbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b98120',
    borderWidth: 2,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactPlanCheckboxText: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: 'bold',
  },
  contactPlanMessagePreview: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  contactPlanMessageText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  
  quickLogWidget: {
    bottom: 160, // Über dem CHIEF-Button
  },
});

