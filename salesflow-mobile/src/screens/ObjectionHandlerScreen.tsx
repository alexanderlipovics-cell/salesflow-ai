import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getObjections } from '../services/supabase';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

export default function ObjectionHandlerScreen({ navigation }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    const data = await getObjections(searchTerm);
    setResults(data);
    setLoading(false);
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    // TODO: Toast notification
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Einwandbehandlung</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="z.B. 'Zu teuer', 'Kein Interesse'..."
          placeholderTextColor={COLORS.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Suchen</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : results.length === 0 && searchTerm ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Keine Ergebnisse gefunden</Text>
          <Text style={styles.emptySubtext}>Versuche einen anderen Suchbegriff</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Gib einen Einwand ein</Text>
          <Text style={styles.emptySubtext}>z.B. "Das ist mir zu teuer"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.resultCard}>
              <Text style={styles.objectionText}>"{item.objection || item.objection_text}"</Text>
              <View style={styles.responseContainer}>
                <Text style={styles.responseLabel}>Antwort:</Text>
                <Text style={styles.responseText}>{item.response || item.response_text}</Text>
              </View>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => handleCopy(item.response || item.response_text)}
              >
                <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                <Text style={styles.copyText}>Kopieren</Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: SPACING.lg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.small,
  },
  searchInput: { 
    flex: 1, 
    color: COLORS.text, 
    paddingVertical: SPACING.md,
    marginLeft: SPACING.sm,
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  searchButtonText: { 
    color: COLORS.text, 
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: { 
    padding: SPACING.lg 
  },
  resultCard: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  objectionText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.warning,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  responseContainer: { 
    marginTop: SPACING.md 
  },
  responseLabel: { 
    fontSize: 12, 
    color: COLORS.textMuted, 
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  responseText: { 
    fontSize: 15, 
    color: COLORS.text, 
    lineHeight: 22 
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    alignSelf: 'flex-end',
    padding: SPACING.xs,
  },
  copyText: { 
    color: COLORS.primary, 
    marginLeft: SPACING.xs,
    fontSize: 14,
    fontWeight: '500',
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
  },
});
