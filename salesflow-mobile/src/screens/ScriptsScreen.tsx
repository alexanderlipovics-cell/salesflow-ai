import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../theme';

interface Script {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  usageCount: number;
  isFavorite: boolean;
}

const SCRIPTS: Script[] = [
  { id: '1', title: 'Erster Kontakt', category: 'Opener', content: 'Hey! Mir ist aufgefallen, dass du dich auch für Fitness interessierst. Was ist dein aktuelles Ziel? 💪', tags: ['opener', 'fitness'], usageCount: 47, isFavorite: true },
  { id: '2', title: 'Ghosting Recovery', category: 'Follow-up', content: 'Hey, alles gut bei dir? 😊 Wollte nur kurz nachfragen, ob du noch Fragen hast?', tags: ['follow-up', 'ghosting'], usageCount: 32, isFavorite: true },
  { id: '3', title: 'Preis-Einwand', category: 'Objection', content: 'Ich verstehe, dass der Preis wichtig ist. Lass mich dir zeigen, was du für deine Investition bekommst...', tags: ['objection', 'preis'], usageCount: 28, isFavorite: false },
  { id: '4', title: 'Zeit-Einwand', category: 'Objection', content: 'Das verstehe ich total! Die meisten erfolgreichen Kunden haben auch wenig Zeit. Genau deshalb...', tags: ['objection', 'zeit'], usageCount: 21, isFavorite: false },
  { id: '5', title: 'Closing Soft', category: 'Closing', content: 'Ich finde es toll, dass du offen bist! Sollen wir einfach mal starten und du schaust, ob es was für dich ist?', tags: ['closing', 'soft'], usageCount: 19, isFavorite: true },
  { id: '6', title: 'Testimonial Story', category: 'Storytelling', content: 'Eine Kundin hatte genau die gleichen Bedenken wie du. Nach 3 Wochen hat sie mir geschrieben...', tags: ['story', 'testimonial'], usageCount: 15, isFavorite: false },
];

const CATEGORIES = ['Alle', 'Opener', 'Follow-up', 'Objection', 'Closing', 'Storytelling'];

export default function ScriptsScreen({ navigation }: any) {
  const [activeCategory, setActiveCategory] = useState('Alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [scripts, setScripts] = useState(SCRIPTS);

  const filteredScripts = scripts.filter(script => {
    const matchesSearch = script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          script.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Alle' || script.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = async (content: string) => {
    await Clipboard.setStringAsync(content);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleFavorite = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScripts(scripts.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Opener': return COLORS.success;
      case 'Follow-up': return '#3B82F6';
      case 'Objection': return COLORS.error;
      case 'Closing': return COLORS.warning;
      case 'Storytelling': return COLORS.secondary;
      default: return COLORS.textSecondary;
    }
  };

  const renderScript = ({ item }: { item: Script }) => (
    <View style={styles.scriptCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(item.category)}20` }]}>
          <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>{item.category}</Text>
        </View>
        <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
          <Ionicons name={item.isFavorite ? 'star' : 'star-outline'} size={20} color={item.isFavorite ? COLORS.warning : COLORS.textMuted} />
        </TouchableOpacity>
      </View>
      <Text style={styles.scriptTitle}>{item.title}</Text>
      <Text style={styles.scriptContent} numberOfLines={3}>"{item.content}"</Text>
      <View style={styles.cardFooter}>
        <View style={styles.usageContainer}>
          <Ionicons name="copy-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.usageText}>{item.usageCount}x verwendet</Text>
        </View>
        <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopy(item.content)}>
          <Ionicons name="copy" size={16} color={COLORS.text} />
          <Text style={styles.copyText}>Kopieren</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scripts</Text>
        <TouchableOpacity
          style={styles.aiBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('MagicScriptScreen', { leadName: 'Neuer Lead' });
          }}
        >
          <Ionicons name="sparkles" size={20} color={COLORS.text} />
        </TouchableOpacity>
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
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        contentContainerStyle={styles.categoryList}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, activeCategory === item && styles.activeCategoryChip]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveCategory(item);
            }}
          >
            <Text style={[styles.categoryChipText, activeCategory === item && styles.activeCategoryChipText]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>{filteredScripts.length} Scripts</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="filter" size={18} color={COLORS.textSecondary} />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Script List */}
      <FlatList
        data={filteredScripts}
        renderItem={renderScript}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.scriptList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>Keine Scripts gefunden</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  aiBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { marginHorizontal: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16, marginLeft: 8 },
  categoryList: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface },
  activeCategoryChip: { backgroundColor: COLORS.card, borderColor: COLORS.primary, borderWidth: 1 },
  categoryChipText: { color: COLORS.textSecondary, fontWeight: '600' },
  activeCategoryChipText: { color: COLORS.primary },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  statsText: { color: COLORS.textMuted, fontSize: 14 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterText: { color: COLORS.textSecondary, fontSize: 14 },
  scriptList: { paddingHorizontal: 20, paddingBottom: 100 },
  scriptCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  scriptTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  scriptContent: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usageContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  usageText: { color: COLORS.textMuted, fontSize: 12 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  copyText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, marginTop: 16 },
});
