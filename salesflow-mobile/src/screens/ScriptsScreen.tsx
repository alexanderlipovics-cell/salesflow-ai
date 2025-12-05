import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { getScripts, Script } from '../services/supabase';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

const COMPANIES = [
  { id: 'all', label: 'Alle', icon: 'apps-outline' },
  { id: 'Zinzino', label: 'Zinzino', icon: 'water-outline' },
  { id: 'LR', label: 'LR Health', icon: 'leaf-outline' },
  { id: 'Herbalife', label: 'Herbalife', icon: 'restaurant-outline' },
  { id: 'doTERRA', label: 'doTERRA', icon: 'flower-outline' },
  { id: 'Amway', label: 'Amway', icon: 'home-outline' },
];

const CATEGORIES = [
  { id: 'all', label: 'Alle', icon: 'grid-outline' },
  { id: 'opener', label: 'Opener', icon: 'chatbubble-outline' },
  { id: 'followup', label: 'Follow-Up', icon: 'refresh-outline' },
  { id: 'objection', label: 'Einwand', icon: 'shield-outline' },
  { id: 'closing', label: 'Closing', icon: 'checkmark-circle-outline' },
];

export default function ScriptsScreen() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadScripts();
  }, [selectedCompany, selectedCategory]);

  const loadScripts = async () => {
    setLoading(true);
    try {
      const company = selectedCompany === 'all' ? undefined : selectedCompany;
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await getScripts(company, category);
      setScripts(data);
    } catch (error) {
      console.error('Error loading scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadScripts();
    setRefreshing(false);
  }, [selectedCompany, selectedCategory]);

  const handleCopyScript = async (script: Script) => {
    const textToCopy = script.content || script.text || '';
    await Clipboard.setStringAsync(textToCopy);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredScripts = scripts.filter(script => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (script.title?.toLowerCase().includes(query)) ||
      (script.content?.toLowerCase().includes(query)) ||
      (script.tags?.some(tag => tag.toLowerCase().includes(query)))
    );
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'opener': return COLORS.primary;
      case 'followup': return COLORS.secondary;
      case 'objection': return COLORS.warning;
      case 'closing': return COLORS.success;
      default: return COLORS.accent;
    }
  };

  const renderScriptCard = ({ item }: { item: Script }) => {
    const isCopied = copiedId === item.id;
    const categoryColor = getCategoryColor(item.category);
    
    return (
      <TouchableOpacity 
        style={styles.scriptCard}
        onPress={() => setSelectedScript(item)}
        activeOpacity={0.7}
      >
        <View style={styles.scriptHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {item.category}
            </Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.copyButton,
              isCopied && styles.copyButtonSuccess
            ]}
            onPress={() => handleCopyScript(item)}
          >
            <Ionicons 
              name={isCopied ? 'checkmark' : 'copy-outline'} 
              size={18} 
              color={isCopied ? COLORS.success : COLORS.textMuted} 
            />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.scriptTitle}>{item.title}</Text>
        
        <Text style={styles.scriptContent} numberOfLines={3}>
          {item.content || item.text || 'Kein Inhalt verfügbar'}
        </Text>
        
        <View style={styles.scriptFooter}>
          <View style={styles.companyBadge}>
            <Text style={styles.companyText}>{item.company || 'Allgemein'}</Text>
          </View>
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 2).map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Verkaufsskripte</Text>
        <Text style={styles.subtitle}>{filteredScripts.length} Scripts verfügbar</Text>
      </View>
      
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Scripts durchsuchen..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Company Filter */}
      <FlatList
        horizontal
        data={COMPANIES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCompany === item.id && styles.filterButtonActive
            ]}
            onPress={() => setSelectedCompany(item.id)}
          >
            <Ionicons 
              name={item.icon as any} 
              size={16} 
              color={selectedCompany === item.id ? COLORS.text : COLORS.textMuted} 
            />
            <Text style={[
              styles.filterText,
              selectedCompany === item.id && styles.filterTextActive
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.filterList}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterListContent}
      />

      {/* Category Filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === item.id && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(item.id)}
          >
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === item.id && styles.categoryButtonTextActive
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.categoryFilterList}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterListContent}
      />

      {/* Scripts List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Lade Scripts...</Text>
        </View>
      ) : filteredScripts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Keine Scripts gefunden</Text>
          <Text style={styles.emptySubtext}>
            Versuche einen anderen Filter oder lade neu
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Neu laden</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredScripts}
          keyExtractor={(item) => item.id}
          renderItem={renderScriptCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}

      {/* Script Detail Modal */}
      <Modal
        visible={!!selectedScript}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedScript(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[
                styles.modalCategoryBadge, 
                { backgroundColor: getCategoryColor(selectedScript?.category || '') + '20' }
              ]}>
                <Text style={[
                  styles.modalCategoryText,
                  { color: getCategoryColor(selectedScript?.category || '') }
                ]}>
                  {selectedScript?.category}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setSelectedScript(null)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{selectedScript?.title}</Text>
              
              <View style={styles.modalMetaRow}>
                <View style={styles.modalMetaItem}>
                  <Ionicons name="business-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.modalMetaText}>
                    {selectedScript?.company || 'Allgemein'}
                  </Text>
                </View>
                {selectedScript?.tone && (
                  <View style={styles.modalMetaItem}>
                    <Ionicons name="color-palette-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.modalMetaText}>{selectedScript.tone}</Text>
                  </View>
                )}
              </View>

              <View style={styles.scriptTextContainer}>
                <Text style={styles.scriptFullText}>
                  {selectedScript?.content || selectedScript?.text}
                </Text>
              </View>

              {selectedScript?.tags && selectedScript.tags.length > 0 && (
                <View style={styles.modalTagsContainer}>
                  {selectedScript.tags.map((tag, i) => (
                    <View key={i} style={styles.modalTag}>
                      <Text style={styles.modalTagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.copyFullButton}
                onPress={() => {
                  if (selectedScript) {
                    handleCopyScript(selectedScript);
                  }
                }}
              >
                <Ionicons name="copy" size={20} color={COLORS.text} />
                <Text style={styles.copyFullButtonText}>Script kopieren</Text>
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    color: COLORS.text,
    fontSize: 15,
  },
  filterList: { 
    maxHeight: 44,
    marginBottom: SPACING.xs,
  },
  filterListContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.sm, 
    backgroundColor: COLORS.card, 
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
    ...SHADOWS.small,
  },
  filterButtonActive: { 
    backgroundColor: COLORS.primary,
  },
  filterText: { 
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: { 
    color: COLORS.text, 
    fontWeight: '600',
  },
  categoryFilterList: {
    maxHeight: 36,
    marginBottom: SPACING.sm,
  },
  categoryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.sm,
  },
  categoryButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  categoryButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  categoryButtonTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  listContent: { 
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  scriptCard: { 
    backgroundColor: COLORS.card, 
    padding: SPACING.lg, 
    borderRadius: RADIUS.lg, 
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  scriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  copyButton: {
    padding: SPACING.xs,
  },
  copyButtonSuccess: {
    backgroundColor: COLORS.success + '20',
    borderRadius: RADIUS.sm,
  },
  scriptTitle: { 
    fontSize: 17, 
    fontWeight: '600', 
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  scriptContent: { 
    fontSize: 14, 
    color: COLORS.textMuted, 
    lineHeight: 21,
    marginBottom: SPACING.sm,
  },
  scriptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  companyBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  companyText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.primary,
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
  retryButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.text,
    fontWeight: '600',
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
    maxHeight: '85%',
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
  modalCategoryBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  modalCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
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
    color: COLORS.textMuted,
    fontSize: 13,
  },
  scriptTextContainer: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  scriptFullText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
  modalTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  modalTag: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  modalTagText: {
    color: COLORS.primary,
    fontSize: 12,
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
