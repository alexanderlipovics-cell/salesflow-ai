/**
 * Contact Links Utility
 * 
 * Generiert Deep Links zu verschiedenen Kontaktplattformen (WhatsApp, Instagram, etc.)
 */

import type { InboxItem } from '@/types/inbox';

interface ContactLink {
  url: string;
  label: string;
  icon: string;
}

/**
 * Generiert den besten Kontakt-Link für einen Lead
 */
export const generateContactLink = (lead: InboxItem['lead']): ContactLink | null => {
  // Special Case: Instagram URL als Name
  if (lead.name?.includes('instagram.com')) {
    return {
      url: lead.name.startsWith('http') ? lead.name : `https://${lead.name}`,
      label: 'Instagram',
      icon: 'Instagram',
    };
  }

  // WhatsApp (Priorität 1 - am häufigsten)
  if (lead.phone) {
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 10) {
      return {
        url: `https://wa.me/${cleanPhone}`,
        label: 'WhatsApp',
        icon: 'MessageCircle',
      };
    }
  }

  // Instagram
  if (lead.instagram_url) {
    return {
      url: lead.instagram_url.startsWith('http') 
        ? lead.instagram_url 
        : `https://instagram.com/${lead.instagram_url}`,
      label: 'Instagram',
      icon: 'Instagram',
    };
  }

  // Instagram Username (aus verschiedenen Feldern)
  const instagramUsername = (lead as any).instagram_username || (lead as any).instagram;
  if (instagramUsername) {
    const cleanUsername = instagramUsername.replace('@', '').replace('https://instagram.com/', '').replace('instagram.com/', '');
    return {
      url: `https://instagram.com/${cleanUsername}`,
      label: 'Instagram',
      icon: 'Instagram',
    };
  }

  // Facebook Messenger
  const facebookUrl = (lead as any).facebook_url;
  const facebookUsername = (lead as any).facebook_username;
  if (facebookUrl || facebookUsername) {
    const username = facebookUsername || facebookUrl?.split('/').pop()?.replace('@', '');
    if (username) {
      return {
        url: `https://m.me/${username}`,
        label: 'Messenger',
        icon: 'Facebook',
      };
    }
  }

  // LinkedIn
  const linkedinUrl = (lead as any).linkedin_url || (lead as any).linkedin;
  if (linkedinUrl) {
    return {
      url: linkedinUrl.startsWith('http') ? linkedinUrl : `https://linkedin.com/in/${linkedinUrl}`,
      label: 'LinkedIn',
      icon: 'Linkedin',
    };
  }

  // Email (mit Nachricht als Body)
  if (lead.email) {
    return {
      url: `mailto:${lead.email}`,
      label: 'Email',
      icon: 'Mail',
    };
  }

  // Fallback: Source URL (z.B. Instagram Profil Link)
  const sourceUrl = (lead as any).source_url;
  if (sourceUrl) {
    return {
      url: sourceUrl,
      label: 'Profil öffnen',
      icon: 'ExternalLink',
    };
  }

  return null;
};

/**
 * Generiert Email-Link mit Nachricht als Body
 */
export const generateEmailLink = (
  email: string,
  message: string,
  subject?: string
): string => {
  const encodedMessage = encodeURIComponent(message);
  const encodedSubject = encodeURIComponent(subject || 'Hallo!');
  return `mailto:${email}?subject=${encodedSubject}&body=${encodedMessage}`;
};

/**
 * Generiert WhatsApp-Link mit vorgefüllter Nachricht
 */
export const generateWhatsAppLink = (phone: string, message: string): string => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

