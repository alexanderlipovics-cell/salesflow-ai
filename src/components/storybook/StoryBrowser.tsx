/**
 * StoryBrowser Component
 * Durchsucht und filtert Stories aus dem Brand Storybook
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import StoryCard from './StoryCard';

interface Story {
  id: string;
  title: string;
  story_type: string;
  audience: string;
  content_30s?: string;
  content_1min?: string;
  content_2min?: string;
  content_full?: string;
  use_case?: string;
  tags?: string[];
}

interface StoryBrowserProps {
  stories: Story[];
  loading?: boolean;
  onRefresh?: () => void;
  onStorySelect?: (story: Story) => void;
  onStoryCopy?: (content: string) => void;
  companyName?: string;
}

const STORY_TYPE_FILTERS = [
  { key: 'all', label: '🎯 Alle' },
  { key: 'elevator_pitch', label: '⚡ Pitch' },
  { key: 'short_story', label: '📖 Story' },
  { key: 'product_story', label: '📦 Produkt' },
  { key: 'objection_story', label: '🛡️ Einwand' },
  { key: 'why_story', label: '❓ Warum' },
  { key: 'success_story', label: '🏆 Erfolg' },
];

const AUDIENCE_FILTERS = [
  { key: 'all', label: '👥 Alle' },
  { key: 'consumer', label: '👤 Kunden' },
  { key: 'business_partner', label: '🤝 Partner' },
  { key: 'skeptic', label: '🤔 Skeptiker' },
  { key: 'health_professional', label: '⚕️ Fachleute' },
];

const StoryBrowser: React.FC<StoryBrowserProps> = ({
  stories,
  loading = false,
  onRefresh,
  onStorySelect,
  onStoryCopy,
  companyName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAudience, setSelectedAudience] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  }, [onRefresh]);

  const filteredStories = stories.filter(story => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = story.title.toLowerCase().includes(query);
      const matchesTags = story.tags?.some(tag => tag.toLowerCase().includes(query));
      const matchesContent = [
        story.content_30s,
        story.content_1min,
        story.content_2min,
        story.content_full,
      ].some(c => c?.toLowerCase().includes(query));
      
      if (!matchesTitle && !matchesTags && !matchesContent) {
        return false;
      }
    }

    // Type filter
    if (selectedType !== 'all' && story.story_type !== selectedType) {
      return false;
    }

    // Audience filter
    if (selectedAudience !== 'all' && story.audience !== selectedAudience) {
      return false;
    }

    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          📖 Story-Bibliothek
        </Text>
        {companyName && (
          <Text style={styles.companyName}>{companyName}</Text>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Stories durchsuchen..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {STORY_TYPE_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedType === filter.key && styles.filterChipActive,
            ]}
            onPress={() => setSelectedType(filter.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === filter.key && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Audience Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {AUDIENCE_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              styles.audienceChip,
              selectedAudience === filter.key && styles.filterChipActive,
            ]}
            onPress={() => setSelectedAudience(filter.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedAudience === filter.key && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredStories.length} {filteredStories.length === 1 ? 'Story' : 'Stories'}
          {searchQuery && ` für "${searchQuery}"`}
        </Text>
      </View>

      {/* Stories List */}
      <ScrollView
        style={styles.storiesList}
        contentContainerStyle={styles.storiesContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Stories werden geladen...</Text>
          </View>
        ) : filteredStories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Keine Stories gefunden</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Versuche andere Suchbegriffe oder Filter.'
                : 'Es wurden noch keine Stories importiert.'}
            </Text>
          </View>
        ) : (
          filteredStories.map(story => (
            <StoryCard
              key={story.id}
              story={story}
              onCopy={onStoryCopy}
              onUse={onStorySelect}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  companyName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  clearButton: {
    position: 'absolute',
    right: SPACING.lg + SPACING.md,
    padding: SPACING.sm,
  },
  clearButtonText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  filterScroll: {
    backgroundColor: COLORS.card,
    maxHeight: 50,
  },
  filterContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
  },
  audienceChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  resultsHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultsCount: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  storiesList: {
    flex: 1,
  },
  storiesContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default StoryBrowser;

