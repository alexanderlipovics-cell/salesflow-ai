import React from 'react';

// Lazy load components
export const lazyLoad = (importFunc: () => Promise<any>) => {
  return React.lazy(importFunc);
};

// Debounce function (for search inputs)
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function (for scroll events)
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Image cache manager
class ImageCacheManager {
  private cache: Map<string, string> = new Map();

  async getCachedImage(url: string): Promise<string> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Download and cache
    const localUri = await this.downloadImage(url);
    this.cache.set(url, localUri);
    return localUri;
  }

  private async downloadImage(url: string): Promise<string> {
    // Implementation for downloading image
    return url;
  }
}

export const imageCacheManager = new ImageCacheManager();

