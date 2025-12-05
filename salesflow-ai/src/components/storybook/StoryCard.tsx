/**
 * StoryCard Component
 * Zeigt eine einzelne Story aus dem Brand Storybook
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Clipboard,
  Animated,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

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

interface StoryCardProps {
  story: Story;
  onCopy?: (content: string) => void;
  onUse?: (story: Story) => void;
  compact?: boolean;
}

const STORY_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  elevator_pitch: { icon: '⚡', label: 'Elevator Pitch', color: COLORS.success },
  short_story: { icon: '📖', label: 'Kurz-Story', color: COLORS.primary },
  founder_story: { icon: '👤', label: 'Gründer-Story', color: COLORS.secondary },
  product_story: { icon: '📦', label: 'Produkt-Story', color: COLORS.accent },
  why_story: { icon: '❓', label: 'Warum-Story', color: COLORS.warning },
  objection_story: { icon: '🛡️', label: 'Einwand-Story', color: COLORS.error },
  success_story: { icon: '🏆', label: 'Erfolgs-Story', color: '#10b981' },
  science_story: { icon: '🔬', label: 'Wissenschaft', color: '#6366f1' },
};

const AUDIENCE_CONFIG: Record<string, { icon: string; label: string }> = {
  consumer: { icon: '👤', label: 'Endkunde' },
  business_partner: { icon: '🤝', label: 'Partner' },
  health_professional: { icon: '⚕️', label: 'Fachpersonal' },
  skeptic: { icon: '🤔', label: 'Skeptiker' },
  warm_contact: { icon: '🔥', label: 'Warm' },
  cold_contact: { icon: '❄️', label: 'Kalt' },
};

const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onCopy,
  onUse,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedLength, setSelectedLength] = useState<'30s' | '1min' | '2min' | 'full'>('30s');

  const storyConfig = STORY_TYPE_CONFIG[story.story_type] || {
    icon: '📄',
    label: story.story_type,
    color: COLORS.textSecondary,
  };
  
  const audienceConfig = AUDIENCE_CONFIG[story.audience] || {
    icon: '👤',
    label: story.audience,
  };

  const getContent = () => {
    switch (selectedLength) {
      case '30s':
        return story.content_30s;
      case '1min':
        return story.content_1min;
      case '2min':
        return story.content_2min;
      case 'full':
        return story.content_full;
      default:
        return story.content_30s || story.content_1min || story.content_2min || story.content_full;
    }
  };

  const availableLengths = [
    { key: '30s', label: '30s', content: story.content_30s },
    { key: '1min', label: '1 Min', content: story.content_1min },
    { key: '2min', label: '2 Min', content: story.content_2min },
    { key: 'full', label: 'Voll', content: story.content_full },
  ].filter(l => l.content);

  const handleCopy = () => {
    const content = getContent();
    if (content) {
      Clipboard.setString(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.(content);
    }
  };

  const content = getContent();

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.compactHeader}>
          <Text style={styles.compactIcon}>{storyConfig.icon}</Text>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {story.title}
          </Text>
          <View style={[styles.audienceBadge, { backgroundColor: storyConfig.color + '20' }]}>
            <Text style={[styles.audienceText, { color: storyConfig.color }]}>
              {audienceConfig.icon} {audienceConfig.label}
            </Text>
          </View>
        </View>
        
        {expanded && content && (
          <View style={styles.compactContent}>
            <Text style={styles.contentText} numberOfLines={5}>
              {content}
            </Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
              <Text style={styles.copyButtonText}>
                {copied ? '✅ Kopiert!' : '📋 Kopieren'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.typeBadge, { backgroundColor: storyConfig.color + '20' }]}>
            <Text style={styles.typeIcon}>{storyConfig.icon}</Text>
            <Text style={[styles.typeLabel, { color: storyConfig.color }]}>
              {storyConfig.label}
            </Text>
          </View>
          <View style={styles.audienceBadge}>
            <Text style={styles.audienceText}>
              {audienceConfig.icon} {audienceConfig.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{story.title}</Text>

      {/* Use Case */}
      {story.use_case && (
        <View style={styles.useCaseContainer}>
          <Text style={styles.useCaseLabel}>💡 Wann nutzen:</Text>
          <Text style={styles.useCaseText}>{story.use_case}</Text>
        </View>
      )}

      {/* Length Selector */}
      {availableLengths.length > 1 && (
        <View style={styles.lengthSelector}>
          {availableLengths.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.lengthButton,
                selectedLength === key && styles.lengthButtonActive,
              ]}
              onPress={() => setSelectedLength(key as any)}
            >
              <Text
                style={[
                  styles.lengthButtonText,
                  selectedLength === key && styles.lengthButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {content && (
        <View style={styles.contentContainer}>
          <Text style={styles.contentText}>{content}</Text>
        </View>
      )}

      {/* Tags */}
      {story.tags && story.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {story.tags.slice(0, 4).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.copyActionButton]}
          onPress={handleCopy}
        >
          <Text style={styles.actionButtonText}>
            {copied ? '✅ Kopiert!' : '📋 Kopieren'}
          </Text>
        </TouchableOpacity>
        
        {onUse && (
          <TouchableOpacity
            style={[styles.actionButton, styles.useActionButton]}
            onPress={() => onUse(story)}
          >
            <Text style={[styles.actionButtonText, styles.useButtonText]}>
              ✨ Verwenden
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  compactCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  compactIcon: {
    fontSize: 18,
  },
  compactTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  compactContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  typeIcon: {
    fontSize: 14,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  audienceBadge: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  audienceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  useCaseContainer: {
    backgroundColor: COLORS.infoBg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  useCaseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  useCaseText: {
    fontSize: 14,
    color: COLORS.text,
  },
  lengthSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  lengthButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
  },
  lengthButtonActive: {
    backgroundColor: COLORS.primary,
  },
  lengthButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  lengthButtonTextActive: {
    color: COLORS.white,
  },
  contentContainer: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  contentText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  tag: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  copyActionButton: {
    backgroundColor: COLORS.borderLight,
  },
  useActionButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  useButtonText: {
    color: COLORS.white,
  },
  copyButton: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  copyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
});

export default StoryCard;

