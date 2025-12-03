/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  UTILITIES INDEX                                                           ║
 * ║  Zentrale Exports für alle Utility-Funktionen                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// API
export { api, apiRequest, clearCache, parseApiError, getErrorMessage } from './api';
export type { ApiError, ApiResponse, RequestOptions } from './api';

// Validation
export { validators, validate, sanitize, commonSchemas } from './validation';
export type { ValidationResult, ValidationRule } from './validation';

// Storage
export { 
  setItem, 
  getItem, 
  removeItem, 
  setItemWithExpiry,
  multiGet,
  multiSet,
  multiRemove,
  getAllKeys,
  getStorageSize,
  clearExpired,
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  clearOfflineQueue,
  STORAGE_KEYS,
} from './storage';

// Format
export {
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
} from './format';

