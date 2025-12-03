/**
 * Notification Preferences Manager
 * Handles user preferences for notifications with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPreferences, DEFAULT_PREFERENCES } from '../types/notifications';
import { logger } from './logger';

const PREFERENCES_KEY = 'notification_preferences';

class NotificationPreferencesManager {
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      logger.error('Failed to load notification preferences', error);
    }
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates };
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      logger.error('Failed to save notification preferences', error);
    }
  }

  async setDailyReminderTime(time: string): Promise<void> {
    await this.updatePreferences({ dailyReminderTime: time });
  }

  async toggleDailyReminder(enabled: boolean): Promise<void> {
    await this.updatePreferences({ dailyReminder: enabled });
  }

  async setQuietHours(start: string | null, end: string | null): Promise<void> {
    await this.updatePreferences({
      quietHoursStart: start,
      quietHoursEnd: end
    });
  }

  isInQuietHours(): boolean {
    const { quietHoursStart, quietHoursEnd } = this.preferences;

    if (!quietHoursStart || !quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Handle quiet hours that cross midnight
    if (quietHoursStart > quietHoursEnd) {
      return currentTime >= quietHoursStart || currentTime < quietHoursEnd;
    } else {
      return currentTime >= quietHoursStart && currentTime < quietHoursEnd;
    }
  }
}

export const notificationPreferences = new NotificationPreferencesManager();

