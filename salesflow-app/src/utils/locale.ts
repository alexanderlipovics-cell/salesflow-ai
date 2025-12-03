/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  LOCALE UTILITIES                                                          ║
 * ║  Currency, Date, Number Formatting with Locale Awareness                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Usage:
 *   import { formatCurrency, formatDate, formatNumber } from '@/utils/locale';
 *   
 *   formatCurrency(1234.56);        // "1.234,56 €" (de-DE)
 *   formatDate(new Date());         // "03.12.2024" (de-DE)
 *   formatNumber(1234567.89);       // "1.234.567,89" (de-DE)
 */

import i18n from '@/i18n/config';
import { getCurrentLanguage } from '@/i18n/config';

// ═══════════════════════════════════════════════════════════════════════════════
// LOCALE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface LocaleConfig {
  locale: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

// Default configurations per language
const LOCALE_DEFAULTS: Record<string, LocaleConfig> = {
  de: {
    locale: 'de-DE',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
  },
  en: {
    locale: 'en-US',
    currency: 'USD',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  es: {
    locale: 'es-ES',
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  zh: {
    locale: 'zh-CN',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
  },
};

// User-overridden settings (loaded from user profile)
let userLocaleOverrides: Partial<LocaleConfig> = {};

/**
 * Set user-specific locale overrides
 */
export function setUserLocale(overrides: Partial<LocaleConfig>): void {
  userLocaleOverrides = { ...overrides };
}

/**
 * Get current locale configuration
 */
export function getLocaleConfig(): LocaleConfig {
  const lang = getCurrentLanguage();
  const defaults = LOCALE_DEFAULTS[lang] || LOCALE_DEFAULTS.de;
  
  return {
    ...defaults,
    ...userLocaleOverrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CURRENCY FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a number as currency
 * 
 * @param amount - The amount to format
 * @param currency - Override currency (optional)
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56)           // "1.234,56 €"
 * formatCurrency(1234.56, 'USD')    // "$1,234.56"
 */
export function formatCurrency(
  amount: number,
  currency?: string,
  options?: Partial<Intl.NumberFormatOptions>
): string {
  const config = getLocaleConfig();
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency || config.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/**
 * Format currency without decimal places (for display)
 */
export function formatCurrencyShort(amount: number, currency?: string): string {
  const config = getLocaleConfig();
  
  if (Math.abs(amount) >= 1000000) {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency || config.currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency || config.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency?: string): string {
  const config = getLocaleConfig();
  const curr = currency || config.currency;
  
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
    CNY: '¥',
  };
  
  return symbols[curr] || curr;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATE FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a date according to locale
 * 
 * @param date - Date to format
 * @param format - 'short', 'medium', 'long', 'full'
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date())              // "03.12.2024"
 * formatDate(new Date(), 'long')      // "3. Dezember 2024"
 */
export function formatDate(
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' = 'short'
): string {
  const config = getLocaleConfig();
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const options: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  };
  
  return new Intl.DateTimeFormat(config.locale, {
    ...options[format],
    timeZone: config.timezone,
  }).format(dateObj);
}

/**
 * Format a time according to locale
 */
export function formatTime(
  date: Date | string | number,
  includeSeconds: boolean = false
): string {
  const config = getLocaleConfig();
  const dateObj = date instanceof Date ? date : new Date(date);
  
  return new Intl.DateTimeFormat(config.locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: config.timeFormat === '12h',
    timeZone: config.timezone,
  }).format(dateObj);
}

/**
 * Format date and time
 */
export function formatDateTime(
  date: Date | string | number,
  dateFormat: 'short' | 'medium' | 'long' = 'short'
): string {
  return `${formatDate(date, dateFormat)}, ${formatTime(date)}`;
}

/**
 * Get relative time (e.g., "vor 2 Stunden")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const config = getLocaleConfig();
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  const rtf = new Intl.RelativeTimeFormat(config.locale, { numeric: 'auto' });
  
  if (Math.abs(diffDay) >= 1) {
    return rtf.format(-diffDay, 'day');
  } else if (Math.abs(diffHour) >= 1) {
    return rtf.format(-diffHour, 'hour');
  } else if (Math.abs(diffMin) >= 1) {
    return rtf.format(-diffMin, 'minute');
  } else {
    return rtf.format(-diffSec, 'second');
  }
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string | number): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  const today = new Date();
  
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is overdue
 */
export function isOverdue(date: Date | string | number): boolean {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  
  // Set time to end of day for comparison
  dateObj.setHours(23, 59, 59, 999);
  
  return dateObj < now;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a number according to locale
 */
export function formatNumber(
  value: number,
  options?: Partial<Intl.NumberFormatOptions>
): string {
  const config = getLocaleConfig();
  
  return new Intl.NumberFormat(config.locale, options).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(
  value: number,
  decimals: number = 0
): string {
  const config = getLocaleConfig();
  
  return new Intl.NumberFormat(config.locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format large numbers with compact notation
 */
export function formatCompact(value: number): string {
  const config = getLocaleConfig();
  
  return new Intl.NumberFormat(config.locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SORTING & COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a locale-aware string comparator
 */
export function createStringComparator(): (a: string, b: string) => number {
  const config = getLocaleConfig();
  
  return new Intl.Collator(config.locale, {
    sensitivity: 'base',
    numeric: true,
  }).compare;
}

/**
 * Sort an array of objects by a string field
 */
export function sortByString<T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  const comparator = createStringComparator();
  
  return [...array].sort((a, b) => {
    const result = comparator(String(a[key]), String(b[key]));
    return direction === 'asc' ? result : -result;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  setUserLocale,
  getLocaleConfig,
  formatCurrency,
  formatCurrencyShort,
  getCurrencySymbol,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  isToday,
  isOverdue,
  formatNumber,
  formatPercent,
  formatCompact,
  createStringComparator,
  sortByString,
};

