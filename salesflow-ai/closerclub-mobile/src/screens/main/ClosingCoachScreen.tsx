import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Collapsible from 'react-native-collapsible';
import { mobileApi } from '../../services/api';

// --- TYPES & MOCK DATA ---

interface Blocker {
  issue: string;
  severity: 'high' | 'medium' | 'low';
  context: string;
}

interface Strategy {
  name: string;
  script: string;
  focus: string; // e.g., 'Risk Reduction', 'Timeline Pressure'
}

interface ClosingInsight {
  id: string;
  deal_name: string;
  account: string;
  closing_score: number; // 0-100
  probability: number; // 0-100
  blockers: Blocker[];
  strategies: Strategy[];
  last_analyzed: string;
}

const MOCK_DEALS: ClosingInsight[] = [
  {
    id: 'D101',
    deal_name: 'Renewal: Enterprise Corp',
    account: 'Enterprise Corp',
    closing_score: 85,
    probability: 90,
    blockers: [
      { issue: 'Legal Review Pending', severity: 'medium', context: 'Standard T&C check, 3 days outstanding.' },
    ],
    strategies: [
      { name: 'Commitment Anchor', script: 'Hallo [Name], basierend auf unserem [Datum] Gespräch, senden Sie bitte das unterzeichnete Dokument bis [Datum] zurück, um das Q4-Onboarding zu sichern.', focus: 'Timeline Pressure' },
      { name: 'Risk Reversal', script: 'Wir bieten eine 30-tägige Geld-zurück-Garantie, falls [Risiko] eintritt.', focus: 'Risk Reduction' },
    ],
    last_analyzed: '2025-12-07T10:00:00Z',
  },
  {
    id: 'D102',
    deal_name: 'New Business: Startup X',
    account: 'Startup X',
    closing_score: 45,
    probability: 30,
    blockers: [
      { issue: 'Budget Not Allocated', severity: 'high', context: 'CTO expressed need, but finance approval is missing.' },
      { issue: 'Competitive Threat (Vendor Y)', severity: 'high', context: 'They are trialing Vendor Y next week.' },
    ],
    strategies: [
      { name: 'Economic Buyer Access', script: 'Könnten Sie mich bitte mit der Person verbinden, die die Budgetvergabe für dieses Quartal finalisiert?', focus: 'Authority/Budget' },
    ],
    last_analyzed: '2025-12-07T10:00:00Z',
  },
];

// --- STYLING HELPERS ---

const getScoreColor = (score: number) => {
  if (score > 70) return { backgroundColor: '#E8F5E9', borderColor: '#4CAF50', scoreBg: '#4CAF50' }; // Green
  if (score >= 50) return { backgroundColor: '#FFF8E1', borderColor: '#FFC107', scoreBg: '#FFC107' }; // Yellow
  return { backgroundColor: '#FFEBEE', borderColor: '#F44336', scoreBg: '#F44336' }; // Red
};

const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
  if (severity === 'high') return { bg: '#F44336', text: '#FFF' };
  if (severity === 'medium') return { bg: '#FFC107', text: '#333' };
  return { bg: '#4CAF50', text: '#FFF' };
};

// --- API CALLS ---

const fetchDeals = async (): Promise<ClosingInsight[]> => {
  try {
    const deals = await mobileApi.getClosingDeals();
    // Transform API response to ClosingInsight format
    return deals.map(deal => ({
      id: deal.id,
      deal_name: deal.deal_name,
      account: deal.account,
      closing_score: deal.closing_score,
      probability: deal.probability,
      blockers: deal.blockers,
      strategies: deal.strategies,
      last_analyzed: deal.last_analyzed,
    }));
  } catch (error) {
    console.error('Error fetching deals:', error);
    // Fallback zu Mock-Daten bei Fehler
    return MOCK_DEALS;
  }
};

const analyzeDeal = async (dealId: string): Promise<ClosingInsight> => {
  try {
    const result = await mobileApi.analyzeDeal(dealId);
    // API gibt jetzt deal_name, account und probability zurück
    return {
      id: result.id,
      deal_name: result.deal_name || 'Unbenannter Deal',
      account: result.account || 'Unbekannt',
      closing_score: result.closing_score,
      probability: result.probability || result.closing_score, // API liefert probability, Fallback zu closing_score
      blockers: result.blockers || [],
      strategies: result.strategies || [],
      last_analyzed: result.last_analyzed || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error analyzing deal:', error);
    // Fallback zu Mock-Daten bei Fehler
    const deal = MOCK_DEALS.find(d => d.id === dealId);
    if (deal) {
      return { ...deal, closing_score: Math.min(100, deal.closing_score + 10), last_analyzed: new Date().toISOString() };
    }
    throw new Error('Deal not found');
  }
};

// --- COMPONENT ---

const BlockerTag: React.FC<{ blocker: Blocker }> = ({ blocker }) => {
  const colors = getSeverityColor(blocker.severity);
  return (
    <View style={[styles.blockerTag, { backgroundColor: colors.bg }]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.text} />
      <Text style={[styles.blockerTagText, { color: colors.text }]}>
        {blocker.issue}
      </Text>
    </View>
  );
};

const StrategyCard: React.FC<{ strategy: Strategy }> = ({ strategy }) => {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(strategy.script);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Kopiert!', `Skript für '${strategy.name}' in die Zwischenablage kopiert.`);
  };

  return (
    <View style={styles.strategyCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.strategyName}>{strategy.name}</Text>
        <Text style={styles.strategyFocus}>{strategy.focus}</Text>
      </View>
      <Text style={styles.strategyScript}>{strategy.script}</Text>
      <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
        <MaterialCommunityIcons name="content-copy" size={16} color="#007AFF" />
        <Text style={styles.copyButtonText}>Skript kopieren</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function ClosingCoachScreen() {
  const [deals, setDeals] = useState<ClosingInsight[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDeals();
      setDeals(data);
    } catch (e) {
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };
  
  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updatedDeal = await analyzeDeal(id);
      
      setDeals(prev => prev.map(d => d.id === id ? updatedDeal : d));
      setExpandedId(id); // Expand after successful analysis
      
    } catch (e) {
      Alert.alert('Fehler', 'Analyse fehlgeschlagen.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const renderLeftActions = (deal: ClosingInsight) => (
    <TouchableOpacity 
      style={styles.swipeAnalyze}
      onPress={() => handleAnalyze(deal.id)}
      disabled={analyzingId === deal.id}
    >
      <MaterialCommunityIcons name="brain" size={24} color="#FFF" />
      <Text style={styles.swipeText}>Analysieren</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: ClosingInsight }) => {
    const isExpanded = expandedId === item.id;
    const scoreStyle = getScoreColor(item.closing_score);
    const isAnalyzing = analyzingId === item.id;
    
    return (
      <View style={styles.swipeWrapper}> 
        <TouchableOpacity 
          style={[styles.card, { borderColor: scoreStyle.borderColor, backgroundColor: scoreStyle.backgroundColor }]} 
          onPress={() => toggleExpand(item.id)}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dealName}>{item.deal_name}</Text>
              <Text style={styles.accountName}>{item.account}</Text>
              <Text style={styles.analysisTime}>Zuletzt analysiert: {new Date(item.last_analyzed).toLocaleTimeString()}</Text>
            </View>
            
            <View style={[styles.scoreBadge, { backgroundColor: scoreStyle.scoreBg }]}>
              {isAnalyzing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.scoreText}>{item.closing_score}</Text>
              )}
            </View>
          </View>
          
          <Collapsible collapsed={!isExpanded}>
            <View style={styles.cardBody}>
              <Text style={styles.sectionTitle}>⚠️ Blocker ({item.blockers.length})</Text>
              <View style={styles.blockerContainer}>
                {item.blockers.map((blocker, index) => (
                  <View key={index}>
                    <BlockerTag blocker={blocker} />
                    <Text style={styles.blockerContext}>{blocker.context}</Text>
                  </View>
                ))}
                {item.blockers.length === 0 && (
                   <Text style={styles.noBlockers}>Keine kritischen Blocker erkannt. Go for the close!</Text>
                )}
              </View>

              <Text style={styles.sectionTitle}>📚 Empfohlene Strategien</Text>
              {item.strategies.map(strategy => (
                <StrategyCard key={strategy.name} strategy={strategy} />
              ))}
            </View>
          </Collapsible>
          
          <MaterialCommunityIcons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#333" 
            style={styles.chevron}
          />
        </TouchableOpacity>
        
        {/* Simulate Swipe Button */}
        {renderLeftActions(item)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.screenTitle}>Closing Coach 🚀</Text>
      
      <FlatList
        data={deals}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#007AFF" />}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Keine Deals gefunden.</Text> : null}
      />
      
      {/* Footer / Filter Modal Placeholder */}
      <TouchableOpacity style={styles.filterBtn} onPress={() => Alert.alert('Filter', 'Filter Modal öffnen...')}>
        <MaterialCommunityIcons name="filter-variant" size={24} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FA' },
  screenTitle: { fontSize: 28, fontWeight: 'bold', margin: 16, color: '#1A2027' },
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },

  // Card & Header
  swipeWrapper: { marginBottom: 16, position: 'relative' },
  card: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealName: { fontSize: 18, fontWeight: 'bold', color: '#1A2027' },
  accountName: { fontSize: 14, color: '#666', marginBottom: 4 },
  analysisTime: { fontSize: 11, color: '#999' },
  
  // Score Badge
  scoreBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  scoreText: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  chevron: { alignSelf: 'center', marginTop: 10 },
  
  // Swipe Action (Simuliert)
  swipeAnalyze: {
    position: 'absolute', 
    right: -100, 
    top: 0, 
    bottom: 0, 
    width: 100, 
    backgroundColor: '#007AFF', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
  },
  swipeText: { color: '#FFF', fontSize: 12, marginTop: 4 },

  // Card Body (Expanded)
  cardBody: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 8,
  },
  blockerContainer: { marginBottom: 15 },
  blockerTag: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 5,
  },
  blockerTagText: { fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  blockerContext: { fontSize: 13, color: '#444', marginBottom: 10 },
  noBlockers: { fontSize: 13, color: '#4CAF50', fontStyle: 'italic' },

  // Strategy Card
  strategyCard: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  strategyName: { fontSize: 16, fontWeight: 'bold', color: '#1A2027' },
  strategyFocus: { fontSize: 11, color: '#007AFF', fontWeight: 'bold', textTransform: 'uppercase' },
  strategyScript: { 
    fontSize: 13, 
    color: '#333', 
    fontStyle: 'italic', 
    marginTop: 8, 
    backgroundColor: '#F7F9FB', 
    padding: 8, 
    borderRadius: 4 
  },
  copyButton: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    padding: 4,
  },
  copyButtonText: { color: '#007AFF', fontSize: 12, marginLeft: 4, fontWeight: '600' },
  
  // Floating Filter Button
  filterBtn: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    backgroundColor: '#333',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
});

