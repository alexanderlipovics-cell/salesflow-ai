/**
 * Offline Queue
 * Queue requests when offline (Web-compatible version)
 */
import { ApiRequestConfig, QueuedRequest } from '../types/api';
import { API_CONFIG } from '../config/api';

const QUEUE_KEY = 'offline_request_queue';

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private isOnline = true;

  async initialize(): Promise<void> {
    // Load persisted queue
    await this.loadQueue();

    // Listen to network changes (Web)
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;

      window.addEventListener('online', () => {
        const wasOffline = !this.isOnline;
        this.isOnline = true;

        // If we just came online, process queue
        if (wasOffline) {
          this.processQueue();
        }
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  async enqueue(config: ApiRequestConfig): Promise<void> {
    if (this.queue.length >= API_CONFIG.OFFLINE_QUEUE_MAX) {
      throw new Error('Offline queue is full');
    }

    const request: QueuedRequest = {
      id: `${Date.now()}_${Math.random()}`,
      config,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(request);
    await this.saveQueue();
  }

  async processQueue(apiClient?: any): Promise<void> {
    if (this.processing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.isOnline) {
      const request = this.queue[0];

      try {
        // Try to execute request via API client
        if (apiClient) {
          await apiClient.request(request.config);
        }

        // Success - remove from queue
        this.queue.shift();
        await this.saveQueue();
      } catch (error) {
        request.retries++;

        if (request.retries >= API_CONFIG.MAX_RETRIES) {
          // Max retries reached - remove
          console.error('Failed to process queued request after max retries:', request);
          this.queue.shift();
          await this.saveQueue();
        } else {
          // Wait before retry
          await new Promise((resolve) =>
            setTimeout(resolve, API_CONFIG.OFFLINE_RETRY_INTERVAL_MS)
          );
        }
      }
    }

    this.processing = false;
  }

  private async loadQueue(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private async saveQueue(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(QUEUE_KEY);
    }
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }
}

export const offlineQueue = new OfflineQueue();

