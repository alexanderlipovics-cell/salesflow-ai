import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

class OfflineService {
  private syncQueue: any[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.initNetworkListener();
    this.loadSyncQueue();
  }

  private initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;

      // If coming back online, sync queued actions
      if (wasOffline && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  private async loadSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem('sync_queue');
      this.syncQueue = queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private async saveSyncQueue() {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  // Add action to sync queue
  async queueAction(action: {
    type: string;
    endpoint: string;
    method: string;
    data: any;
    timestamp: number;
  }) {
    this.syncQueue.push(action);
    await this.saveSyncQueue();

    // Try to sync immediately if online
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  // Process all queued actions
  private async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    console.log(`Syncing ${this.syncQueue.length} queued actions...`);

    const queue = [...this.syncQueue];
    this.syncQueue = [];
    await this.saveSyncQueue();

    for (const action of queue) {
      try {
        await fetch(action.endpoint, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getToken()}`
          },
          body: JSON.stringify(action.data)
        });

        console.log(`✅ Synced: ${action.type}`);
      } catch (error) {
        console.error(`❌ Failed to sync ${action.type}:`, error);
        // Re-queue on failure
        this.syncQueue.push(action);
      }
    }

    await this.saveSyncQueue();
  }

  // Cache data locally
  async cacheData(key: string, data: any) {
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  // Get cached data
  async getCachedData(key: string): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(`cache_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  // Check if online
  isOnlineNow(): boolean {
    return this.isOnline;
  }

  private async getToken(): Promise<string> {
    // Get auth token from storage
    return await AsyncStorage.getItem('auth_token') || '';
  }
}

export default new OfflineService();

