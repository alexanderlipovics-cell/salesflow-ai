// ============================================
// 🔧 SALESFLOW AI - UTILITIES
// ============================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 */
export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value);
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date relative to now
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Gerade eben';
  if (diffInSeconds < 3600) return `vor ${Math.floor(diffInSeconds / 60)} Min.`;
  if (diffInSeconds < 86400) return `vor ${Math.floor(diffInSeconds / 3600)} Std.`;
  if (diffInSeconds < 604800) return `vor ${Math.floor(diffInSeconds / 86400)} Tagen`;

  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

/**
 * Format a date
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'short':
      return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
    case 'long':
      return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    case 'time':
      return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    default:
      return d.toLocaleDateString('de-DE');
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: 'hot' | 'warm' | 'cold'): string {
  const colors = {
    hot: 'text-red-500 bg-red-100 dark:bg-red-900/30',
    warm: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
    cold: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  };
  return colors[priority];
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'text-blue-500 bg-blue-100',
    contacted: 'text-purple-500 bg-purple-100',
    qualified: 'text-indigo-500 bg-indigo-100',
    proposal: 'text-amber-500 bg-amber-100',
    negotiation: 'text-orange-500 bg-orange-100',
    won: 'text-green-500 bg-green-100',
    lost: 'text-gray-500 bg-gray-100',
  };
  return colors[status] || 'text-gray-500 bg-gray-100';
}

/**
 * Get source icon name
 */
export function getSourceIcon(source: string): string {
  const icons: Record<string, string> = {
    facebook: 'facebook',
    instagram: 'instagram',
    linkedin: 'linkedin',
    website: 'globe',
    referral: 'users',
    manual: 'user-plus',
  };
  return icons[source] || 'user';
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if the device is mobile
 */
export function isMobile(): boolean {
  if (!isBrowser()) return false;
  return window.innerWidth < 768;
}

/**
 * Local storage helpers with JSON parsing
 */
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    if (!isBrowser()) return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set<T>(key: string, value: T): void {
    if (!isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  },
  remove(key: string): void {
    if (!isBrowser()) return;
    localStorage.removeItem(key);
  },
};

/**
 * Calculate score color based on value
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-blue-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

/**
 * Group items by a key
 */
export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
