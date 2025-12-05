import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  // Register for push notifications
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission not granted for notifications');
        return null;
      }

      // Get Expo push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;

      // Send token to backend
      await this.sendTokenToBackend(token);

      return token;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  private async sendTokenToBackend(token: string) {
    try {
      await fetch('http://localhost:8000/api/notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expo_push_token: token })
      });
    } catch (error) {
      console.error('Failed to send token to backend:', error);
    }
  }

  // Schedule local notification
  async scheduleNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger,
    });
  }

  // Schedule reminder notification
  async scheduleReminder(leadName: string, minutes: number) {
    await this.scheduleNotification(
      'Follow-up Reminder',
      `Don't forget to follow up with ${leadName}`,
      {
        seconds: minutes * 60,
      }
    );
  }

  // Handle notification tap
  setupNotificationListener(callback: (notification: any) => void) {
    Notifications.addNotificationResponseReceivedListener(response => {
      callback(response.notification);
    });
  }
}

export default new NotificationService();

