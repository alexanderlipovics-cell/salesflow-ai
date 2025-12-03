/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SKELETON LOADER                                                           ║
 * ║  Animierte Platzhalter für Loading States                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number | `${number}%` | 'auto';
  borderRadius?: number;
  style?: ViewStyle;
}

interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: string;
  style?: ViewStyle;
}

interface SkeletonCardProps {
  hasImage?: boolean;
  imagePosition?: 'left' | 'top';
  lines?: number;
  style?: ViewStyle;
}

// =============================================================================
// BASE SKELETON
// =============================================================================

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    return () => animation.stop();
  }, []);
  
  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// =============================================================================
// SKELETON TEXT (Multiple Lines)
// =============================================================================

export function SkeletonText({
  lines = 3,
  lineHeight = 16,
  lastLineWidth = '60%',
  style,
}: SkeletonTextProps) {
  return (
    <View style={[styles.textContainer, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={lineHeight}
          style={styles.textLine}
        />
      ))}
    </View>
  );
}

// =============================================================================
// SKELETON AVATAR
// =============================================================================

export function SkeletonAvatar({
  size = 48,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}

// =============================================================================
// SKELETON CARD
// =============================================================================

export function SkeletonCard({
  hasImage = false,
  imagePosition = 'top',
  lines = 2,
  style,
}: SkeletonCardProps) {
  const isHorizontal = imagePosition === 'left';
  
  return (
    <View style={[styles.card, isHorizontal && styles.cardHorizontal, style]}>
      {hasImage && (
        <Skeleton
          width={isHorizontal ? 80 : '100%'}
          height={isHorizontal ? 80 : 150}
          borderRadius={isHorizontal ? 8 : 12}
          style={isHorizontal ? styles.imageLeft : styles.imageTop}
        />
      )}
      <View style={styles.cardContent}>
        <Skeleton width="70%" height={20} style={styles.cardTitle} />
        <SkeletonText lines={lines} lineHeight={14} />
      </View>
    </View>
  );
}

// =============================================================================
// SKELETON LIST ITEM
// =============================================================================

export function SkeletonListItem({
  hasAvatar = true,
  lines = 2,
  style,
}: {
  hasAvatar?: boolean;
  lines?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.listItem, style]}>
      {hasAvatar && <SkeletonAvatar size={48} style={styles.listAvatar} />}
      <View style={styles.listContent}>
        <Skeleton width="60%" height={16} style={styles.listTitle} />
        {lines > 1 && <Skeleton width="80%" height={12} style={styles.listSubtitle} />}
      </View>
      <Skeleton width={60} height={24} borderRadius={12} />
    </View>
  );
}

// =============================================================================
// SKELETON STATS CARD
// =============================================================================

export function SkeletonStatsCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.statsCard, style]}>
      <Skeleton width={40} height={40} borderRadius={8} style={styles.statsIcon} />
      <Skeleton width="50%" height={28} style={styles.statsValue} />
      <Skeleton width="70%" height={14} />
    </View>
  );
}

// =============================================================================
// SKELETON CHART
// =============================================================================

export function SkeletonChart({ 
  height = 200,
  style,
}: { 
  height?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.chartContainer, { height }, style]}>
      <View style={styles.chartBars}>
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <Skeleton
            key={i}
            width={24}
            height={`${h}%`}
            borderRadius={4}
            style={styles.chartBar}
          />
        ))}
      </View>
      <View style={styles.chartLabels}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width={24} height={10} borderRadius={2} />
        ))}
      </View>
    </View>
  );
}

// =============================================================================
// FULL PAGE SKELETON
// =============================================================================

export function SkeletonPage() {
  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <SkeletonAvatar size={40} />
        <View style={styles.pageHeaderText}>
          <Skeleton width={120} height={20} />
          <Skeleton width={80} height={14} style={{ marginTop: 4 }} />
        </View>
      </View>
      
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <SkeletonStatsCard style={styles.statsFlex} />
        <SkeletonStatsCard style={styles.statsFlex} />
        <SkeletonStatsCard style={styles.statsFlex} />
      </View>
      
      {/* Cards */}
      <SkeletonCard hasImage lines={2} style={styles.pageCard} />
      <SkeletonCard lines={3} style={styles.pageCard} />
      
      {/* List */}
      <SkeletonListItem style={styles.pageListItem} />
      <SkeletonListItem style={styles.pageListItem} />
      <SkeletonListItem style={styles.pageListItem} />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E2E8F0',
  },
  
  // Text
  textContainer: {
    gap: 8,
  },
  textLine: {
    marginBottom: 0,
  },
  
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHorizontal: {
    flexDirection: 'row',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    marginBottom: 12,
  },
  imageTop: {
    marginBottom: 12,
  },
  imageLeft: {
    marginRight: 12,
  },
  
  // List Item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
  },
  listAvatar: {
    marginRight: 12,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    marginBottom: 4,
  },
  listSubtitle: {},
  
  // Stats Card
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statsIcon: {
    marginBottom: 12,
  },
  statsValue: {
    marginBottom: 8,
  },
  statsFlex: {
    flex: 1,
    marginHorizontal: 4,
  },
  
  // Chart
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  chartBar: {},
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  
  // Page
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageHeaderText: {
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pageCard: {
    marginBottom: 16,
  },
  pageListItem: {
    marginBottom: 8,
  },
});

export default Skeleton;

