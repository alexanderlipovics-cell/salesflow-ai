/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - INTERNATIONALIZATION (i18n) CONFIG                             ║
 * ║  Global Language Support: DE | EN | ES                                    ║
 * ║  Fallback: German (de)                                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import zh from './locales/zh.json';

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORTED LANGUAGES
// ═══════════════════════════════════════════════════════════════════════════

export const SUPPORTED_LANGUAGES = {
  de: { label: 'Deutsch', nativeLabel: 'DE', flag: '🇩🇪' },
  en: { label: 'English', nativeLabel: 'EN', flag: '🇬🇧' },
  es: { label: 'Español', nativeLabel: 'ES', flag: '🇪🇸' },
  zh: { label: '中文', nativeLabel: '中文', flag: '🇨🇳' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

export const DEFAULT_LANGUAGE: SupportedLanguage = 'de';

// ═══════════════════════════════════════════════════════════════════════════
// i18n INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
      es: { translation: es },
      zh: { translation: zh },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Performance optimizations
    load: 'languageOnly',
    cleanCode: true,

    // React Native specific
    compatibilityJSON: 'v4',
    
    react: {
      useSuspense: false, // Disable suspense for React Native compatibility
    },
  });

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Change the current language
 */
export const changeLanguage = async (lang: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(lang);
};

/**
 * Get current language
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language as SupportedLanguage) || DEFAULT_LANGUAGE;
};

/**
 * Get available languages as array
 */
export const getAvailableLanguages = () => {
  return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
    code: code as SupportedLanguage,
    ...info,
  }));
};

// ═══════════════════════════════════════════════════════════════════════════
// DEVELOPMENT HELPERS (only in __DEV__ mode)
// ═══════════════════════════════════════════════════════════════════════════

if (__DEV__ && typeof window !== 'undefined') {
  (window as any).i18n = i18n;
  (window as any).setLanguage = changeLanguage;
  console.log('🌍 i18n loaded! Test with: setLanguage("en") or setLanguage("es") or setLanguage("de")');
}

export default i18n;

