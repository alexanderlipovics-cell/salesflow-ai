import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { getObjections, Objection } from '../services/supabase';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

// Beliebte Einwände für Quick Access
const POPULAR_OBJECTIONS = [
  { label: '💰 Zu teuer', search: 'teuer' },
  { label: '⏰ Keine Zeit', search: 'zeit' },
  { label: '🤔 Nachdenken', search: 'nachdenken' },
  { label: '👫 Partner fragen', search: 'partner' },
  { label: '🔺 MLM/Pyramide', search: 'mlm' },
  { label: '👥 Kenne niemanden', search: 'kenne' },
];

export default function ObjectionHandlerScreen({ navigation }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Objection[]>([]);
  const [allObjections, setAllObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedObjection, setSelectedObjection] = useState<Objection | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lade alle Einwände beim Start
  useEffect(() => {
    loadAllObjections();
  }, []);

  const loadAllObjections = async () => {
    setLoading(true);
    const data = await getObjections();
    setAllObjections(data);
    setResults(data);
    setLoading(false);
  };

  const handleSearch = async (term?: string) => {
    const searchValue = term || searchTerm.trim();
    
    if (!searchValue) {
      setResults(allObjections);
      return;
    }
    
    setLoading(true);
    const data = await getObjections(searchValue);
    setResults(data);
    setLoading(false);
  };

  const handleQuickSearch = (search: string) => {
    setSearchTerm(search);
    handleSearch(search);
  };

  const handleCopy = async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getToneColor = (tone?: string) => {
    switch (tone?.toUpperCase()) {
      case 'EMPATHETIC': return COLORS.primary;
      case 'PROFESSIONAL': return COLORS.secondary;
      case 'CASUAL': return COLORS.success;
      case 'DIRECT': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  const getToneLabel = (tone?: string) => {
    switch (tone?.toUpperCase()) {
      case 'EMPATHETIC': return 'Empathisch';
      case 'PROFESSIONAL': return 'Professionell';
      case 'CASUAL': return 'Locker';
      case 'DIRECT': return 'Direkt';
      default: return tone || 'Neutral';
    }
  };

  const renderObjectionCard = ({ item }: { item: Objection }) => {
    const isCopied = copiedId === item.id;
    
    return (
      <TouchableOpacity 
        style={styles.resultCard}
        onPress={() => setSelectedObjection(item)}
        activeOpacity={0.7}
      >
        {/* Header mit Einwand */}
        <View style={styles.cardHeader}>
          <View style={styles.objectionBadge}>
            <Ionicons name="chatbubble-ellipses" size={14} color={COLORS.warning} />
            <Text style={styles.objectionLabel}>Einwand</Text>
          </View>
          {item.technique && (
            <View style={[styles.techniqueBadge, { backgroundColor: getToneColor(item.tone) + '20' }]}>
              <Text style={[styles.techniqueText, { color: getToneColor(item.tone) }]}>
                {item.technique}
              </Text>
            </View>
          )}
        </View>
        
        {/* Einwand Text */}
        <Text style={styles.objectionText}>"{item.objection}"</Text>
        
        {/* Antwort Preview */}
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Antwort:</Text>
          <Text style={styles.responseText} numberOfLines={3}>
            {item.response}
          </Text>
        </View>
        
        {/* Footer */}
        <View style={styles.cardFooter}>
          {item.tone && (
            <View style={styles.toneContainer}>
              <View style={[styles.toneDot, { backgroundColor: getToneColor(item.tone) }]} />
              <Text style={styles.toneText}>{getToneLabel(item.tone)}</Text>
            </View>
          )}
          <TouchableOpacity 
            style={[styles.copyButton, isCopied && styles.copyButtonSuccess]}
            onPress={() => handleCopy(item.response, item.id)}
          >
            <Ionicons 
              name={isCopied ? 'checkmark' : 'copy-outline'} 
              size={16} 
              color={isCopied ? COLORS.success : COLORS.primary} 
            />
            <Text style={[styles.copyText, isCopied && styles.copyTextSuccess]}>
              {isCopied ? 'Kopiert!' : 'Kopieren'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Einwandbehandlung</Text>
          <Text style={styles.subtitle}>{results.length} Antworten</Text>
        </View>
        <TouchableOpacity onPress={loadAllObjections} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Einwand suchen..."
          placeholderTextColor={COLORS.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchTerm(''); setResults(allObjections); }}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.searchButton} onPress={() => handleSearch()}>
          <Text style={styles.searchButtonText}>Suchen</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Access Tags */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickAccessContainer}
        contentContainerStyle={styles.quickAccessContent}
      >
        {POPULAR_OBJECTIONS.map((obj, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickTag}
            onPress={() => handleQuickSearch(obj.search)}
          >
            <Text style={styles.quickTagText}>{obj.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Lade Einwände...</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>
            {searchTerm ? 'Keine Ergebnisse gefunden' : 'Gib einen Einwand ein'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchTerm ? 'Versuche einen anderen Suchbegriff' : 'z.B. "Das ist mir zu teuer"'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderObjectionCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={!!selectedObjection}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedObjection(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Einwand-Antwort</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setSelectedObjection(null)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Einwand */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Der Einwand:</Text>
                <View style={styles.modalObjectionBox}>
                  <Ionicons name="chatbubble" size={18} color={COLORS.warning} />
                  <Text style={styles.modalObjectionText}>
                    "{selectedObjection?.objection}"
                  </Text>
                </View>
              </View>

              {/* Technik & Ton */}
              {(selectedObjection?.technique || selectedObjection?.tone) && (
                <View style={styles.modalMetaRow}>
                  {selectedObjection?.technique && (
                    <View style={styles.modalMetaItem}>
                      <Ionicons name="bulb-outline" size={16} color={COLORS.textMuted} />
                      <Text style={styles.modalMetaText}>
                        Technik: <Text style={styles.modalMetaValue}>{selectedObjection.technique}</Text>
                      </Text>
                    </View>
                  )}
                  {selectedObjection?.tone && (
                    <View style={styles.modalMetaItem}>
                      <View style={[styles.toneDot, { backgroundColor: getToneColor(selectedObjection.tone) }]} />
                      <Text style={styles.modalMetaText}>
                        {getToneLabel(selectedObjection.tone)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Antwort */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Deine Antwort:</Text>
                <View style={styles.modalResponseBox}>
                  <Text style={styles.modalResponseText}>
                    {selectedObjection?.response}
                  </Text>
                </View>
              </View>

              {/* Wann verwenden */}
              {selectedObjection?.when_to_use && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>💡 Wann verwenden:</Text>
                  <Text style={styles.modalHintText}>
                    {selectedObjection.when_to_use}
                  </Text>
                </View>
              )}

              {/* Legacy Steps (falls vorhanden) */}
              {selectedObjection?.step_1_buffer && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>LIRA-Methode:</Text>
                  <View style={styles.stepsContainer}>
                    {selectedObjection.step_1_buffer && (
                      <View style={styles.stepItem}>
                        <Text style={styles.stepLabel}>1. Puffern:</Text>
                        <Text style={styles.stepText}>{selectedObjection.step_1_buffer}</Text>
                      </View>
                    )}
                    {selectedObjection.step_2_isolate && (
                      <View style={styles.stepItem}>
                        <Text style={styles.stepLabel}>2. Isolieren:</Text>
                        <Text style={styles.stepText}>{selectedObjection.step_2_isolate}</Text>
                      </View>
                    )}
                    {selectedObjection.step_3_reframe && (
                      <View style={styles.stepItem}>
                        <Text style={styles.stepLabel}>3. Reframen:</Text>
                        <Text style={styles.stepText}>{selectedObjection.step_3_reframe}</Text>
                      </View>
                    )}
                    {selectedObjection.step_4_close && (
                      <View style={styles.stepItem}>
                        <Text style={styles.stepLabel}>4. Abschließen:</Text>
                        <Text style={styles.stepText}>{selectedObjection.step_4_close}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.copyFullButton}
                onPress={() => {
                  if (selectedObjection) {
                    handleCopy(selectedObjection.response, selectedObjection.id);
                  }
                }}
              >
                <Ionicons name="copy" size={20} color={COLORS.text} />
                <Text style={styles.copyFullButtonText}>Antwort kopieren</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  refreshButton: {
    padding: SPACING.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.small,
  },
  searchInput: { 
    flex: 1, 
    color: COLORS.text, 
    paddingVertical: SPACING.md,
    marginLeft: SPACING.sm,
    fontSize: 15,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  searchButtonText: { 
    color: COLORS.text, 
    fontWeight: '600',
    fontSize: 14,
  },
  quickAccessContainer: {
    maxHeight: 44,
    marginBottom: SPACING.sm,
  },
  quickAccessContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  quickTag: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickTagText: {
    color: COLORS.text,
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  listContent: { 
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  objectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  objectionLabel: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  techniqueBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  techniqueText: {
    fontSize: 11,
    fontWeight: '600',
  },
  objectionText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.text,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
    lineHeight: 24,
  },
  responseContainer: { 
    marginTop: SPACING.sm,
  },
  responseLabel: { 
    fontSize: 11, 
    color: COLORS.primary, 
    marginBottom: SPACING.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  responseText: { 
    fontSize: 14, 
    color: COLORS.textMuted, 
    lineHeight: 21,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  toneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toneText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  copyButtonSuccess: {
    backgroundColor: COLORS.success + '20',
  },
  copyText: { 
    color: COLORS.primary, 
    fontSize: 13,
    fontWeight: '500',
  },
  copyTextSuccess: {
    color: COLORS.success,
  },
  emptyState: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  emptyText: { 
    color: COLORS.text, 
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptySubtext: { 
    color: COLORS.textMuted, 
    marginTop: SPACING.sm,
    fontSize: 14,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  modalSection: {
    marginBottom: SPACING.lg,
  },
  modalSectionLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  modalObjectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.warning + '15',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  modalObjectionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  modalMetaRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  modalMetaText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  modalMetaValue: {
    color: COLORS.text,
    fontWeight: '600',
  },
  modalResponseBox: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  modalResponseText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
  modalHintText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  stepsContainer: {
    gap: SPACING.md,
  },
  stepItem: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  stepLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  modalFooter: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  copyFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  copyFullButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
