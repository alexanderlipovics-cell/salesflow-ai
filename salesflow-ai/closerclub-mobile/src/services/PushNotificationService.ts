// PushNotificationService.ts
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class PushNotificationService {
  private fcmToken: string | null = null;

  async init(): Promise<void> {
    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // Get FCM token
      this.fcmToken = await messaging().getToken();
      await this.saveTokenToServer(this.fcmToken);

      // Handle token refresh
      messaging().onTokenRefresh(async (token) => {
        this.fcmToken = token;
        await this.saveTokenToServer(token);
      });

      // Handle incoming messages
      messaging().onMessage(async (remoteMessage) => {
        this.handleNotification(remoteMessage);
      });

      // Handle background messages
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        this.handleNotification(remoteMessage);
      });
    }
  }

  private async saveTokenToServer(token: string): Promise<void> {
    try {
      // Save token to AsyncStorage for offline access
      await AsyncStorage.setItem('fcm_token', token);

      // Send to backend
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/push/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          appVersion: '1.0.0'
        })
      });

      if (!response.ok) {
        console.warn('Failed to register push token');
      }
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  private async handleNotification(remoteMessage: any): Promise<void> {
    const { notification, data } = remoteMessage;

    // Handle different notification types
    switch (data?.type) {
      case 'welcome':
        this.showWelcomeNotification(notification);
        break;
      case 'feature_update':
        this.showFeatureNotification(notification, data);
        break;
      case 'engagement':
        this.showEngagementNotification(notification);
        break;
      default:
        this.showDefaultNotification(notification);
    }
  }

  private showWelcomeNotification(notification: any): void {
    // Custom welcome notification handling
    console.log('Welcome notification:', notification);
  }

  private showFeatureNotification(notification: any, data: any): void {
    // Handle feature announcements
    console.log('Feature notification:', notification, data);
  }

  private showEngagementNotification(notification: any): void {
    // Handle re-engagement notifications
    console.log('Engagement notification:', notification);
  }

  private showDefaultNotification(notification: any): void {
    // Default notification handling
    console.log('Notification:', notification);
  }

  async sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
    // Send local notification (for testing)
    await messaging().sendMessage({
      to: this.fcmToken!,
      notification: {
        title,
        body
      },
      data: data || {}
    });
  }

  private async getAuthToken(): Promise<string> {
    // Get auth token from secure storage
    return await AsyncStorage.getItem('auth_token') || '';
  }

  getToken(): string | null {
    return this.fcmToken;
  }
}

export default new PushNotificationService();
