/**
 * Notification Manager - Production-Ready
 * Handles local notifications, push notifications, scheduling, and deep linking
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

import {
  NotificationCategory,
  NotificationData,
  ScheduledNotification
} from '../types/notifications';
import { notificationPreferences } from './notificationPreferences';
import { notificationAnalytics } from './notificationAnalytics';
import { logger } from './logger';

const EXPO_TOKEN_KEY = 'expo_push_token';
const APP_NOTIFICATION_IDS_KEY = 'app_notification_ids';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const preferences = notificationPreferences.getPreferences();

    // Check if notifications are enabled
    if (!preferences.enabled) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false
      };
    }

    // Check quiet hours
    if (notificationPreferences.isInQuietHours()) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: true
      };
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true
    };
  }
});

class NotificationManager {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private appNotificationIds: string[] = [];

  async initialize(): Promise<void> {
    // Load stored notification IDs
    await this.loadAppNotificationIds();

    // Setup notification categories
    await this.setupNotificationCategories();

    // Listen for notifications
    this.setupListeners();

    // Load stored token
    const stored = await AsyncStorage.getItem(EXPO_TOKEN_KEY);
    if (stored) {
      this.expoPushToken = stored;
    }
  }

  async requestPermissions(): Promise<boolean> {
    // Only on physical devices
    if (!Device.isDevice) {
      logger.debug('Notifications only work on physical devices');
      return false;
    }

    // Setup Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9800',
        sound: 'default',
        enableVibrate: true,
        showBadge: true
      });

      // Additional channels for different categories
      await Notifications.setNotificationChannelAsync('lead_reminders', {
        name: 'Lead Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200],
        lightColor: '#03A9F4'
      });

      await Notifications.setNotificationChannelAsync('squad_updates', {
        name: 'Squad Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default'
      });
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.debug('Notification permissions denied');
      return false;
    }

    // Get Expo push token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID
      });
      const token = tokenData.data;
      this.expoPushToken = token;
      await AsyncStorage.setItem(EXPO_TOKEN_KEY, token);

      // Send token to backend
      await this.registerTokenWithBackend(token);

      logger.debug('Expo push token:', token);
    } catch (error) {
      logger.error('Failed to get push token:', error);
    }

    return true;
  }

  private async setupNotificationCategories(): Promise<void> {
    // iOS notification categories for actions
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('daily_reminder', [
        {
          identifier: 'view',
          buttonTitle: 'Jetzt öffnen',
          options: {
            opensAppToForeground: true
          }
        },
        {
          identifier: 'snooze',
          buttonTitle: 'Später erinnern',
          options: {
            opensAppToForeground: false
          }
        }
      ]);

      await Notifications.setNotificationCategoryAsync('lead_reminder', [
        {
          identifier: 'open_lead',
          buttonTitle: 'Lead öffnen',
          options: {
            opensAppToForeground: true
          }
        }
      ]);
    }
  }

  private setupListeners(): void {
    // Notification received (foreground)
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as NotificationData;
      logger.debug('Notification received:', data);

      // Track analytics
      if (data.category) {
        notificationAnalytics.trackSent(data.category);
      }

      // Update badge count
      this.updateBadgeCount();
    });

    // Notification tapped
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as NotificationData;
      logger.debug('Notification tapped:', data);

      // Track analytics
      if (data.category) {
        notificationAnalytics.trackOpened(data.category);
      }

      // Handle deep linking
      this.handleNotificationResponse(data);

      // Clear badge
      Notifications.setBadgeCountAsync(0);
    });
  }

  private handleNotificationResponse(data: NotificationData): void {
    // Navigate to screen based on data
    if (data.screen) {
      // Use expo-linking for deep linking
      let url = `salesflow://${data.screen}`;
      
      if (data.leadId) {
        url += `?leadId=${data.leadId}`;
      }
      if (data.squadId) {
        url += data.leadId ? `&squadId=${data.squadId}` : `?squadId=${data.squadId}`;
      }
      if (data.challengeId) {
        url += (data.leadId || data.squadId) ? `&challengeId=${data.challengeId}` : `?challengeId=${data.challengeId}`;
      }

      Linking.openURL(url).catch(err => {
        logger.error('Failed to open deep link:', err);
      });
    }
  }

  async scheduleDailyReminder(targetContacts: number): Promise<void> {
    const preferences = notificationPreferences.getPreferences();

    // Check if daily reminders are enabled
    if (!preferences.enabled || !preferences.dailyReminder) {
      logger.debug('Daily reminders disabled');
      return;
    }

    // Cancel existing daily reminders
    await this.cancelNotificationsByCategory(NotificationCategory.DAILY_REMINDER);

    if (targetContacts <= 0) {
      return;
    }

    // Parse reminder time
    const [hours, minutes] = preferences.dailyReminderTime.split(':').map(Number);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎯 Zeit für den Endspurt!',
        body: `Du hast dein Ziel von ${targetContacts} Kontakten heute noch nicht erreicht. Hol sie dir!`,
        data: {
          category: NotificationCategory.DAILY_REMINDER,
          screen: 'today'
        } as NotificationData,
        sound: true,
        badge: 1,
        ...(Platform.OS === 'ios' && { categoryIdentifier: 'daily_reminder' })
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
        channelId: Platform.OS === 'android' ? 'default' : undefined
      }
    });

    await this.trackAppNotification(notificationId, NotificationCategory.DAILY_REMINDER);
    logger.debug(`Daily reminder scheduled at ${hours}:${minutes}`);
  }

  async scheduleLeadReminder(leadName: string, leadId: string, dueAt: string): Promise<void> {
    const preferences = notificationPreferences.getPreferences();

    // Check if lead reminders are enabled
    if (!preferences.enabled || !preferences.leadReminders) {
      logger.debug('Lead reminders disabled');
      return;
    }

    const fireDate = new Date(dueAt);
    fireDate.setHours(fireDate.getHours() - 1); // 1 hour before

    const now = new Date();
    if (fireDate < now) {
      logger.debug('Lead reminder in the past, skipping');
      return;
    }

    // Check if fire date is in quiet hours
    const fireHour = fireDate.getHours();
    const fireMinute = fireDate.getMinutes();
    const fireTimeStr = `${fireHour.toString().padStart(2, '0')}:${fireMinute.toString().padStart(2, '0')}`;

    const { quietHoursStart, quietHoursEnd } = preferences;
    if (quietHoursStart && quietHoursEnd) {
      if (quietHoursStart > quietHoursEnd) {
        // Crosses midnight
        if (fireTimeStr >= quietHoursStart || fireTimeStr < quietHoursEnd) {
          logger.debug('Lead reminder in quiet hours, adjusting time');
          // Move to end of quiet hours
          const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
          fireDate.setHours(endHour, endMinute, 0, 0);
        }
      } else {
        if (fireTimeStr >= quietHoursStart && fireTimeStr < quietHoursEnd) {
          logger.debug('Lead reminder in quiet hours, adjusting time');
          const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);
          fireDate.setHours(endHour, endMinute, 0, 0);
        }
      }
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Follow-up in einer Stunde!',
        body: `Dein nächster Schritt mit ${leadName} ist um ${new Date(dueAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr fällig.`,
        data: {
          category: NotificationCategory.LEAD_REMINDER,
          screen: 'lead-detail',
          leadId
        } as NotificationData,
        sound: true,
        badge: 1,
        ...(Platform.OS === 'ios' && { categoryIdentifier: 'lead_reminder' })
      },
      trigger: fireDate
    });

    await this.trackAppNotification(notificationId, NotificationCategory.LEAD_REMINDER);
    logger.debug(`Lead reminder scheduled for ${leadName} at ${fireDate.toISOString()}`);
  }

  async sendLocalNotification(
    title: string,
    body: string,
    data: NotificationData
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1
      },
      trigger: null // Immediate
    });

    if (data.category) {
      await notificationAnalytics.trackSent(data.category);
    }
  }

  private async cancelNotificationsByCategory(category: NotificationCategory): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(n => {
      const data = n.content.data as NotificationData;
      return data.category === category;
    });

    for (const notification of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      await this.removeAppNotification(notification.identifier);
    }

    logger.debug(`Cancelled ${toCancel.length} notifications for category ${category}`);
  }

  async cancelAllAppNotifications(): Promise<void> {
    // Only cancel our app's notifications
    for (const id of this.appNotificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch (error) {
        logger.error(`Failed to cancel notification ${id}:`, error);
      }
    }

    this.appNotificationIds = [];
    await AsyncStorage.setItem(APP_NOTIFICATION_IDS_KEY, JSON.stringify([]));

    logger.debug('Cancelled all app notifications');
  }

  private async trackAppNotification(id: string, category: NotificationCategory): Promise<void> {
    this.appNotificationIds.push(id);
    await AsyncStorage.setItem(APP_NOTIFICATION_IDS_KEY, JSON.stringify(this.appNotificationIds));
  }

  private async removeAppNotification(id: string): Promise<void> {
    this.appNotificationIds = this.appNotificationIds.filter(nId => nId !== id);
    await AsyncStorage.setItem(APP_NOTIFICATION_IDS_KEY, JSON.stringify(this.appNotificationIds));
  }

  private async loadAppNotificationIds(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(APP_NOTIFICATION_IDS_KEY);
      if (stored) {
        this.appNotificationIds = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Failed to load app notification IDs:', error);
    }
  }

  private async updateBadgeCount(): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Notifications.setBadgeCountAsync(scheduled.length);
  }

  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      // Import supabase client
      const { supabase } = await import('../lib/supabase');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Store push token in user_profiles or a separate push_tokens table
        // This is a placeholder - adjust based on your schema
        await supabase
          .from('user_profiles')
          .update({ expo_push_token: token })
          .eq('id', user.id);
        
        logger.debug('Push token registered with backend');
      }
    } catch (error) {
      logger.error('Failed to register token with backend:', error);
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export const notificationManager = new NotificationManager();

