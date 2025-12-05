/**
 * Notification Analytics Tracker
 * Tracks notification engagement metrics (sent, opened, dismissed)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationAnalytics, NotificationCategory } from '../types/notifications';
import { logger } from './logger';

const ANALYTICS_KEY = 'notification_analytics';

class NotificationAnalyticsTracker {
  private analytics: Record<NotificationCategory, NotificationAnalytics> = {
    [NotificationCategory.DAILY_REMINDER]: {
      sent: 0,
      opened: 0,
      dismissed: 0,
      lastSent: null,
      lastOpened: null
    },
    [NotificationCategory.LEAD_REMINDER]: {
      sent: 0,
      opened: 0,
      dismissed: 0,
      lastSent: null,
      lastOpened: null
    },
    [NotificationCategory.SQUAD_UPDATE]: {
      sent: 0,
      opened: 0,
      dismissed: 0,
      lastSent: null,
      lastOpened: null
    },
    [NotificationCategory.ACHIEVEMENT]: {
      sent: 0,
      opened: 0,
      dismissed: 0,
      lastSent: null,
      lastOpened: null
    }
  };

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(ANALYTICS_KEY);
      if (stored) {
        this.analytics = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Failed to load notification analytics', error);
    }
  }

  async trackSent(category: NotificationCategory): Promise<void> {
    this.analytics[category].sent++;
    this.analytics[category].lastSent = new Date().toISOString();
    await this.save();
  }

  async trackOpened(category: NotificationCategory): Promise<void> {
    this.analytics[category].opened++;
    this.analytics[category].lastOpened = new Date().toISOString();
    await this.save();
  }

  async trackDismissed(category: NotificationCategory): Promise<void> {
    this.analytics[category].dismissed++;
    await this.save();
  }

  getAnalytics(): Record<NotificationCategory, NotificationAnalytics> {
    return { ...this.analytics };
  }

  getOpenRate(category: NotificationCategory): number {
    const { sent, opened } = this.analytics[category];
    return sent === 0 ? 0 : (opened / sent) * 100;
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.analytics));
    } catch (error) {
      logger.error('Failed to save notification analytics', error);
    }
  }

  async reset(): Promise<void> {
    this.analytics = {
      [NotificationCategory.DAILY_REMINDER]: {
        sent: 0,
        opened: 0,
        dismissed: 0,
        lastSent: null,
        lastOpened: null
      },
      [NotificationCategory.LEAD_REMINDER]: {
        sent: 0,
        opened: 0,
        dismissed: 0,
        lastSent: null,
        lastOpened: null
      },
      [NotificationCategory.SQUAD_UPDATE]: {
        sent: 0,
        opened: 0,
        dismissed: 0,
        lastSent: null,
        lastOpened: null
      },
      [NotificationCategory.ACHIEVEMENT]: {
        sent: 0,
        opened: 0,
        dismissed: 0,
        lastSent: null,
        lastOpened: null
      }
    };
    await this.save();
  }
}

export const notificationAnalytics = new NotificationAnalyticsTracker();

