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
  company?: string;
  vertical?: string;
}

export interface MagicLinkOptions {
  message: string;
  contact: ContactInfo;
  platform: Platform;
  showToast?: boolean;
  copyFirst?: boolean;
  emailSubject?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM-SPECIFIC MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlatformTemplates {
  instagram: string[];
  linkedin: string[];
  email: { subject: string; body: string }[];
  whatsapp: string[];
}

/**
 * Plattform-spezifische Nachrichten-Templates
 * Optimiert für die jeweilige Plattform-Kultur
 */
export const PLATFORM_TEMPLATES: PlatformTemplates = {
  // Instagram: Casual, Emoji-freundlich, kurz
  instagram: [
    "Hey {{firstName}}! 👋 Hab dein Profil gesehen und musste dir schreiben - mega inspirierend! Was machst du beruflich?",
    "Hi {{firstName}}! ✨ Dein Content ist echt stark. Hätte da eine Frage - hast du kurz Zeit?",
    "Hey {{firstName}}! 🔥 Bin über dein Profil gestolpert und dachte mir, wir könnten uns mal austauschen. Was sagst du?",
    "Hi {{firstName}}! 💪 Sehe, du bist auch im {{vertical}}-Bereich unterwegs. Würde mich mega freuen, wenn wir uns vernetzen!",
    "Hey {{firstName}}! 😊 Dein Feed gibt mir gerade richtig gute Vibes. Lass uns connecten!",
  ],
  
  // LinkedIn: Professionell, Business-fokussiert
  linkedin: [
    "Hallo {{firstName}}, ich bin auf Ihr Profil aufmerksam geworden und Ihre Erfahrung im Bereich {{vertical}} hat mich beeindruckt. Würden Sie sich über eine Vernetzung freuen?",
    "Guten Tag {{firstName}}, ich vernetze mich gerne mit Professionals aus dem {{vertical}}-Bereich. Ihr Werdegang ist inspirierend - haben Sie Interesse an einem kurzen Austausch?",
    "Hallo {{firstName}}, ich habe gesehen, dass Sie bei {{company}} tätig sind. Ich arbeite in einem ähnlichen Feld und würde mich über einen Erfahrungsaustausch freuen.",
    "Sehr geehrte/r {{firstName}}, Ihr Profil hat mich angesprochen. Ich bin immer auf der Suche nach spannenden Kontakten - wären Sie offen für ein kurzes Gespräch?",
    "Hi {{firstName}}, schönes Profil! Ich sehe Synergien zwischen unseren Tätigkeiten. Lust auf einen virtuellen Kaffee?",
  ],
  
  // Email: Formell mit persönlicher Note
  email: [
    {
      subject: "Kurze Frage an Sie, {{firstName}}",
      body: "Hallo {{firstName}},\n\nich hoffe, diese E-Mail erreicht Sie gut.\n\nIch bin auf Sie aufmerksam geworden und wollte mich kurz vorstellen. Ich bin im Bereich {{vertical}} tätig und sehe interessante Überschneidungen.\n\nHätten Sie in den nächsten Tagen 15 Minuten für ein kurzes Gespräch?\n\nMit freundlichen Grüßen"
    },
    {
      subject: "Vernetzung - {{firstName}}",
      body: "Hallo {{firstName}},\n\nIhr Profil ist mir positiv aufgefallen und ich dachte, ich schreibe Sie einfach mal direkt an.\n\nIch würde mich freuen, wenn wir uns austauschen könnten.\n\nWann passt es Ihnen am besten?\n\nViele Grüße"
    },
    {
      subject: "Spannende Möglichkeit für Sie",
      body: "Hallo {{firstName}},\n\nich arbeite derzeit an einem Projekt, das für Sie interessant sein könnte.\n\nOhne zu viel vorwegzunehmen - es geht um {{vertical}} und neue Einkommensmöglichkeiten.\n\nHaben Sie diese Woche Zeit für ein kurzes Telefonat?\n\nBeste Grüße"
    },
  ],
  
  // WhatsApp: Freundlich, direkt, mit Emoji
  whatsapp: [
    "Hey {{firstName}}! 👋 Hier ist [DeinName]. Hab deine Nummer bekommen und wollte mich mal melden. Hast du gerade 2 Minuten?",
    "Hi {{firstName}}! 😊 Schön, dass wir uns vernetzen. Ich hab da was Interessantes für dich - wann hast du mal Zeit zum Quatschen?",
    "Hey {{firstName}}! 🚀 Ich bin's, [DeinName]. Melde mich wegen der Sache, über die wir gesprochen haben. Bist du gerade erreichbar?",
  ],
};

/**
 * Ersetzt Platzhalter in Templates
 */
export function fillTemplate(template: string, contact: ContactInfo, userName?: string): string {
  let filled = template;
  
  const firstName = contact.name?.split(' ')[0] || 'du';
  const userFirstName = userName?.split(' ')[0] || '[DeinName]';
  
  filled = filled.replace(/\{\{firstName\}\}/g, firstName);
  filled = filled.replace(/\{\{name\}\}/g, contact.name || 'du');
  filled = filled.replace(/\{\{company\}\}/g, contact.company || 'Ihrem Unternehmen');
  filled = filled.replace(/\{\{vertical\}\}/g, contact.vertical || 'Business');
  filled = filled.replace(/\[DeinName\]/g, userFirstName);
  filled = filled.replace(/\[Name\]/g, firstName);
  
  return filled;
}

/**
 * Holt ein zufälliges Template für eine Plattform
 */
export function getRandomTemplate(platform: Platform, contact: ContactInfo, userName?: string): string {
  if (platform === 'email') {
    const templates = PLATFORM_TEMPLATES.email;
    const template = templates[Math.floor(Math.random() * templates.length)];
    return fillTemplate(template.body, contact, userName);
  }
  
  const templates = PLATFORM_TEMPLATES[platform as keyof Omit<PlatformTemplates, 'email'>];
  if (!templates || templates.length === 0) {
    return `Hey ${contact.name?.split(' ')[0] || 'du'}! 👋`;
  }
  
  const template = templates[Math.floor(Math.random() * templates.length)];
  return fillTemplate(template, contact, userName);
}

/**
 * Holt alle Templates für eine Plattform
 */
export function getAllTemplates(platform: Platform, contact: ContactInfo, userName?: string): string[] {
  if (platform === 'email') {
    return PLATFORM_TEMPLATES.email.map(t => fillTemplate(t.body, contact, userName));
  }
  
  const templates = PLATFORM_TEMPLATES[platform as keyof Omit<PlatformTemplates, 'email'>];
  if (!templates) return [];
  
  return templates.map(t => fillTemplate(t, contact, userName));
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

/**
 * Erkennt ob wir auf Mobile sind
 */
function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Erkennt iOS spezifisch
 */
function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

const deepLinkBuilders: Record<Platform, (contact: ContactInfo, message: string, options?: { emailSubject?: string }) => string | null> = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WHATSAPP - Funktioniert super mit vorausgefüllter Nachricht
  // ═══════════════════════════════════════════════════════════════════════════
  whatsapp: (contact, message) => {
    if (!contact.phone) return null;
    const phone = cleanPhoneNumber(contact.phone);
    // WhatsApp Deep Link - öffnet Chat mit vorausgefüllter Nachricht
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INSTAGRAM - Multi-Strategy Deep Links
  // ═══════════════════════════════════════════════════════════════════════════
  instagram: (contact, _message) => {
    if (!contact.instagram) return null;
    const username = extractInstagramUsername(contact.instagram);
    
    if (isMobileDevice()) {
      // Strategie 1: Native App Deep Link für DMs
      // instagram://user?username=xxx öffnet das Profil
      // Um DIREKT in DMs zu gehen (iOS):
      if (isIOS()) {
        // iOS: Öffnet Instagram App direkt beim User
        return `instagram://user?username=${username}`;
      }
      // Android: Gleiche URL, aber kann variieren
      return `intent://user?username=${username}#Intent;package=com.instagram.android;scheme=instagram;end`;
    }
    
    // Web: Öffnet das Profil - User muss auf "Nachricht" klicken
    // Tipp: Die Nachricht ist ja schon kopiert!
    return `https://www.instagram.com/${username}/`;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FACEBOOK MESSENGER - Direktnachricht
  // ═══════════════════════════════════════════════════════════════════════════
  facebook: (contact, _message) => {
    if (!contact.facebook) return null;
    const id = extractFacebookId(contact.facebook);
    
    if (isMobileDevice()) {
      // Messenger App Deep Link
      return `fb-messenger://user-thread/${id}`;
    }
    // Web: Messenger.com oder m.me Redirect
    return `https://m.me/${id}`;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LINKEDIN - Messaging Deep Links (verbessert!)
  // ═══════════════════════════════════════════════════════════════════════════
  linkedin: (contact, _message) => {
    if (!contact.linkedin) return null;
    const id = extractLinkedInId(contact.linkedin);
    
    if (isMobileDevice()) {
      // LinkedIn App Deep Link - öffnet Profil
      // Leider keine direkte Message-URL möglich ohne API
      return `linkedin://in/${id}`;
    }
    
    // Web: Öffnet Profil - User klickt auf "Nachricht senden"
    // TIPP: Message ist kopiert, User fügt ein nach dem Klick auf "Nachricht"
    return `https://www.linkedin.com/in/${id}/`;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TELEGRAM - Mit vorausgefüllter Nachricht
  // ═══════════════════════════════════════════════════════════════════════════
  telegram: (contact, message) => {
    if (!contact.telegram && !contact.phone) return null;
    
    if (contact.telegram) {
      const username = contact.telegram.replace('@', '');
      // Telegram unterstützt vorausgefüllte Nachrichten!
      return `https://t.me/${username}?text=${encodeURIComponent(message)}`;
    }
    
    // Fallback: Telefonnummer
    const phone = cleanPhoneNumber(contact.phone!);
    return `https://t.me/+${phone}?text=${encodeURIComponent(message)}`;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL - Mit Subject und Body (verbessert!)
  // ═══════════════════════════════════════════════════════════════════════════
  email: (contact, message, options) => {
    if (!contact.email) return null;
    
    // Intelligenter Subject basierend auf Template oder Custom
    let subject = options?.emailSubject;
    if (!subject) {
      // Auto-generiere Subject basierend auf Kontext
      const firstName = contact.name?.split(' ')[0] || '';
      if (contact.vertical) {
        subject = `Spannende Möglichkeit im ${contact.vertical}-Bereich`;
      } else if (firstName) {
        subject = `Kurze Frage an Sie, ${firstName}`;
      } else {
        subject = 'Kurze Anfrage';
      }
    }
    
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(message);
    
    // Vollständiger mailto-Link
    return `mailto:${contact.email}?subject=${encodedSubject}&body=${encodedBody}`;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SMS - Mit vorausgefüllter Nachricht (iOS/Android unterschiedlich)
  // ═══════════════════════════════════════════════════════════════════════════
  sms: (contact, message) => {
    if (!contact.phone) return null;
    const phone = cleanPhoneNumber(contact.phone);
    
    // iOS und Android haben unterschiedliche URL-Schemata
    if (isIOS()) {
      // iOS: sms:nummer&body=text (mit &)
      return `sms:${phone}&body=${encodeURIComponent(message)}`;
    }
    // Android: sms:nummer?body=text (mit ?)
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
  message: string,
  options?: { emailSubject?: string }
): string | null {
  const builder = deepLinkBuilders[platform];
  if (!builder) return null;
  return builder(contact, message, options);
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
  const { message, contact, platform, copyFirst = true, showToast = true, emailSubject } = options;
  
  try {
    // 1. Deep-Link generieren (mit optionalem Email-Subject)
    const deepLink = generateDeepLink(platform, contact, message, { emailSubject });
    
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
  // Neue Template-Funktionen
  fillTemplate,
  getRandomTemplate,
  getAllTemplates,
  PLATFORM_TEMPLATES,
};

