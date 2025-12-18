/**
 * RankProgressCard - Shows current Zinzino rank and progress to next rank
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ZinzinoRankProgress } from '../../hooks/useZinzinoMLM';
import { ZINZINO_ALL_RANKS } from '../../data/zinzinoRanks';

interface Props {
  progress: ZinzinoRankProgress;
}

export default function RankProgressCard({ progress }: Props) {
  const currentRankObj = ZINZINO_ALL_RANKS.find(r => r.nameDE === progress.current_rank);
  const nextRankObj = progress.next_rank 
    ? ZINZINO_ALL_RANKS.find(r => r.nameDE === progress.next_rank)
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.rankIcon}>{currentRankObj?.icon || '👤'}</Text>
        <View style={styles.rankInfo}>
          <Text style={styles.currentRank}>{progress.current_rank}</Text>
          {progress.next_rank && (
            <Text style={styles.nextRank}>→ {progress.next_rank}</Text>
          )}
        </View>
      </View>

      {progress.next_rank && (
        <>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress.progress_percent}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progress.progress_percent)}% zum nächsten Rang
          </Text>

          {Object.keys(progress.missing).length > 0 && (
            <View style={styles.missingContainer}>
              <Text style={styles.missingTitle}>Noch benötigt:</Text>
              {progress.missing.customer_points && (
                <Text style={styles.missingItem}>
                  {progress.missing.customer_points} Customer Points
                </Text>
              )}
              {progress.missing.mcv && (
                <Text style={styles.missingItem}>
                  {progress.missing.mcv} MCV
                </Text>
              )}
              {progress.missing.pcp && (
                <Text style={styles.missingItem}>
                  {progress.missing.pcp} PCP
                </Text>
              )}
            </View>
          )}
        </>
      )}

      {!progress.next_rank && (
        <Text style={styles.maxRank}>🏆 Maximaler Rang erreicht!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  rankInfo: {
    flex: 1,
  },
  currentRank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  nextRank: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  missingContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  missingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  missingItem: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },
  maxRank: {
    fontSize: 14,
    color: '#10B981',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
  },
});

