/**
 * i18n Configuration for Sales Flow AI
 * React Native Internationalization Setup
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import translations
import de from './locales/de.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

// Define resources
const resources = {
  de: { translation: de },
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es }
};

// Get device language
const deviceLanguage = Localization.locale.split('-')[0]; // 'en-US' -> 'en'

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage || 'de', // Use device language or fallback to German
    fallbackLng: 'de',
    compatibilityJSON: 'v3', // For React Native compatibility
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false // Disable suspense for React Native
    }
  });

export default i18n;

