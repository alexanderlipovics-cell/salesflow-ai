/**
 * 🪄 Magic Deep-Link Service
 * 
 * Ermöglicht "1-Klick" Messaging ohne API-Kosten:
 * 1. Text wird automatisch in die Zwischenablage kopiert
 * 2. App öffnet sich im richtigen Chat (Deep Link)
 * 3. User fügt ein und sendet (Human in the Loop = kein Ban)
 * 
 * Kosten: 0,00€ pro Nachricht! 🚀
 * 
 * @author SalesFlow AI
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Platform = 'whatsapp' | 'instagram' | 'facebook' | 'linkedin' | 'telegram' | 'email' | 'sms';

export interface DeepLinkResult {
  success: boolean;
  platform: Platform;
  deepLink: string;
  textCopied: boolean;
  error?: string;
}

export interface ContactInfo {
  phone?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  telegram?: string;
  email?: string;
  name?: string;
}

export interface MagicLinkOptions {
  message: string;
  contact: ContactInfo;
  platform: Platform;
  showToast?: boolean;
  copyFirst?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP LINK GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Säubert eine Telefonnummer (nur Ziffern, mit Ländercode)
 */
function cleanPhoneNumber(phone: string): string {
  // Entferne alles außer Ziffern und +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Wenn mit 0 beginnend (deutsche Nummer), ersetze mit +49
  if (cleaned.startsWith('0')) {
    cleaned = '+49' + cleaned.substring(1);
  }
  
  // Entferne + für URL
  return cleaned.replace('+', '');
}

/**
 * Extrahiert Instagram-Username aus URL oder Handle
 */
function extractInstagramUsername(instagram: string): string {
  // Wenn URL
  if (instagram.includes('instagram.com')) {
    const match = instagram.match(/instagram\.com\/([^/?]+)/);
    return match ? match[1] : instagram;
  }
  // Wenn @handle
  return instagram.replace('@', '').trim();
}

/**
 * Extrahiert Facebook-Username/ID aus URL
 */
function extractFacebookId(facebook: string): string {
  if (facebook.includes('facebook.com')) {
    const match = facebook.match(/facebook\.com\/([^/?]+)/);
    return match ? match[1] : facebook;
  }
  return facebook.replace('@', '').trim();
}

/**
 * Extrahiert LinkedIn-Username aus URL
 */
function extractLinkedInId(linkedin: string): string {
  if (linkedin.includes('linkedin.com')) {
    const match = linkedin.match(/linkedin\.com\/in\/([^/?]+)/);
    return match ? match[1] : linkedin;
  }
  return linkedin.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP LINK BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

const deepLinkBuilders: Record<Platform, (contact: ContactInfo, message: string) => string | null> = {
  
  whatsapp: (contact, message) => {
    if (!contact.phone) return null;
    const phone = cleanPhoneNumber(contact.phone);
    // WhatsApp Deep Link - öffnet Chat mit vorausgefüllter Nachricht
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  },
  
  instagram: (contact, _message) => {
    if (!contact.instagram) return null;
    const username = extractInstagramUsername(contact.instagram);
    // Instagram Deep Link - öffnet DM mit User
    // Native App: instagram://user?username=xxx
    // Web Fallback: https://instagram.com/xxx
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      return `instagram://user?username=${username}`;
    }
    return `https://instagram.com/${username}`;
  },
  
  facebook: (contact, _message) => {
    if (!contact.facebook) return null;
    const id = extractFacebookId(contact.facebook);
    // Facebook Messenger Deep Link
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      return `fb-messenger://user/${id}`;
    }
    return `https://m.me/${id}`;
  },
  
  linkedin: (contact, _message) => {
    if (!contact.linkedin) return null;
    const id = extractLinkedInId(contact.linkedin);
    // LinkedIn Deep Link
    return `https://www.linkedin.com/in/${id}`;
  },
  
  telegram: (contact, message) => {
    if (!contact.telegram && !contact.phone) return null;
    const username = contact.telegram?.replace('@', '') || cleanPhoneNumber(contact.phone!);
    // Telegram Deep Link
    if (contact.telegram) {
      return `https://t.me/${username}?text=${encodeURIComponent(message)}`;
    }
    return `https://t.me/+${username}?text=${encodeURIComponent(message)}`;
  },
  
  email: (contact, message) => {
    if (!contact.email) return null;
    const subject = encodeURIComponent('Hey ' + (contact.name?.split(' ')[0] || ''));
    const body = encodeURIComponent(message);
    return `mailto:${contact.email}?subject=${subject}&body=${body}`;
  },
  
  sms: (contact, message) => {
    if (!contact.phone) return null;
    const phone = cleanPhoneNumber(contact.phone);
    // SMS Deep Link
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // iOS verwendet &body=
      return `sms:${phone}&body=${encodeURIComponent(message)}`;
    }
    // Android verwendet ?body=
    return `sms:${phone}?body=${encodeURIComponent(message)}`;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLIPBOARD FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kopiert Text in die Zwischenablage
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback für ältere Browser
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generiert Deep-Link für eine Plattform
 */
export function generateDeepLink(
  platform: Platform, 
  contact: ContactInfo, 
  message: string
): string | null {
  const builder = deepLinkBuilders[platform];
  if (!builder) return null;
  return builder(contact, message);
}

/**
 * Prüft welche Plattformen für einen Kontakt verfügbar sind
 */
export function getAvailablePlatforms(contact: ContactInfo): Platform[] {
  const available: Platform[] = [];
  
  if (contact.phone) {
    available.push('whatsapp', 'sms', 'telegram');
  }
  if (contact.instagram) {
    available.push('instagram');
  }
  if (contact.facebook) {
    available.push('facebook');
  }
  if (contact.linkedin) {
    available.push('linkedin');
  }
  if (contact.telegram) {
    available.push('telegram');
  }
  if (contact.email) {
    available.push('email');
  }
  
  return [...new Set(available)]; // Unique
}

/**
 * 🪄 MAGIC SEND - Der Haupt-Workflow
 * 
 * 1. Kopiert Nachricht in Zwischenablage
 * 2. Öffnet Deep-Link zur App
 * 3. User fügt ein und sendet
 * 
 * @returns DeepLinkResult mit Status
 */
export async function magicSend(options: MagicLinkOptions): Promise<DeepLinkResult> {
  const { message, contact, platform, copyFirst = true, showToast = true } = options;
  
  try {
    // 1. Deep-Link generieren
    const deepLink = generateDeepLink(platform, contact, message);
    
    if (!deepLink) {
      return {
        success: false,
        platform,
        deepLink: '',
        textCopied: false,
        error: `Keine ${platform}-Kontaktinfo verfügbar`,
      };
    }
    
    // 2. Text in Zwischenablage kopieren
    let textCopied = false;
    if (copyFirst) {
      textCopied = await copyToClipboard(message);
      
      if (showToast && textCopied) {
        // Toast-Notification anzeigen
        showCopyToast(platform);
      }
    }
    
    // 3. Deep-Link öffnen (nach kurzem Delay für Toast)
    setTimeout(() => {
      window.open(deepLink, '_blank');
    }, copyFirst ? 300 : 0);
    
    return {
      success: true,
      platform,
      deepLink,
      textCopied,
    };
    
  } catch (error) {
    console.error('Magic send failed:', error);
    return {
      success: false,
      platform,
      deepLink: '',
      textCopied: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

/**
 * Zeigt Toast-Notification nach dem Kopieren
 */
function showCopyToast(platform: Platform): void {
  // Erstelle Toast-Element
  const toast = document.createElement('div');
  toast.className = 'magic-copy-toast';
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(139, 92, 246, 0.4);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 600;
      animation: slideUp 0.3s ease-out;
    ">
      <span style="font-size: 24px;">✨</span>
      <div>
        <div>Nachricht kopiert!</div>
        <div style="font-size: 12px; opacity: 0.8; font-weight: 400;">
          Öffne ${getPlatformName(platform)} und füge ein
        </div>
      </div>
    </div>
    <style>
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    </style>
  `;
  
  document.body.appendChild(toast);
  
  // Nach 3 Sekunden entfernen
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

/**
 * Gibt den lesbaren Plattform-Namen zurück
 */
export function getPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Messenger',
    linkedin: 'LinkedIn',
    telegram: 'Telegram',
    email: 'E-Mail',
    sms: 'SMS',
  };
  return names[platform] || platform;
}

/**
 * Gibt das Plattform-Icon als Emoji zurück
 */
export function getPlatformEmoji(platform: Platform): string {
  const emojis: Record<Platform, string> = {
    whatsapp: '💬',
    instagram: '📸',
    facebook: '👥',
    linkedin: '💼',
    telegram: '✈️',
    email: '📧',
    sms: '📱',
  };
  return emojis[platform] || '💬';
}

/**
 * Gibt die Plattform-Farbe zurück
 */
export function getPlatformColor(platform: Platform): string {
  const colors: Record<Platform, string> = {
    whatsapp: '#25D366',
    instagram: '#E4405F',
    facebook: '#1877F2',
    linkedin: '#0A66C2',
    telegram: '#0088cc',
    email: '#EA4335',
    sms: '#34C759',
  };
  return colors[platform] || '#8B5CF6';
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  magicSend,
  generateDeepLink,
  getAvailablePlatforms,
  copyToClipboard,
  getPlatformName,
  getPlatformEmoji,
  getPlatformColor,
};

