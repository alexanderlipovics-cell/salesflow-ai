import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { getScripts } from '../services/supabase';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

export default function ScriptsScreen() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('all');

  const companies = ['all', 'Zinzino', 'Herbalife', 'LR', 'doTERRA', 'Amway'];

  useEffect(() => {
    loadScripts();
  }, [selectedCompany]);

  const loadScripts = async () => {
    setLoading(true);
    const company = selectedCompany === 'all' ? undefined : selectedCompany;
    const data = await getScripts(company);
    setScripts(data);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verkaufsskripte</Text>
      </View>
      
      {/* Company Filter */}
      <FlatList
        horizontal
        data={companies}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCompany === item && styles.filterButtonActive
            ]}
            onPress={() => setSelectedCompany(item)}
          >
            <Text style={[
              styles.filterText,
              selectedCompany === item && styles.filterTextActive
            ]}>
              {item === 'all' ? 'Alle' : item}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.filterList}
        showsHorizontalScrollIndicator={false}
      />

      {/* Scripts List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : scripts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Keine Scripts gefunden</Text>
          <Text style={styles.emptySubtext}>Versuche einen anderen Filter</Text>
        </View>
      ) : (
        <FlatList
          data={scripts}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.scriptCard}>
              <Text style={styles.scriptTitle}>{item.title || item.script_name || 'Unbenannt'}</Text>
              <Text style={styles.scriptCategory}>{item.category || 'Allgemein'} • {item.company || 'Unbekannt'}</Text>
              <Text style={styles.scriptContent} numberOfLines={3}>
                {item.content || item.script_text || 'Kein Inhalt verfügbar'}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  filterList: { 
    paddingHorizontal: SPACING.lg, 
    marginBottom: SPACING.md 
  },
  filterButton: { 
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.sm, 
    backgroundColor: COLORS.card, 
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
    ...SHADOWS.small,
  },
  filterButtonActive: { 
    backgroundColor: COLORS.primary 
  },
  filterText: { 
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: { 
    color: COLORS.text, 
    fontWeight: '600' 
  },
  listContent: { 
    padding: SPACING.lg 
  },
  scriptCard: { 
    backgroundColor: COLORS.card, 
    padding: SPACING.lg, 
    borderRadius: RADIUS.md, 
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  scriptTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  scriptCategory: { 
    fontSize: 12, 
    color: COLORS.primary, 
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  scriptContent: { 
    fontSize: 14, 
    color: COLORS.textMuted, 
    lineHeight: 20,
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
  },
  emptySubtext: { 
    color: COLORS.textMuted, 
    marginTop: SPACING.sm,
    fontSize: 14,
  },
});
