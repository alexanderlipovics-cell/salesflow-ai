/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ASYNC STORAGE UTILITIES                                                   ║
 * ║  Typsichere Wrapper für AsyncStorage mit JSON-Support                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// TYPES
// =============================================================================

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

// =============================================================================
// STORAGE KEYS
// =============================================================================

export const STORAGE_KEYS = {
  // Auth
  AUTH_TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER_DATA: '@user_data',
  
  // Settings
  SETTINGS: '@settings',
  THEME: '@theme',
  LANGUAGE: '@language',
  NOTIFICATIONS: '@notifications',
  
  // Cache
  CONTACTS_CACHE: '@cache_contacts',
  LEADS_CACHE: '@cache_leads',
  DASHBOARD_CACHE: '@cache_dashboard',
  
  // Offline Queue
  OFFLINE_QUEUE: '@offline_queue',
  
  // Onboarding
  ONBOARDING_COMPLETED: '@onboarding_completed',
  FIRST_LAUNCH: '@first_launch',
  
  // Analytics
  LAST_SYNC: '@last_sync',
  SESSION_ID: '@session_id',
} as const;

// =============================================================================
// BASIC OPERATIONS
// =============================================================================

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    const item: StorageItem<T> = {
      value,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Storage setItem error:', error);
    throw error;
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;
    
    const item: StorageItem<T> = JSON.parse(data);
    
    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      await removeItem(key);
      return null;
    }
    
    return item.value;
  } catch (error) {
    console.error('Storage getItem error:', error);
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Storage removeItem error:', error);
  }
}

export async function clear(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Storage clear error:', error);
  }
}

// =============================================================================
// EXPIRING ITEMS
// =============================================================================

export async function setItemWithExpiry<T>(
  key: string,
  value: T,
  expiryMs: number
): Promise<void> {
  try {
    const item: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiryMs,
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Storage setItemWithExpiry error:', error);
    throw error;
  }
}

// =============================================================================
// MULTI OPERATIONS
// =============================================================================

export async function multiGet<T>(keys: string[]): Promise<Record<string, T | null>> {
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const result: Record<string, T | null> = {};
    
    for (const [key, value] of pairs) {
      if (value) {
        try {
          const item: StorageItem<T> = JSON.parse(value);
          result[key] = item.value;
        } catch {
          result[key] = null;
        }
      } else {
        result[key] = null;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Storage multiGet error:', error);
    return {};
  }
}

export async function multiSet(items: [string, any][]): Promise<void> {
  try {
    const pairs: [string, string][] = items.map(([key, value]) => [
      key,
      JSON.stringify({ value, timestamp: Date.now() }),
    ]);
    await AsyncStorage.multiSet(pairs);
  } catch (error) {
    console.error('Storage multiSet error:', error);
    throw error;
  }
}

export async function multiRemove(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Storage multiRemove error:', error);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export async function getAllKeys(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return [...keys]; // Convert readonly to mutable
  } catch (error) {
    console.error('Storage getAllKeys error:', error);
    return [];
  }
}

export async function getStorageSize(): Promise<number> {
  try {
    const keys = await getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    
    let totalSize = 0;
    for (const [, value] of pairs) {
      if (value) {
        totalSize += value.length;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Storage getStorageSize error:', error);
    return 0;
  }
}

export async function clearExpired(): Promise<number> {
  try {
    const keys = await getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    const expiredKeys: string[] = [];
    
    for (const [key, value] of pairs) {
      if (value) {
        try {
          const item = JSON.parse(value);
          if (item.expiresAt && Date.now() > item.expiresAt) {
            expiredKeys.push(key);
          }
        } catch {
          // Invalid JSON, skip
        }
      }
    }
    
    if (expiredKeys.length > 0) {
      await multiRemove(expiredKeys);
    }
    
    return expiredKeys.length;
  } catch (error) {
    console.error('Storage clearExpired error:', error);
    return 0;
  }
}

// =============================================================================
// OFFLINE QUEUE
// =============================================================================

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
}

export async function addToOfflineQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
  const queue = await getItem<QueuedAction[]>(STORAGE_KEYS.OFFLINE_QUEUE) || [];
  
  queue.push({
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retries: 0,
  });
  
  await setItem(STORAGE_KEYS.OFFLINE_QUEUE, queue);
}

export async function getOfflineQueue(): Promise<QueuedAction[]> {
  return await getItem<QueuedAction[]>(STORAGE_KEYS.OFFLINE_QUEUE) || [];
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  const filtered = queue.filter(item => item.id !== id);
  await setItem(STORAGE_KEYS.OFFLINE_QUEUE, filtered);
}

export async function clearOfflineQueue(): Promise<void> {
  await removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  setItem,
  getItem,
  removeItem,
  clear,
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
};

