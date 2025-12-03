/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  FORMAT UTILITIES                                                          ║
 * ║  Formatierungsfunktionen für Zahlen, Daten, Text                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// NUMBER FORMATTING
// =============================================================================

export function formatNumber(
  value: number,
  options?: {
    decimals?: number;
    locale?: string;
    compact?: boolean;
  }
): string {
  const { decimals = 0, locale = 'de-DE', compact = false } = options || {};
  
  if (compact) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCurrency(
  value: number,
  currency: string = 'EUR',
  locale: string = 'de-DE'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatPercent(
  value: number,
  decimals: number = 1,
  locale: string = 'de-DE'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

// =============================================================================
// DATE FORMATTING
// =============================================================================

export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale: string = 'de-DE'
): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, options || {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(
  date: Date | string | number,
  locale: string = 'de-DE'
): string {
  const d = new Date(date);
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(
  date: Date | string | number,
  locale: string = 'de-DE'
): string {
  const d = new Date(date);
  return `${formatDate(d, undefined, locale)}, ${formatTime(d, locale)}`;
}

export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  
  if (diffSec < 60) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHour < 24) return `vor ${diffHour} Std.`;
  if (diffDay === 1) return 'gestern';
  if (diffDay < 7) return `vor ${diffDay} Tagen`;
  if (diffWeek === 1) return 'letzte Woche';
  if (diffWeek < 4) return `vor ${diffWeek} Wochen`;
  if (diffMonth === 1) return 'letzten Monat';
  if (diffMonth < 12) return `vor ${diffMonth} Monaten`;
  
  return formatDate(d);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// =============================================================================
// TEXT FORMATTING
// =============================================================================

export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length).trim() + suffix;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function titleCase(text: string): string {
  return text
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, char => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[char] || char)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function pluralize(
  count: number,
  singular: string,
  plural: string
): string {
  return count === 1 ? singular : plural;
}

export function initials(name: string, maxLength: number = 2): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, maxLength)
    .join('');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;
  
  return phone.replace(/\d(?=\d{4})/g, '*');
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatBytes,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  truncate,
  capitalize,
  titleCase,
  slugify,
  pluralize,
  initials,
  maskEmail,
  maskPhone,
};

