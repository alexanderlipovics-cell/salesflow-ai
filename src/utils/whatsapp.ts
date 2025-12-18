/**
 * WhatsApp Utility Functions for Sales Flow AI
 *
 * Handles phone number formatting and WhatsApp deep-link generation
 * for seamless WhatsApp integration.
 */

export interface WhatsAppMessage {
  phone: string;
  message: string;
}

/**
 * Format phone number for WhatsApp URL
 * Handles German and international formats
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Handle German formats
  if (cleaned.startsWith('0049')) {
    // Remove 0049 prefix, keep rest
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('49') && cleaned.length > 10) {
    // Already has 49 prefix, keep as is
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // German mobile: 0176... -> 49176...
    cleaned = '49' + cleaned.substring(1);
  } else if (cleaned.length === 10 && !cleaned.startsWith('49')) {
    // Assume German mobile without prefix: 176... -> 49176...
    cleaned = '49' + cleaned;
  }

  // Ensure it starts with country code (49 for Germany)
  if (!cleaned.startsWith('49') && cleaned.length >= 10) {
    // If it doesn't start with 49 but looks like a German number, add 49
    if (cleaned.length === 10) {
      cleaned = '49' + cleaned;
    }
  }

  return cleaned;
}

/**
 * Generate WhatsApp URL with optional message
 */
export function generateWhatsAppLink(phone: string, message?: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  if (!formattedPhone) return '';

  let url = `https://wa.me/${formattedPhone}`;

  if (message) {
    const encodedMessage = encodeURIComponent(message);
    url += `?text=${encodedMessage}`;
  }

  return url;
}

/**
 * Open WhatsApp with phone and optional message
 */
export function openWhatsApp(phone: string, message?: string): void {
  const url = generateWhatsAppLink(phone, message);
  if (url) {
    window.open(url, '_blank');

    // Track the WhatsApp click
    trackWhatsAppInteraction(phone, message);
  }
}

/**
 * Track WhatsApp interaction for analytics
 */
async function trackWhatsAppInteraction(phone: string, message?: string): Promise<void> {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    await fetch('/api/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'whatsapp_opened',
        phone: phone,
        message: message,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to track WhatsApp interaction:', error);
  }
}

/**
 * Check if phone number is valid for WhatsApp
 */
export function isValidWhatsAppPhone(phone: string): boolean {
  const formatted = formatPhoneForWhatsApp(phone);
  // German mobile numbers are 11 digits (49 + 8 digits)
  // German landline numbers are 12-13 digits (49 + 8-9 digits)
  return formatted.length >= 11 && formatted.length <= 13 && formatted.startsWith('49');
}

/**
 * Parse AI message for WhatsApp links
 * Looks for phone numbers and suggested messages in AI responses
 */
export function parseWhatsAppFromMessage(message: string): WhatsAppMessage | null {
  // Look for phone number patterns in the message
  const phoneRegex = /(\+?49|0049)?[0-9\s\-\(\)]{10,}/g;
  const phoneMatch = message.match(phoneRegex);

  if (phoneMatch) {
    const phone = phoneMatch[0];
    // The rest of the message is the WhatsApp message
    const messageText = message.replace(phone, '').trim();
    return {
      phone: phone,
      message: messageText
    };
  }

  return null;
}

/**
 * Generate a professional follow-up message template
 */
export function generateFollowUpMessage(leadName: string, context?: string): string {
  const baseMessage = `Hallo ${leadName}, wie geht es Ihnen?`;

  if (context) {
    return `${baseMessage} ${context}`;
  }

  return `${baseMessage} Ich wollte kurz nachfragen, ob Sie noch Fragen zu unserem Angebot haben.`;
}

/**
 * Generate a cold outreach message template
 */
export function generateColdOutreachMessage(leadName: string, company?: string, valueProp?: string): string {
  let message = `Hallo ${leadName}`;

  if (company) {
    message += ` von ${company}`;
  }

  message += ',';

  if (valueProp) {
    message += ` ${valueProp}`;
  } else {
    message += ' ich interessiere mich für Ihr Unternehmen und würde gerne mehr über Ihre aktuellen Herausforderungen erfahren.';
  }

  return message;
}
