/**
 * Notification System Type Definitions
 * Complete type safety for notification preferences, analytics, and data
 */

export interface NotificationPreferences {
  enabled: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string; // HH:MM format
  leadReminders: boolean;
  squadUpdates: boolean;
  quietHoursStart: string | null; // HH:MM format
  quietHoursEnd: string | null; // HH:MM format
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  dailyReminder: true,
  dailyReminderTime: '17:00',
  leadReminders: true,
  squadUpdates: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00'
};

export interface NotificationAnalytics {
  sent: number;
  opened: number;
  dismissed: number;
  lastSent: string | null;
  lastOpened: string | null;
}

export enum NotificationCategory {
  DAILY_REMINDER = 'daily_reminder',
  LEAD_REMINDER = 'lead_reminder',
  SQUAD_UPDATE = 'squad_update',
  ACHIEVEMENT = 'achievement'
}

export interface NotificationData {
  category: NotificationCategory;
  screen?: string;
  leadId?: string;
  squadId?: string;
  challengeId?: string;
  [key: string]: any;
}

export interface ScheduledNotification {
  id: string;
  category: NotificationCategory;
  trigger: Date | number;
  data: NotificationData;
}

