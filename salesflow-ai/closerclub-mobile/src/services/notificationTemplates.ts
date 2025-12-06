import { Lead } from '../types/database';

export interface NotificationContent {
  title: string;
  body: string;
  data?: any;
  sound?: string;
  priority?: 'default' | 'high';
}

export interface UserPreferences {
  notificationTime: 'morning' | 'evening' | 'anytime';
  detailLevel: 'minimal' | 'standard' | 'detailed';
  channels: ('push' | 'email' | 'sms')[];
}

export class NotificationTemplates {
  static getHotLeadNotification(lead: Lead): NotificationContent {
    return {
      title: "🔥 Heißer Lead wartet!",
      body: `${lead.first_name} ${lead.last_name} hat Interesse gezeigt - Score: ${lead.p_score ?? 'N/A'}%`,
      data: { leadId: lead.id, type: 'hot_lead' },
      sound: 'default',
      priority: 'high',
    };
  }

  static getFollowUpReminder(lead: Lead, sequenceName: string): NotificationContent {
    return {
      title: "📅 Follow-up fällig",
      body: `Zeit für nächsten Schritt bei ${lead.first_name} (${sequenceName})`,
      data: { leadId: lead.id, type: 'followup' },
      sound: 'reminder.wav',
      priority: 'default',
    };
  }

  static getAISuggestion(message: string, suggestionId?: string): NotificationContent {
    return {
      title: "💡 AI-Tipp für dich",
      body: message,
      data: { type: 'ai_suggestion', suggestionId },
      sound: 'notification.wav',
      priority: 'default',
    };
  }

  static getLeadUpdate(lead: Lead, action: string): NotificationContent {
    return {
      title: "📈 Lead Update",
      body: `${lead.first_name} ${lead.last_name}: ${action}`,
      data: { leadId: lead.id, type: 'lead_update' },
      sound: 'default',
      priority: 'default',
    };
  }

  static getSystemNotification(message: string): NotificationContent {
    return {
      title: "🚀 SalesFlow Update",
      body: message,
      data: { type: 'system' },
      sound: 'default',
      priority: 'default',
    };
  }
}

export const personalizeNotification = (
  template: NotificationContent,
  userPreferences: UserPreferences
): NotificationContent => {
  let personalized = { ...template };

  // Time-based personalization
  const hour = new Date().getHours();
  const isMorning = hour >= 6 && hour < 12;
  const isEvening = hour >= 18 && hour < 22;

  if (userPreferences.notificationTime === 'morning' && !isMorning) {
    // Adjust timing if possible
  } else if (userPreferences.notificationTime === 'evening' && !isEvening) {
    // Adjust timing if possible
  }

  // Detail level personalization
  if (userPreferences.detailLevel === 'minimal') {
    personalized.body = personalized.body.length > 50
      ? personalized.body.substring(0, 47) + '...'
      : personalized.body;
  } else if (userPreferences.detailLevel === 'detailed') {
    // Add more context if available
    if (template.data?.leadId) {
      personalized.body += ' - Tippe zum Öffnen.';
    }
  }

  // Sound personalization based on priority and time
  if (template.priority === 'high') {
    personalized.sound = 'urgent.wav';
  } else if (isEvening) {
    personalized.sound = 'soft.wav';
  }

  return personalized;
};

export const getQuietHoursSettings = () => {
  // Default quiet hours: 22:00 - 08:00
  const now = new Date();
  const hour = now.getHours();
  return hour >= 22 || hour <= 8;
};

export const shouldSendNotification = (
  template: NotificationContent,
  userPreferences: UserPreferences
): boolean => {
  // Check quiet hours
  if (getQuietHoursSettings() && template.priority !== 'high') {
    return false;
  }

  // Check if push notifications are enabled
  if (!userPreferences.channels.includes('push')) {
    return false;
  }

  return true;
};
