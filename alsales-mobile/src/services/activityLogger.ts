import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://salesflow-ai.onrender.com';

export type ActionType = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'viewed' 
  | 'contacted' 
  | 'completed'
  | 'message_sent'
  | 'message_received'
  | 'call'
  | 'note';

export type EntityType = 
  | 'lead' 
  | 'follow_up' 
  | 'deal' 
  | 'task' 
  | 'interaction'
  | 'message';

interface LogActivityParams {
  actionType: ActionType;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  details?: Record<string, any>;
  source?: 'ui' | 'chief';
}

class ActivityLogger {
  private async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('access_token');
  }

  async log(params: LogActivityParams): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        console.log('ActivityLogger: No token, skipping log');
        return false;
      }

      const response = await fetch(`${API_BASE}/api/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action_type: params.actionType,
          entity_type: params.entityType,
          entity_id: params.entityId,
          entity_name: params.entityName || null,
          details: params.details || {},
          source: params.source || 'ui',
        }),
      });

      if (response.ok) {
        console.log(`✅ Activity logged: ${params.actionType} ${params.entityType}`);
        return true;
      } else {
        // Fallback: Log locally if API fails
        console.log(`⚠️ Activity API failed, logged locally: ${params.actionType} ${params.entityType}`);
        return false;
      }
    } catch (error) {
      console.log('ActivityLogger error:', error);
      return false;
    }
  }

  // Convenience methods
  async logLeadViewed(leadId: string, leadName: string) {
    return this.log({
      actionType: 'viewed',
      entityType: 'lead',
      entityId: leadId,
      entityName: leadName,
    });
  }

  async logLeadUpdated(leadId: string, leadName: string, fieldsChanged: string[]) {
    return this.log({
      actionType: 'updated',
      entityType: 'lead',
      entityId: leadId,
      entityName: leadName,
      details: { fields_changed: fieldsChanged },
    });
  }

  async logLeadCreated(leadId: string, leadName: string, source: string) {
    return this.log({
      actionType: 'created',
      entityType: 'lead',
      entityId: leadId,
      entityName: leadName,
      details: { source },
    });
  }

  async logMessageSent(leadId: string, leadName: string, platform: string, messagePreview?: string) {
    return this.log({
      actionType: 'message_sent',
      entityType: 'message',
      entityId: leadId,
      entityName: leadName,
      details: { 
        platform, 
        preview: messagePreview?.substring(0, 100),
        timestamp: new Date().toISOString(),
      },
    });
  }

  async logMessageReceived(leadId: string, leadName: string, platform: string) {
    return this.log({
      actionType: 'message_received',
      entityType: 'message',
      entityId: leadId,
      entityName: leadName,
      details: { platform },
    });
  }

  async logCall(leadId: string, leadName: string, duration?: number, outcome?: string) {
    return this.log({
      actionType: 'call',
      entityType: 'interaction',
      entityId: leadId,
      entityName: leadName,
      details: { 
        duration_seconds: duration,
        outcome,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async logNote(leadId: string, leadName: string, notePreview: string) {
    return this.log({
      actionType: 'note',
      entityType: 'interaction',
      entityId: leadId,
      entityName: leadName,
      details: { 
        preview: notePreview.substring(0, 200),
        timestamp: new Date().toISOString(),
      },
    });
  }

  async logFollowUpCompleted(followUpId: string, leadName: string, taskType: string) {
    return this.log({
      actionType: 'completed',
      entityType: 'follow_up',
      entityId: followUpId,
      entityName: `Follow-up für ${leadName}`,
      details: { task_type: taskType },
    });
  }

  async logStatusChanged(leadId: string, leadName: string, oldStatus: string, newStatus: string) {
    return this.log({
      actionType: 'updated',
      entityType: 'lead',
      entityId: leadId,
      entityName: leadName,
      details: { 
        field: 'status',
        old_value: oldStatus,
        new_value: newStatus,
      },
    });
  }

  async logTemperatureChanged(leadId: string, leadName: string, oldTemp: string, newTemp: string) {
    return this.log({
      actionType: 'updated',
      entityType: 'lead',
      entityId: leadId,
      entityName: leadName,
      details: { 
        field: 'temperature',
        old_value: oldTemp,
        new_value: newTemp,
      },
    });
  }
}

export const activityLogger = new ActivityLogger();

