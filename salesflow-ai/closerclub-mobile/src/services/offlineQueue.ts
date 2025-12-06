import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

export type ActionType = 'CREATE_LEAD' | 'UPDATE_LEAD' | 'ADD_NOTE';

export interface QueuedAction {
  id: string;
  type: ActionType;
  payload: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'offline_action_queue';

class OfflineQueueService {
  private queue: QueuedAction[] = [];
  private isOnline = true;
  private isProcessing = false;

  constructor() {
    this.setupNetworkListener();
    this.loadPersistedQueue();
  }

  // Initialisierung
  private async loadPersistedQueue() {
    const saved = await AsyncStorage.getItem(QUEUE_KEY);
    if (saved) {
      this.queue = JSON.parse(saved);
      console.log(`🔌 Offline Queue loaded: ${this.queue.length} actions pending.`);
    }
  }

  private async persistQueue() {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }

  // Network Listener
  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = !!state.isConnected;

      if (wasOffline && this.isOnline) {
        console.log('🌐 Back Online! Processing queue...');
        this.processQueue();
      }
    });
  }

  // Public API
  async queueAction(type: ActionType, payload: any) {
    const action: QueuedAction = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      payload,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(action);
    await this.persistQueue();
    console.log(`📥 Action queued: ${type}`);

    if (this.isOnline) {
      this.processQueue();
    }
  }

  // Core Processing Logic
  private async processQueue() {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) return;

    this.isProcessing = true;

    // Kopie der Queue bearbeiten (FIFO)
    while (this.queue.length > 0 && this.isOnline) {
      const action = this.queue[0];

      try {
        console.log(`🔄 Processing action: ${action.type}`);
        await this.executeAction(action);

        // Success: Remove from queue
        this.queue.shift();
        await this.persistQueue();

      } catch (error) {
        console.error('❌ Action failed:', error);

        // Retry Logic
        if (action.retries < 3) {
          action.retries++;
          await this.persistQueue();
          // Exponential Backoff wait
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, action.retries)));
        } else {
          // Max retries reached: Move to "Dead Letter Queue" (or just delete for MVP)
          console.warn('☠️ Action dropped after max retries');
          this.queue.shift();
          await this.persistQueue();
        }
      }
    }

    this.isProcessing = false;
  }

  // Mapping Action -> Supabase Call
  private async executeAction(action: QueuedAction) {
    const { type, payload } = action;

    switch (type) {
      case 'CREATE_LEAD':
        const { error: err1 } = await supabase.from('leads').insert(payload);
        if (err1) throw err1;
        break;

      case 'UPDATE_LEAD':
        const { id, ...updates } = payload;
        const { error: err2 } = await supabase.from('leads').update(updates).eq('id', id);
        if (err2) throw err2;
        break;

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }
}

export const offlineQueue = new OfflineQueueService();
