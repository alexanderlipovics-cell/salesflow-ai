import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';

interface BackendSyncEvent {
  device_calendar_id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  notes?: string | null;
  meeting_type?: string | null;
  all_day?: boolean;
}

export class CalendarService {
  private static calendarId: string | null = null;

  static async requestPermissions(): Promise<boolean> {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  }

  private static async ensureCalendar(): Promise<string> {
    if (this.calendarId) {
      return this.calendarId;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const existing = calendars.find(cal => cal.title === 'SalesFlow');
    if (existing) {
      this.calendarId = existing.id;
      return existing.id;
    }

    const defaultCalendar = calendars.find(cal => cal.allowsModifications);
    const newId = await Calendar.createCalendarAsync({
      title: 'SalesFlow',
      color: '#FF5722',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: Platform.OS === 'ios' ? defaultCalendar?.source.id : undefined,
      source: Platform.OS === 'ios' ? defaultCalendar?.source : undefined,
      name: 'salesflow',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    this.calendarId = newId;
    return newId;
  }

  static async createLocalEvent(event: {
    title: string;
    startDate: Date;
    endDate: Date;
    notes?: string;
    location?: string;
    alarms?: Array<{ relativeOffset: number }>;
  }): Promise<string> {
    const calendarId = await this.ensureCalendar();
    return Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      notes: event.notes,
      location: event.location,
      alarms: event.alarms || [{ relativeOffset: -15 }],
      timeZone: 'UTC',
    });
  }

  static async getUpcomingEvents(days = 14): Promise<Calendar.Event[]> {
    const calendarId = await this.ensureCalendar();
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return Calendar.getEventsAsync([calendarId], startDate, endDate);
  }

  static async syncWithBackend(workspaceId: string): Promise<void> {
    const calendarId = await this.ensureCalendar();
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const events = await Calendar.getEventsAsync([calendarId], startDate, endDate);
    const payload: BackendSyncEvent[] = events.map(evt => ({
      device_calendar_id: evt.id,
      title: evt.title,
      start_time: evt.startDate.toISOString(),
      end_time: evt.endDate.toISOString(),
      location: evt.location,
      notes: evt.notes,
      meeting_type: evt.availability ?? undefined,
      all_day: evt.allDay,
    }));

    await apiClient('/api/calendar/sync', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        events: payload,
      }),
    });
  }

  static async fetchServerEvents(
    workspaceId: string,
    days = 7,
  ): Promise<any[]> {
    const response = await apiClient<{ events: any[] }>(
      `/api/calendar/events?workspace_id=${workspaceId}&days=${days}`,
    );
    return response.events ?? [];
  }
}


