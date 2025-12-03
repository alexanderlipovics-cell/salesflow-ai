// services/leadService.ts

import { apiClient } from '../api/client';
import {
  LeadFormData,
  BulkOperation,
  ImportResult,
} from '../types/leadCrud';
import * as Contacts from 'expo-contacts';

export class LeadService {
  static async createLead(data: LeadFormData) {
    return apiClient('/leads', 'POST', data);
  }

  static async updateLead(leadId: string, data: Partial<LeadFormData>) {
    return apiClient(`/leads/${leadId}`, 'PATCH', data);
  }

  static async deleteLead(leadId: string) {
    return apiClient(`/leads/${leadId}`, 'DELETE');
  }

  static async archiveLead(leadId: string) {
    return apiClient(`/leads/${leadId}/archive`, 'POST');
  }

  static async bulkOperation(operation: BulkOperation) {
    return apiClient('/leads/bulk', 'POST', operation);
  }

  static async importFromContacts(): Promise<ImportResult> {
    const { status } = await Contacts.requestPermissionsAsync();

    if (status !== Contacts.PermissionStatus.GRANTED) {
      throw new Error('Contacts permission denied');
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
    });

    const leads = data
      .map((contact) => ({
        name: contact.name || 'Unknown',
        phone: contact.phoneNumbers?.[0]?.number || '',
        email: contact.emails?.[0]?.email,
      }))
      .filter((lead) => !!lead.phone);

    return apiClient('/leads/import', 'POST', { leads });
  }

  static async importFromCSV(csvData: string): Promise<ImportResult> {
    return apiClient('/leads/import-csv', 'POST', { csv_data: csvData });
  }

  static async checkDuplicate(phone: string): Promise<boolean> {
    const response = await apiClient<{ exists: boolean }>(
      `/leads/check-duplicate?phone=${encodeURIComponent(phone)}`,
      'GET'
    );
    return response.exists;
  }
}

