import { messaging, getToken, onMessage } from '../config/firebase';
import { api } from './api';

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Get current push notification status
 */
export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'denied',
      subscribed: false
    };
  }

  const permission = Notification.permission;

  // Check if subscribed on backend
  let subscribed = false;
  try {
    const response = await api.get('/api/push/status');
    subscribed = response.data.subscribed;
  } catch (e) {
    console.error('Failed to get push status:', e);
  }

  return {
    supported: true,
    permission,
    subscribed
  };
}

/**
 * Request push notification permission and subscribe
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return false;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn('Push notification permission denied');
      return false;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js'
    );

    console.log('Service worker registered:', registration);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Get FCM token
    if (!messaging) {
      console.error('Firebase messaging not initialized');
      return false;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      console.error('Failed to get FCM token');
      return false;
    }

    console.log('FCM Token:', token.substring(0, 20) + '...');

    // Send token to backend
    await api.post('/api/push/subscribe', {
      fcm_token: token,
      device_type: 'web'
    });

    console.log('Push subscription registered');
    return true;

  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    await api.delete('/api/push/unsubscribe?device_type=web');
    return true;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Setup foreground message handler
 */
export function setupForegroundHandler(
  onNotification: (payload: any) => void
): () => void {
  if (!messaging) {
    return () => {};
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    onNotification(payload);
  });

  return unsubscribe;
}

/**
 * Send test notification
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    const response = await api.post('/api/push/test');
    return response.data.success;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return false;
  }
}
