/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SCRIPTS SCREEN - MLM Scripts aus Supabase                                ║
 * ║  Lädt echte Scripts mit Company-Filter                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Clipboard,
  Alert,
  TextInput,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fetchScriptsFromSupabase } from '../../services/api';
import { supabase } from '../../services/supabase';

interface Script {
  id: string;
  title: string;
  content: string;
  category: string;
  company_id?: string;
  is_active: boolean;
  created_at: string;
  times_used?: number;
}

const SCRIPT_CATEGORIES = [
  { key: 'all', label: '📚 Alle', color: '#3b82f6' },
  { key: 'opener', label: '🎬 Opener', color: '#10b981' },
  { key: 'followup', label: '📬 Follow-up', color: '#f59e0b' },
  { key: 'closing', label: '🎯 Closing', color: '#ef4444' },
  { key: 'objection', label: '🛡️ Einwände', color: '#8b5cf6' },
];

export default function ScriptsScreen() {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<Script[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Lade Scripts beim Start
  useEffect(() => {
    loadScripts();
  }, [user?.company_id]);

  // Filtere Scripts bei Kategorie- oder Suchänderung
  useEffect(() => {
    filterScripts();
  }, [selectedCategory, searchTerm, scripts]);

  const loadScripts = async () => {
    try {
      setLoading(true);
      const data = await fetchScriptsFromSupabase(user?.company_id);
      setScripts(data as Script[]);
    } catch (error) {
      console.error('Fehler beim Laden der Scripts:', error);
      Alert.alert(
        'Fehler',
        'Scripts konnten nicht geladen werden. Bitte versuche es erneut.'
      );
    } finally {
      setLoading(false);
    }
  };

  const filterScripts = () => {
    let filtered = [...scripts];

    // Kategorie-Filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((script) => script.category === selectedCategory);
    }

    // Such-Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (script) =>
          script.title.toLowerCase().includes(term) ||
          script.content.toLowerCase().includes(term)
      );
    }

    setFilteredScripts(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadScripts();
    setRefreshing(false);
  };

  const copyScript = (content: string) => {
    Clipboard.setString(content);
    Alert.alert('✅ Kopiert', 'Script wurde in die Zwischenablage kopiert.');
  };

  if (loading && scripts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Lade Scripts...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📝 Scripts</Text>
        <Text style={styles.headerSubtitle}>
          {filteredScripts.length} Script{filteredScripts.length !== 1 ? 's' : ''} verfügbar
        </Text>
      </View>

      {/* Suchfeld */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Scripts durchsuchen..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Kategorien */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {SCRIPT_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            style={[
              styles.categoryChip,
              selectedCategory === cat.key && { backgroundColor: cat.color },
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.key && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Scripts Liste */}
      {filteredScripts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchTerm
              ? 'Keine Scripts gefunden'
              : 'Keine Scripts verfügbar'}
          </Text>
        </View>
      ) : (
        <View style={styles.scriptsContainer}>
          {filteredScripts.map((script) => (
            <View key={script.id} style={styles.scriptCard}>
              <View style={styles.scriptHeader}>
                <Text style={styles.scriptTitle}>{script.title}</Text>
                {script.times_used && script.times_used > 0 && (
                  <Text style={styles.scriptUsage}>
                    {script.times_used}x verwendet
                  </Text>
                )}
              </View>
              <Text style={styles.scriptContent} numberOfLines={4}>
                {script.content}
              </Text>
              <View style={styles.scriptActions}>
                <Pressable
                  style={styles.copyButton}
                  onPress={() => copyScript(script.content)}
                >
                  <Text style={styles.copyButtonText}>📋 Kopieren</Text>
                </Pressable>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {SCRIPT_CATEGORIES.find((c) => c.key === script.category)?.label ||
                      script.category}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  categoriesContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  scriptsContainer: {
    padding: 16,
  },
  scriptCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  scriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scriptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  scriptUsage: {
    fontSize: 12,
    color: '#64748b',
  },
  scriptContent: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 12,
  },
  scriptActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  copyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});

