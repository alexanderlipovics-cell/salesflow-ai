import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { debounce } from 'lodash';
import * as Speech from 'expo-speech';

import { SearchService } from '../services/searchService';
import type {
  AdvancedFilters,
  SavedSearch,
  SearchHistoryEntry,
  SearchQuery,
  SearchResult,
  SearchSortBy,
  SearchSortOrder,
} from '../types/search';

const STATUS_OPTIONS = [
  'new',
  'contacted',
  'qualified',
  'nurturing',
  'meeting_scheduled',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
];

const SORT_OPTIONS: { label: string; value: SearchSortBy }[] = [
  { label: 'Relevanz', value: 'relevance' },
  { label: 'Erstellt', value: 'created_at' },
  { label: 'Lead Score', value: 'lead_score' },
  { label: 'Next Action', value: 'next_action' },
];

export const SearchScreen: React.FC = () => {
  const workspaceId = useMemo(
    () => process.env.EXPO_PUBLIC_WORKSPACE_ID ?? 'demo-workspace',
    []
  );

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<AdvancedFilters>({});
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [sortBy, setSortBy] = useState<SearchSortBy>('relevance');
  const [sortOrder, setSortOrder] = useState<SearchSortOrder>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tagsAnyInput, setTagsAnyInput] = useState('');
  const [tagsAllInput, setTagsAllInput] = useState('');

  const pageSize = 50;
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const performSearch = useCallback(
    async (text: string, currentFilters: AdvancedFilters, currentPage: number) => {
      if (!workspaceId || text.trim().length < 2) {
        setResults([]);
        setTotal(0);
        return;
      }

      setLoading(true);
      try {
        const payload: SearchQuery = {
          query: text.trim(),
          filters: currentFilters,
          sort_by: sortBy,
          sort_order: sortOrder,
          page: currentPage,
          page_size: pageSize,
        };
        const response = await SearchService.search(workspaceId, payload);
        setResults(response.results);
        setTotal(response.total);
      } catch (error) {
        console.error('Search error', error);
        Alert.alert('Suche fehlgeschlagen', 'Bitte versuche es später erneut.');
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, sortBy, sortOrder]
  );

  const debouncedSearch = useCallback(
    debounce((text: string, currentFilters: AdvancedFilters, currentPage: number) => {
      performSearch(text, currentFilters, currentPage);
    }, 350),
    [performSearch]
  );

  const debouncedSuggestions = useCallback(
    debounce(async (text: string) => {
      if (!workspaceId || text.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const sugg = await SearchService.getSuggestions(workspaceId, text.trim());
        setSuggestions(sugg);
      } catch (error) {
        console.warn('Suggestion error', error);
      }
    }, 250),
    [workspaceId]
  );

  useEffect(() => {
    debouncedSearch(query, filters, page);
    debouncedSuggestions(query);
    return () => {
      debouncedSearch.cancel();
      debouncedSuggestions.cancel();
    };
  }, [query, filtersKey, page, debouncedSearch, debouncedSuggestions]);

  useEffect(() => {
    if (!workspaceId) return;
    SearchService.getSavedSearches(workspaceId)
      .then(setSavedSearches)
      .catch(error => console.warn('Saved searches error', error));
    SearchService.getSearchHistory(workspaceId)
      .then(setHistory)
      .catch(error => console.warn('History error', error));
  }, [workspaceId]);

  useEffect(() => {
    setTagsAnyInput((filters.tags_any ?? []).join(', '));
    setTagsAllInput((filters.tags_all ?? []).join(', '));
  }, [filtersKey]);

  const toggleStatus = (status: string) => {
    setFilters(prev => {
      const current = prev.statuses ?? [];
      const exists = current.includes(status);
      const nextStatuses = exists ? current.filter(s => s !== status) : [...current, status];
      return nextStatuses.length ? { ...prev, statuses: nextStatuses } : { ...prev, statuses: undefined };
    });
  };

  const handleVoiceSearch = async () => {
    if (!workspaceId) {
      Alert.alert('Workspace fehlt', 'Bitte EXPO_PUBLIC_WORKSPACE_ID konfigurieren.');
      return;
    }

    setIsVoiceSearching(true);
    try {
      Speech.speak('Ich höre zu');
      const text = await SearchService.startVoiceSearch();
      if (text) {
        setQuery(text);
        Speech.speak(`Ich suche nach ${text}`);
      }
    } catch (error: any) {
      Alert.alert('Voice Search', error?.message ?? 'Spracherkennung fehlgeschlagen');
    } finally {
      setIsVoiceSearching(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!workspaceId) return;
    if (query.trim().length < 2) {
      Alert.alert('Hinweis', 'Bitte gib zuerst einen Suchbegriff ein.');
      return;
    }

    try {
      const saved = await SearchService.saveSearch(workspaceId, {
        name: query.trim(),
        query: query.trim(),
        filters,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setSavedSearches(prev => [saved, ...prev]);
      Alert.alert('Gespeichert', `Gespeicherte Suche "${saved.name}" erstellt.`);
    } catch (error) {
      console.error('Save search error', error);
      Alert.alert('Fehler', 'Suche konnte nicht gespeichert werden.');
    }
  };

  const applySavedSearch = (saved: SavedSearch) => {
    setQuery(saved.query);
    setFilters(saved.filters ?? {});
    setSortBy(saved.sort_by ?? 'relevance');
    setSortOrder(saved.sort_order ?? 'desc');
    setPage(1);
  };

  const handleDeleteSavedSearch = async (id: string) => {
    try {
      await SearchService.deleteSavedSearch(id);
      setSavedSearches(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      Alert.alert('Fehler', 'Gespeicherte Suche konnte nicht gelöscht werden.');
    }
  };

  const handleHistoryFill = (item: SearchHistoryEntry) => {
    setQuery(item.query);
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultName}>{item.full_name || 'Unbekannter Kontakt'}</Text>
        {typeof item.lead_score === 'number' && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{item.lead_score}</Text>
          </View>
        )}
      </View>
      {item.email ? <Text style={styles.resultEmail}>{item.email}</Text> : null}
      {item.phone ? <Text style={styles.resultPhone}>{item.phone}</Text> : null}
      <Text style={styles.resultHeadline} numberOfLines={2}>
        {item.headline || 'Keine Vorschau verfügbar.'}
      </Text>
      <View style={styles.matchedFields}>
        {item.matched_fields.map(field => (
          <View key={`${item.id}-${field}`} style={styles.fieldBadge}>
            <Text style={styles.fieldText}>{field}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handlePrevPage = () => {
    setPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPage(prev => Math.min(totalPages, prev + 1));
  };

  const updateNumericFilter = (key: keyof AdvancedFilters, value: string) => {
    const parsed = value === '' ? undefined : Number(value);
    setFilters(prev => ({ ...prev, [key]: parsed }));
  };

  const updateTags = (key: 'tags_any' | 'tags_all', value: string) => {
    const parsed =
      value.trim().length === 0
        ? undefined
        : value
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean);
    setFilters(prev => ({ ...prev, [key]: parsed }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Suche nach Kontakten, Notizen oder Telefonnummern"
          value={query}
          onChangeText={text => {
            setPage(1);
            setQuery(text);
          }}
        />
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={handleVoiceSearch}
          disabled={isVoiceSearching}
        >
          <Text style={styles.voiceIcon}>{isVoiceSearching ? '🔴' : '🎤'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(prev => !prev)}>
          <Text style={styles.filterIcon}>{showFilters ? '✖️' : '⚙️'}</Text>
        </TouchableOpacity>
      </View>

      {suggestions.length > 0 && query.length >= 2 && (
        <View style={styles.suggestions}>
          {suggestions.map(suggestion => (
            <TouchableOpacity
              key={suggestion}
              style={styles.suggestionItem}
              onPress={() => setQuery(suggestion)}
            >
              <Text>🔍 {suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showFilters && (
        <ScrollView style={styles.filterPanel} nestedScrollEnabled>
          <Text style={styles.sectionTitle}>Filter</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map(status => {
              const active = filters.statuses?.includes(status);
              return (
                <TouchableOpacity
                  key={status}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleStatus(status)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{status}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.filterGrid}>
            <View style={styles.filterInput}>
              <Text style={styles.filterLabel}>Lead Score min</Text>
              <TextInput
                keyboardType="numeric"
                style={styles.filterTextInput}
                value={filters.lead_score_min?.toString() ?? ''}
                onChangeText={value => updateNumericFilter('lead_score_min', value)}
              />
            </View>
            <View style={styles.filterInput}>
              <Text style={styles.filterLabel}>Lead Score max</Text>
              <TextInput
                keyboardType="numeric"
                style={styles.filterTextInput}
                value={filters.lead_score_max?.toString() ?? ''}
                onChangeText={value => updateNumericFilter('lead_score_max', value)}
              />
            </View>
          </View>
          <View style={styles.filterGrid}>
            <View style={styles.filterInput}>
              <Text style={styles.filterLabel}>Letzter Kontakt (Tage)</Text>
              <TextInput
                keyboardType="numeric"
                style={styles.filterTextInput}
                value={filters.last_contact_days?.toString() ?? ''}
                onChangeText={value => updateNumericFilter('last_contact_days', value)}
              />
            </View>
            <View style={styles.filterInput}>
              <Text style={styles.filterLabel}>Min. Interaktionen</Text>
              <TextInput
                keyboardType="numeric"
                style={styles.filterTextInput}
                value={filters.total_interactions_min?.toString() ?? ''}
                onChangeText={value => updateNumericFilter('total_interactions_min', value)}
              />
            </View>
          </View>
          <View style={styles.filterInput}>
            <Text style={styles.filterLabel}>Tags (ANY)</Text>
            <TextInput
              placeholder="tag1, tag2"
              style={styles.filterTextInput}
              value={tagsAnyInput}
              onChangeText={setTagsAnyInput}
              onEndEditing={() => updateTags('tags_any', tagsAnyInput)}
            />
          </View>
          <View style={styles.filterInput}>
            <Text style={styles.filterLabel}>Tags (ALL)</Text>
            <TextInput
              placeholder="tagA, tagB"
              style={styles.filterTextInput}
              value={tagsAllInput}
              onChangeText={setTagsAllInput}
              onEndEditing={() => updateTags('tags_all', tagsAllInput)}
            />
          </View>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setFilters({});
              setTagsAllInput('');
              setTagsAnyInput('');
            }}
          >
            <Text style={styles.clearFiltersText}>Filter zurücksetzen</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <View style={styles.sortContainer}>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[styles.sortChip, sortBy === option.value && styles.sortChipActive]}
              onPress={() => {
                setSortBy(option.value);
                setPage(1);
              }}
            >
              <Text
                style={[styles.sortChipText, sortBy === option.value && styles.sortChipTextActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sortRow}>
          {(['desc', 'asc'] as SearchSortOrder[]).map(order => (
            <TouchableOpacity
              key={order}
              style={[styles.sortChipSmall, sortOrder === order && styles.sortChipActive]}
              onPress={() => {
                setSortOrder(order);
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortOrder === order && styles.sortChipTextActive,
                ]}
              >
                {order === 'desc' ? '↓' : '↑'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.savedContainer}>
        <Text style={styles.sectionTitle}>Gespeicherte Suchen</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.savedScroll}>
          {savedSearches.map(saved => (
            <View key={saved.id} style={styles.savedChip}>
              <TouchableOpacity onPress={() => applySavedSearch(saved)}>
                <Text style={styles.savedChipText}>{saved.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteSavedSearch(saved.id)}>
                <Text style={styles.savedChipDelete}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSearch}>
            <Text style={styles.saveButtonText}>+ Speichern</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {history.length > 0 && query.length === 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Letzte Suchbegriffe</Text>
          <View style={styles.chipRow}>
            {history.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.chip}
                onPress={() => handleHistoryFill(item)}
              >
                <Text style={styles.chipText}>{item.query}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {total > 0 ? `${total} Treffer` : 'Keine Ergebnisse'}
        </Text>
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
            onPress={handlePrevPage}
            disabled={page === 1}
          >
            <Text style={styles.pageButtonText}>Zurück</Text>
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>
            Seite {page}/{totalPages}
          </Text>
          <TouchableOpacity
            style={[
              styles.pageButton,
              page >= totalPages && styles.pageButtonDisabled,
            ]}
            onPress={handleNextPage}
            disabled={page >= totalPages}
          >
            <Text style={styles.pageButtonText}>Weiter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.results}
          ListEmptyComponent={
            query.length >= 2 ? (
              <Text style={styles.emptyText}>Keine Treffer gefunden.</Text>
            ) : null
          }
        />
      )}
    </View>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 32,
  },
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceIcon: {
    fontSize: 20,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: {
    fontSize: 18,
  },
  suggestions: {
    backgroundColor: '#1E1E1E',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2E2E2E',
  },
  filterPanel: {
    backgroundColor: '#111827',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    maxHeight: 260,
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontWeight: '600',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1E293B',
  },
  chipActive: {
    backgroundColor: '#22D3EE',
  },
  chipText: {
    color: '#CBD5F5',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
  filterGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  filterInput: {
    flex: 1,
    marginTop: 12,
  },
  filterLabel: {
    color: '#94A3B8',
    marginBottom: 4,
  },
  filterTextInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
  },
  clearFiltersButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  clearFiltersText: {
    color: '#fff',
    fontWeight: '600',
  },
  sortContainer: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  sortChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sortChipSmall: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sortChipActive: {
    backgroundColor: '#22D3EE',
  },
  sortChipText: {
    color: '#CBD5F5',
    fontSize: 12,
  },
  sortChipTextActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
  savedContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  savedScroll: {
    marginTop: 4,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
    gap: 4,
  },
  savedChipText: {
    color: '#F8FAFC',
    fontSize: 12,
  },
  savedChipDelete: {
    color: '#94A3B8',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#34D399',
    borderRadius: 999,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  historyContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  summaryText: {
    color: '#E2E8F0',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#22D3EE',
  },
  pageButtonDisabled: {
    backgroundColor: '#1E293B',
  },
  pageButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  pageIndicator: {
    color: '#CBD5F5',
  },
  loader: {
    marginTop: 32,
  },
  results: {
    paddingHorizontal: 16,
    paddingBottom: 64,
  },
  resultCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultName: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '600',
  },
  scoreBadge: {
    backgroundColor: '#F97316',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  resultEmail: {
    color: '#CBD5F5',
    fontSize: 13,
  },
  resultPhone: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 6,
  },
  resultHeadline: {
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  matchedFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fieldBadge: {
    backgroundColor: '#0EA5E9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fieldText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 32,
  },
});

