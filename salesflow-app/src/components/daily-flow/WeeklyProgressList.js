/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - WEEKLY PROGRESS LIST                                     ║
 * ║  Wochen-Übersicht Komponente für Daily Flow                               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Weekly Progress List
 * Zeigt den Wochenfortschritt für alle Aktivitätstypen
 * 
 * @param {Object} props
 * @param {Object} props.weekly - Weekly Status Object mit new_contacts, followups, reactivations
 * @param {string} [props.weekStart] - Wochenstart-Datum
 */
const WeeklyProgressList = ({ weekly, weekStart }) => {
  if (!weekly) return null;

  const formatWeekRange = (startDate) => {
    if (!startDate) return 'Diese Woche';
    
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    return `${start.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Wochenfortschritt</Text>
        <Text style={styles.dateRange}>{formatWeekRange(weekStart)}</Text>
      </View>
      
      <View style={styles.list}>
        <WeeklyProgressRow
          label="Neue Kontakte"
          done={weekly.new_contacts?.done || 0}
          target={weekly.new_contacts?.target || 0}
          color="#10B981"
          emoji="👋"
        />
        <WeeklyProgressRow
          label="Follow-ups"
          done={weekly.followups?.done || 0}
          target={weekly.followups?.target || 0}
          color="#06B6D4"
          emoji="📞"
        />
        <WeeklyProgressRow
          label="Reaktivierungen"
          done={weekly.reactivations?.done || 0}
          target={weekly.reactivations?.target || 0}
          color="#8B5CF6"
          emoji="🔄"
        />
      </View>
      
      {/* Overall Weekly Progress */}
      <View style={styles.overallContainer}>
        <WeeklyOverall weekly={weekly} />
      </View>
    </View>
  );
};

/**
 * Single Weekly Progress Row
 */
const WeeklyProgressRow = ({ label, done, target, color, emoji }) => {
  const doneInt = Math.round(done);
  const targetInt = Math.round(target);
  const percentage = target > 0 ? Math.round((done / target) * 100) : 0;
  const ratio = target > 0 ? Math.min(done / target, 1) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowEmoji}>{emoji}</Text>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        <View style={styles.miniBar}>
          <View
            style={[
              styles.miniBarFill,
              { width: `${ratio * 100}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={styles.rowCount}>
          {doneInt}/{targetInt}
        </Text>
        <Text style={[styles.rowPercent, percentage >= 100 && { color }]}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
};

/**
 * Weekly Overall Summary
 */
const WeeklyOverall = ({ weekly }) => {
  const totalDone =
    (weekly.new_contacts?.done || 0) +
    (weekly.followups?.done || 0) +
    (weekly.reactivations?.done || 0);
  const totalTarget =
    (weekly.new_contacts?.target || 0) +
    (weekly.followups?.target || 0) +
    (weekly.reactivations?.target || 0);
  
  const percentage = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
  
  let statusEmoji = '🔴';
  let statusColor = '#EF4444';
  if (percentage >= 100) {
    statusEmoji = '🏆';
    statusColor = '#22C55E';
  } else if (percentage >= 80) {
    statusEmoji = '🟢';
    statusColor = '#10B981';
  } else if (percentage >= 60) {
    statusEmoji = '🟡';
    statusColor = '#F59E0B';
  } else if (percentage >= 40) {
    statusEmoji = '🟠';
    statusColor = '#F97316';
  }

  return (
    <View style={styles.overallRow}>
      <View style={styles.overallLeft}>
        <Text style={styles.overallEmoji}>{statusEmoji}</Text>
        <Text style={styles.overallLabel}>Gesamt</Text>
      </View>
      <View style={styles.overallRight}>
        <Text style={styles.overallCount}>
          {Math.round(totalDone)}/{Math.round(totalTarget)}
        </Text>
        <Text style={[styles.overallPercent, { color: statusColor }]}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
};

/**
 * Kompakte Weekly Summary Card
 */
export const WeeklySummaryCard = ({ weekly, weekStart }) => {
  if (!weekly) return null;

  const totalDone =
    (weekly.new_contacts?.done || 0) +
    (weekly.followups?.done || 0) +
    (weekly.reactivations?.done || 0);
  const totalTarget =
    (weekly.new_contacts?.target || 0) +
    (weekly.followups?.target || 0) +
    (weekly.reactivations?.target || 0);
  
  const percentage = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Diese Woche</Text>
      <View style={styles.summaryContent}>
        <Text style={styles.summaryPercent}>{percentage}%</Text>
        <Text style={styles.summaryCount}>
          {Math.round(totalDone)} von {Math.round(totalTarget)} Aktivitäten
        </Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  dateRange: {
    fontSize: 12,
    color: '#94a3b8',
  },
  list: {
    gap: 12,
  },
  
  // Row Styles
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBar: {
    width: 60,
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  rowCount: {
    fontSize: 12,
    color: '#94a3b8',
    width: 45,
    textAlign: 'right',
  },
  rowPercent: {
    fontSize: 12,
    color: '#f8fafc',
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  
  // Overall Styles
  overallContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overallEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  overallLabel: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '600',
  },
  overallRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overallCount: {
    fontSize: 13,
    color: '#94a3b8',
  },
  overallPercent: {
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Summary Card Styles
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
  },
  summaryTitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  summaryPercent: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
  },
  summaryCount: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default WeeklyProgressList;

