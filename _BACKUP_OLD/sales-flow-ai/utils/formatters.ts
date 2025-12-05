// utils/formatters.ts
// Zentrale Formatierungs- und Scoring-Helfer für die Mobile App

import { COLORS } from './colors';

/**
 * Format due date relative to now with overdue detection.
 * Nutzt echte Datumslogik (nicht String-Matching).
 */
export const formatDueDate = (
  isoString: string,
): { text: string; isOverdue: boolean } => {
  const due = new Date(isoString);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();

  // Overdue
  if (diffMs < 0) {
    const overdueDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    return {
      text: overdueDays === 0 ? 'Heute überfällig' : `${overdueDays}d überfällig`,
      isOverdue: true,
    };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    return { text: 'Jetzt fällig', isOverdue: false };
  }
  if (diffHours < 24) {
    return { text: `in ${diffHours}h`, isOverdue: false };
  }

  const diffDays = Math.floor(diffHours / 24);
  return {
    text: diffDays === 1 ? 'in 1 Tag' : `in ${diffDays} Tagen`,
    isOverdue: false,
  };
};

/**
 * Format timestamp relative to now.
 */
export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'gerade eben';
  if (diffMins < 60) return `vor ${diffMins}min`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `vor ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays}d`;

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return date.toLocaleDateString('de-DE', options);
};

/**
 * Format date range for challenges.
 */
export const formatDateRange = (startISO: string, endISO: string): string => {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

  const startStr = start.toLocaleDateString('de-DE', options);
  const endStr = end.toLocaleDateString('de-DE', options);

  // Same month → kürzere Schreibweise
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}-${endStr}`;
  }

  return `${startStr} - ${endStr}`;
};

/**
 * Get priority color (6-level system).
 */
export const getPriorityColor = (score: number): string => {
  if (score >= 95) return COLORS.priority.veryHigh;
  if (score >= 85) return COLORS.priority.high;
  if (score >= 70) return COLORS.priority.mediumHigh;
  if (score >= 50) return COLORS.priority.medium;
  if (score >= 30) return COLORS.priority.low;
  return COLORS.priority.veryLow;
};

/**
 * Get priority label text.
 */
export const getPriorityLabel = (score: number): string => {
  if (score >= 95) return 'Sehr dringend';
  if (score >= 85) return 'Dringend';
  if (score >= 70) return 'Wichtig';
  if (score >= 50) return 'Normal';
  if (score >= 30) return 'Niedrig';
  return 'Sehr niedrig';
};

/**
 * Get rank styling with medals.
 */
export const getRankStyle = (
  rank: number,
): { color: string; icon: string } => {
  switch (rank) {
    case 1:
      return { color: COLORS.ranks.gold, icon: '🥇' };
    case 2:
      return { color: COLORS.ranks.silver, icon: '🥈' };
    case 3:
      return { color: COLORS.ranks.bronze, icon: '🥉' };
    default:
      return {
        color: rank <= 10 ? COLORS.ranks.top10 : COLORS.ranks.default,
        icon: '',
      };
  }
};

/**
 * Get action type icon (emoji).
 */
export const getActionIcon = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'call':
      return '📞';
    case 'message':
      return '💬';
    case 'whatsapp':
      return '💬';
    case 'email':
      return '📧';
    case 'meeting':
      return '🤝';
    case 'follow_up':
      return '🔄';
    case 'note':
      return '📝';
    default:
      return '📌';
  }
};


