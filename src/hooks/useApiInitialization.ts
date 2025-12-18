/**
 * API Initialization Hook
 * Initialize auth manager and offline queue on app start
 */
import { useEffect } from 'react';
import { authManager } from '../utils/authManager';
import { offlineQueue } from '../utils/offlineQueue';
import { apiClient } from '../api/client';

export function useApiInitialization() {
  useEffect(() => {
    // Initialize managers
    const init = async () => {
      try {
        await authManager.initialize();
        await offlineQueue.initialize();

        // Process any queued requests if we're online
        if (offlineQueue.getIsOnline()) {
          await offlineQueue.processQueue(apiClient);
        }
      } catch (error) {
        console.error('Failed to initialize API managers:', error);
      }
    };

    init();
  }, []);
}

