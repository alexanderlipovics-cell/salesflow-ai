// services/messagingService.ts

import { Linking } from 'react-native';
import { apiClient } from '../api/client';
import {
  Message,
  MessageChannel,
  MessageTemplate,
} from '../types/messaging';

interface SendOptions {
  templateId?: string;
  mediaUrl?: string;
  scheduled?: string;
}

export class MessagingService {
  static async sendViaExternalApp(
    channel: MessageChannel,
    phoneNumber: string,
    message: string
  ): Promise<void> {
    let url = '';

    switch (channel) {
      case 'whatsapp': {
        const cleanPhone = phoneNumber.replace(/[+\s]/g, '');
        url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(
          message
        )}`;
        break;
      }
      case 'telegram':
        url = `tg://msg?to=${phoneNumber}&text=${encodeURIComponent(message)}`;
        break;
      case 'sms':
        url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
        break;
      default:
        throw new Error(`Channel ${channel} not supported for external app`);
    }

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error(`Cannot open ${channel}. Please install the app first.`);
    }

    await Linking.openURL(url);
  }

  static async sendMessage(
    leadId: string,
    channel: MessageChannel,
    content: string,
    options?: SendOptions
  ): Promise<Message> {
    return apiClient<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: leadId,
        channel,
        content,
        template_id: options?.templateId,
        media_url: options?.mediaUrl,
        scheduled_at: options?.scheduled,
      }),
    });
  }

  static async getConversation(leadId: string): Promise<Message[]> {
    const response = await apiClient<{ messages: Message[] }>(
      `/api/messages/lead/${leadId}`
    );
    return response.messages;
  }

  static async translateMessage(
    content: string,
    fromLang: string,
    toLang: string
  ): Promise<string> {
    const response = await apiClient<{ translated: string }>(
      '/api/messages/translate',
      {
        method: 'POST',
        body: JSON.stringify({ content, from: fromLang, to: toLang }),
      }
    );
    return response.translated;
  }

  static applyTemplate(
    template: MessageTemplate,
    variables: Record<string, string>
  ): string {
    return template.variables.reduce((result, varName) => {
      const value = variables[varName] || `[${varName}]`;
      const regex = new RegExp(`{${varName}}`, 'g');
      return result.replace(regex, value);
    }, template.content);
  }

  static async getTemplates(
    category?: string,
    channel?: MessageChannel
  ): Promise<MessageTemplate[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (channel) params.append('channel', channel);

    const response = await apiClient<{ templates: MessageTemplate[] }>(
      `/api/templates?${params.toString()}`
    );
    return response.templates;
  }
}


