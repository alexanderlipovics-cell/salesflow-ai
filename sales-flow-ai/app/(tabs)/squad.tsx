// screens/SquadScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LeaderboardEntry } from '../../api/mockApi';
import { useSalesFlow } from '../../context/SalesFlowContext';

// SUB-COMPONENT: RankRow
const RankRow: React.FC<{ member: LeaderboardEntry }> = ({ member }) => {
  const isMe = member.is_me;
  const isTopThree = member.rank <= 3;
  
  // Conditional styling
  const rowStyle = isMe ? styles.myRankRow : styles.rankRow;
  const rankTextStyle = [
    styles.rankText, 
    isTopThree && styles.topRankText,
    isMe && styles.myRankText
  ];

  return (
    <View style={rowStyle}>
      <Text style={rankTextStyle}>{member.rank}.</Text>
      <Text style={[styles.nameText, isMe && styles.myNameText]}>{member.name}</Text>
      <Text style={[styles.teamText, isMe && styles.myTeamText]}>{member.team_name}</Text>
      <Text style={[styles.pointsText, isMe && styles.myPointsText]}>{member.points}</Text>
    </View>
  );
};

// MAIN COMPONENT
export default function SquadScreen() {
  const { squadData, loading, refetchSquad } = useSalesFlow();

  if (loading.squad) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Lade Squad-Daten...</Text>
      </View>
    );
  }

  if (!squadData || !squadData.has_active_challenge) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Keine aktive Challenge gefunden.</Text>
        <TouchableOpacity onPress={refetchSquad} style={styles.refetchButton}>
          <Text style={styles.refetchButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const { challenge, me, leaderboard } = squadData;
  const myRankEntry = leaderboard.find(e => e.is_me);
  const topFive = leaderboard.slice(0, 5);
  const isUserInTopFive = myRankEntry && topFive.includes(myRankEntry);

  return (
    <ScrollView style={styles.container}>
      {/* Challenge Summary Header */}
      <View style={styles.challengeHeader}>
        <Text style={styles.challengeTitle}>{challenge.title}</Text>
        <Text style={styles.challengeMeta}>
          Aktueller Rang: <Text style={styles.myRank}>{me.rank}</Text>
        </Text>
      </View>
      
      {/* Leaderboard Table */}
      <View style={styles.leaderboardContainer}>
        {/* Header Row */}
        <View style={[styles.rankRow, styles.headerRow]}>
          <Text style={styles.headerText}>#</Text>
          <Text style={styles.headerText}>Name</Text>
          <Text style={styles.headerText}>Team</Text>
          <Text style={styles.headerText}>Punkte</Text>
        </View>

        {/* Top 5 Entries */}
        {topFive.map(member => (
          <RankRow key={member.user_id} member={member} />
        ))}

        {/* User's Position (if not in top 5) */}
        {myRankEntry && !isUserInTopFive && (
          <View>
            <View style={styles.spacerRow}>
              <Text style={styles.spacerText}>...</Text>
            </View>
            <RankRow member={myRankEntry} />
          </View>
        )}

        {/* Remaining entries (if user is in top 5, show rest) */}
        {isUserInTopFive && leaderboard.slice(5).map(member => (
          <RankRow key={member.user_id} member={member} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#607D8B',
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    fontWeight: '600',
  },
  
  // Challenge Header
  challengeHeader: {
    padding: 20,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  challengeMeta: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  myRank: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  
  // Leaderboard Container
  leaderboardContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  
  // Row Styles
  rankRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  headerRow: {
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    paddingVertical: 10,
  },
  myRankRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
    backgroundColor: '#FFFDE7',      // Light yellow background
    borderLeftWidth: 5,
    borderLeftColor: '#FFC107',      // Gold accent
    borderRadius: 4,
    marginVertical: 2,
  },
  
  // Column Styles
  rankText: {
    width: 40,
    fontSize: 16,
    fontWeight: '500',
    color: '#607D8B',
    textAlign: 'center',
  },
  topRankText: {
    fontWeight: 'bold',
    color: '#FF9800',                // Gold for Top 3
  },
  myRankText: {
    color: '#FFC107',                // Extra accent for user's rank
    fontWeight: 'bold',
  },
  nameText: {
    flex: 3,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  myNameText: {
    fontWeight: 'bold',
    color: '#FFC107',
  },
  teamText: {
    flex: 1.5,
    fontSize: 14,
    color: '#757575',
  },
  myTeamText: {
    color: '#FF9800',
    fontWeight: '500',
  },
  pointsText: {
    flex: 1.5,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
    textAlign: 'right',
  },
  myPointsText: {
    color: '#FF9800',
  },
  headerText: {
    fontWeight: 'bold',
    color: '#607D8B',
    fontSize: 14,
  },
  
  // Spacer for "..."
  spacerRow: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  spacerText: {
    fontSize: 18,
    color: '#ccc',
  },
  refetchButton: {
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  refetchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
