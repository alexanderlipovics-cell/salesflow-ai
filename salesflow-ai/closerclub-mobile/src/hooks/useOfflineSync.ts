import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueue, QueuedAction } from '../services/offlineQueue';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueLength, setQueueLength] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    // Update queue status periodically
    const interval = setInterval(() => {
      setQueueLength(offlineQueue.getQueueLength());
      setFailedCount(offlineQueue.getFailedCount());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const queueAction = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) => {
    offlineQueue.queueAction(action);
    setQueueLength(offlineQueue.getQueueLength());
  }, []);

  const retryFailed = useCallback(async () => {
    await offlineQueue.retryFailedActions();
    setFailedCount(offlineQueue.getFailedCount());
  }, []);

  const clearFailed = useCallback(() => {
    offlineQueue.clearFailedQueue();
    setFailedCount(0);
  }, []);

  return {
    isOnline,
    queueLength,
    failedCount,
    queueAction,
    retryFailed,
    clearFailed,
  };
};
