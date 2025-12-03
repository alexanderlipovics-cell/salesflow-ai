/**
 * Sales Flow AI - Finance Types & Utilities
 * Typen für das Finance Overview System
 */

// ============ TRANSACTION TYPES ============

export const TransactionTypes = {
  INCOME: 'income',
  EXPENSE: 'expense',
};

export const TransactionCategories = {
  // Einnahmen
  COMMISSION: 'commission',
  TEAM_BONUS: 'team_bonus',
  RANK_BONUS: 'rank_bonus',
  FAST_START: 'fast_start',
  LEADERSHIP: 'leadership',
  OTHER_INCOME: 'other_income',
  // Ausgaben
  PRODUCT_PURCHASE: 'product_purchase',
  MARKETING: 'marketing',
  TOOLS: 'tools',
  TRAVEL: 'travel',
  OTHER_EXPENSE: 'other_expense',
};

export const TransactionStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
};

// ============ CATEGORY METADATA ============

export const CATEGORY_META = {
  commission: { 
    label: 'Provisionen', 
    emoji: '💰', 
    color: '#10B981', 
    type: 'income' 
  },
  team_bonus: { 
    label: 'Team-Bonus', 
    emoji: '👥', 
    color: '#06B6D4', 
    type: 'income' 
  },
  rank_bonus: { 
    label: 'Rang-Bonus', 
    emoji: '🏆', 
    color: '#8B5CF6', 
    type: 'income' 
  },
  fast_start: { 
    label: 'Fast-Start', 
    emoji: '🚀', 
    color: '#F59E0B', 
    type: 'income' 
  },
  leadership: { 
    label: 'Leadership', 
    emoji: '👑', 
    color: '#EC4899', 
    type: 'income' 
  },
  other_income: { 
    label: 'Sonstige Einnahmen', 
    emoji: '📥', 
    color: '#64748B', 
    type: 'income' 
  },
  product_purchase: { 
    label: 'Produkte', 
    emoji: '📦', 
    color: '#EF4444', 
    type: 'expense' 
  },
  marketing: { 
    label: 'Marketing', 
    emoji: '📢', 
    color: '#F97316', 
    type: 'expense' 
  },
  tools: { 
    label: 'Tools', 
    emoji: '🔧', 
    color: '#6366F1', 
    type: 'expense' 
  },
  travel: { 
    label: 'Reisen', 
    emoji: '✈️', 
    color: '#14B8A6', 
    type: 'expense' 
  },
  other_expense: { 
    label: 'Sonstige Ausgaben', 
    emoji: '📤', 
    color: '#94A3B8', 
    type: 'expense' 
  },
};

// ============ INCOME CATEGORIES ============

export const INCOME_CATEGORIES = [
  { value: 'commission', label: '💰 Provisionen' },
  { value: 'team_bonus', label: '👥 Team-Bonus' },
  { value: 'rank_bonus', label: '🏆 Rang-Bonus' },
  { value: 'fast_start', label: '🚀 Fast-Start' },
  { value: 'leadership', label: '👑 Leadership' },
  { value: 'other_income', label: '📥 Sonstiges' },
];

export const EXPENSE_CATEGORIES = [
  { value: 'product_purchase', label: '📦 Produkte' },
  { value: 'marketing', label: '📢 Marketing' },
  { value: 'tools', label: '🔧 Tools' },
  { value: 'travel', label: '✈️ Reisen' },
  { value: 'other_expense', label: '📤 Sonstiges' },
];

// ============ UTILS ============

/**
 * Formatiert einen Geldbetrag
 * @param {number} amount - Betrag
 * @param {string} currency - Währung (default: EUR)
 * @returns {string} Formatierter Betrag
 */
export function formatMoney(amount, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Formatiert einen Prozentsatz
 * @param {number} value - Wert (0-1)
 * @param {number} decimals - Dezimalstellen
 * @returns {string} Formatierter Prozentsatz
 */
export function formatPercentage(value, decimals = 1) {
  return `${((value || 0) * 100).toFixed(decimals)}%`;
}

/**
 * Gibt ein relatives Datum zurück
 * @param {string} dateStr - Datum als String
 * @returns {string} Relatives Datum
 */
export function getRelativeDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

/**
 * Gibt das Label einer Kategorie zurück
 * @param {string} category - Kategorie-Key
 * @returns {string} Label
 */
export function getCategoryLabel(category) {
  return CATEGORY_META[category]?.label || category;
}

/**
 * Gibt das Emoji einer Kategorie zurück
 * @param {string} category - Kategorie-Key
 * @returns {string} Emoji
 */
export function getCategoryEmoji(category) {
  return CATEGORY_META[category]?.emoji || '📝';
}

/**
 * Gibt die Farbe einer Kategorie zurück
 * @param {string} category - Kategorie-Key
 * @returns {string} Hex-Farbe
 */
export function getCategoryColor(category) {
  return CATEGORY_META[category]?.color || '#64748B';
}

/**
 * Berechnet den Monatsnamen
 * @param {string} monthStr - Format: "YYYY-MM"
 * @returns {string} Monatsname
 */
export function getMonthName(monthStr) {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('de-DE', { month: 'short' });
}

/**
 * Gibt den aktuellen Monat als Objekt zurück
 * @returns {{ month: number, year: number }}
 */
export function getCurrentPeriod() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

/**
 * Gibt das Start- und Enddatum des aktuellen Monats zurück
 * @returns {{ from: string, to: string }}
 */
export function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    from: firstDay.toISOString().split('T')[0],
    to: lastDay.toISOString().split('T')[0],
  };
}

export default {
  TransactionTypes,
  TransactionCategories,
  TransactionStatus,
  CATEGORY_META,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  formatMoney,
  formatPercentage,
  getRelativeDate,
  getCategoryLabel,
  getCategoryEmoji,
  getCategoryColor,
  getMonthName,
  getCurrentPeriod,
  getCurrentMonthRange,
};

