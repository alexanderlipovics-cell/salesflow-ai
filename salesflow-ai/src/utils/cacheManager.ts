/**
 * Cache Manager
 * LRU cache with TTL for API responses
 */
import { CacheEntry } from '../types/api';
import { API_CONFIG } from '../config/api';

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder: string[] = [];

  generateKey(endpoint: string, params?: Record<string, any>): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramStr}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update access order (LRU)
    this.updateAccessOrder(key);

    return entry.data;
  }

  set<T>(key: string, data: T, ttl: number = API_CONFIG.CACHE_TTL_MS): void {
    // Enforce max size (LRU eviction)
    if (this.cache.size >= API_CONFIG.CACHE_MAX_SIZE) {
      const oldest = this.accessOrder[0];
      if (oldest) {
        this.cache.delete(oldest);
        this.removeFromAccessOrder(oldest);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  invalidatePrefix(prefix: string): void {
    const keys = Array.from(this.cache.keys()).filter((k) => k.startsWith(prefix));
    keys.forEach((key) => this.invalidate(key));
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

export const cacheManager = new CacheManager();

