import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://salesflow-ai.onrender.com';

class ActivityLogger {
  private async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('access_token');
  }

  async log(actionType: string, entityType: string, entityId: string, entityName?: string, details?: any): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;
      await fetch(`${API_BASE}/api/activity/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action_type: actionType, entity_type: entityType, entity_id: entityId, entity_name: entityName, details: details || {}, source: 'ui' }),
      });
      console.log(`✅ ${actionType} ${entityType}`);
      return true;
    } catch (e) { return false; }
  }

  logLeadViewed = (id: string, name: string) => this.log('viewed', 'lead', id, name);
  logCall = (id: string, name: string) => this.log('call', 'interaction', id, name);
  logNote = (id: string, name: string, note: string) => this.log('note', 'interaction', id, name, { preview: note.substring(0, 200) });
  logStatusChanged = (id: string, name: string, from: string, to: string) => this.log('updated', 'lead', id, name, { field: 'status', old: from, new: to });
  logTempChanged = (id: string, name: string, from: string, to: string) => this.log('updated', 'lead', id, name, { field: 'temperature', old: from, new: to });
  logMessageSent = (id: string, name: string, platform: string) => this.log('message_sent', 'message', id, name, { platform });

  async saveMessage(leadId: string, leadName: string, direction: 'sent' | 'received', platform: string, content: string, messageType = 'general', generatedBy = 'chief'): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ lead_id: leadId, direction, platform, content, message_type: messageType, generated_by: generatedBy, metadata: { lead_name: leadName } }),
      });
      console.log(`✅ Message saved: ${direction} via ${platform}`);
      return res.ok;
    } catch (e) { return false; }
  }

  async getLeadMessages(leadId: string): Promise<any[]> {
    try {
      const token = await this.getToken();
      if (!token) return [];
      const res = await fetch(`${API_BASE}/api/messages/lead/${leadId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      return res.ok ? await res.json() : [];
    } catch (e) { return []; }
  }
}

export const activityLogger = new ActivityLogger();
