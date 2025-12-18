/**
 * SALES FLOW AI - PRIORITY UTILITIES
 * 
 * Priority level helpers and formatting
 * Version: 2.0.0
 */

import { PRIORITY_LEVELS, type PriorityLevel, type FollowUpItem } from '@/types/priority';

// ============================================================================
// PRIORITY LEVEL HELPERS
// ============================================================================

/**
 * Get priority level for a score
 */
export function getPriorityLevel(score: number): PriorityLevel {
  return (
    PRIORITY_LEVELS.find((level) => score >= level.min && score <= level.max) ||
    PRIORITY_LEVELS[PRIORITY_LEVELS.length - 1]
  );
}

/**
 * Get priority color class (Tailwind) for a score
 */
export function getPriorityColorClass(score: number): string {
  const level = getPriorityLevel(score);
  return level.colorClass;
}

/**
 * Get priority label for a score
 */
export function getPriorityLabel(score: number): string {
  const level = getPriorityLevel(score);
  return level.label;
}

/**
 * Get priority description for a score
 */
export function getPriorityDescription(score: number): string {
  const level = getPriorityLevel(score);
  return level.description;
}

// ============================================================================
// SORTING & FILTERING
// ============================================================================

/**
 * Sort follow-ups by priority score
 */
export function sortByPriority(
  followUps: FollowUpItem[],
  descending = true
): FollowUpItem[] {
  return [...followUps].sort((a, b) =>
    descending
      ? b.priority_score - a.priority_score
      : a.priority_score - b.priority_score
  );
}

/**
 * Filter follow-ups by minimum priority score
 */
export function filterByMinPriority(
  followUps: FollowUpItem[],
  minScore: number
): FollowUpItem[] {
  return followUps.filter((item) => item.priority_score >= minScore);
}

/**
 * Filter follow-ups by priority level
 */
export function filterByPriorityLevel(
  followUps: FollowUpItem[],
  levelLabel: string
): FollowUpItem[] {
  const level = PRIORITY_LEVELS.find((l) => l.label === levelLabel);
  if (!level) return followUps;

  return followUps.filter(
    (item) => item.priority_score >= level.min && item.priority_score <= level.max
  );
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get priority distribution
 */
export function getPriorityDistribution(followUps: FollowUpItem[]): {
  level: string;
  count: number;
  percentage: number;
}[] {
  const total = followUps.length;
  if (total === 0) return [];

  return PRIORITY_LEVELS.map((level) => {
    const count = followUps.filter(
      (item) => item.priority_score >= level.min && item.priority_score <= level.max
    ).length;

    return {
      level: level.label,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });
}

/**
 * Get average priority score
 */
export function getAveragePriorityScore(followUps: FollowUpItem[]): number {
  if (followUps.length === 0) return 0;
  const sum = followUps.reduce((acc, item) => acc + item.priority_score, 0);
  return Math.round((sum / followUps.length) * 10) / 10;
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format priority score for display
 */
export function formatPriorityScore(score: number, decimals = 0): string {
  return score.toFixed(decimals);
}

/**
 * Get priority icon based on level
 */
export function getPriorityIcon(score: number): string {
  const level = getPriorityLevel(score);
  
  const iconMap: Record<string, string> = {
    red: '🔴',
    orange: '🟠',
    yellow: '🟡',
    blue: '🔵',
    gray: '⚪',
  };
  
  return iconMap[level.color] || '⚪';
}

// ============================================================================
// GROUPING
// ============================================================================

/**
 * Group follow-ups by priority level
 */
export function groupByPriorityLevel(followUps: FollowUpItem[]): Map<string, FollowUpItem[]> {
  const groups = new Map<string, FollowUpItem[]>();

  PRIORITY_LEVELS.forEach((level) => {
    groups.set(level.label, []);
  });

  followUps.forEach((item) => {
    const level = getPriorityLevel(item.priority_score);
    const group = groups.get(level.label);
    if (group) {
      group.push(item);
    }
  });

  return groups;
}

