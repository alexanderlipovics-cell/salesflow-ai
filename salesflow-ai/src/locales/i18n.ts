/**
 * i18n Configuration
 * 
 * Internationalisierung für Sales Flow AI
 * Unterstützt: Deutsch (de), Englisch (en)
 * Fallback: Deutsch
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import de from './de/translation.json';
import en from './en/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en }
    },
    fallbackLng: 'de',
    debug: false,
    interpolation: {
      escapeValue: false // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    }
  });

export default i18n;

