export interface DeepLinkResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const generateDeepLink = (
  platform: 'whatsapp' | 'instagram' | 'linkedin' | 'email',
  contact: string,
  message?: string
): DeepLinkResult => {
  if (!contact) {
    return { success: false, error: 'Keine Kontaktdaten vorhanden' };
  }

  const encodedMessage = message ? encodeURIComponent(message) : '';

  switch (platform) {
    case 'whatsapp': {
      const cleanPhone = contact.replace(/[\s\-()]/g, '').replace(/^00/, '+');
      if (!cleanPhone.match(/^\+?\d{10,15}$/)) {
        return { success: false, error: 'Ungültige Telefonnummer' };
      }
      const phoneWithoutPlus = cleanPhone.replace('+', '');
      const url = message ? `https://wa.me/${phoneWithoutPlus}?text=${encodedMessage}` : `https://wa.me/${phoneWithoutPlus}`;
      return { success: true, url };
    }

    case 'instagram': {
      const handle = contact.replace('@', '').trim();
      if (!handle) {
        return { success: false, error: 'Kein Instagram Handle' };
      }
      const url = `https://instagram.com/${handle}`;
      return { success: true, url };
    }

    case 'linkedin': {
      let url = contact;
      if (!contact.includes('linkedin.com')) {
        url = `https://linkedin.com/in/${contact.replace(/^\//, '')}`;
      }
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      return { success: true, url };
    }

    case 'email': {
      if (!contact.includes('@')) {
        return { success: false, error: 'Ungültige E-Mail Adresse' };
      }
      const url = message ? `mailto:${contact}?body=${encodedMessage}` : `mailto:${contact}`;
      return { success: true, url };
    }

    default:
      return { success: false, error: 'Unbekannte Plattform' };
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
};

export const oneClickSend = async (
  platform: 'whatsapp' | 'instagram' | 'linkedin' | 'email',
  contact: string,
  message: string
): Promise<{ success: boolean; error?: string }> => {
  const copied = await copyToClipboard(message);
  if (!copied) {
    return { success: false, error: 'Konnte Nachricht nicht kopieren' };
  }

  const result = generateDeepLink(platform, contact, platform === 'whatsapp' ? message : undefined);

  if (!result.success || !result.url) {
    return { success: false, error: result.error || 'Konnte Link nicht erstellen' };
  }

  window.open(result.url, '_blank');

  return { success: true };
};

