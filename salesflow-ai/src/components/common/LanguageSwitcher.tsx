/**
 * Language Switcher Component
 * 
 * Ermöglicht Wechsel zwischen Deutsch (DE) und Englisch (EN)
 */

import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-slate-500" />
      <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
        <button
          onClick={() => handleLanguageChange('de')}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            i18n.language === 'de'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          DE
        </button>
        <button
          onClick={() => handleLanguageChange('en')}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            i18n.language === 'en'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}

/**
 * Compact Language Switcher (für mobile/kleine Bereiche)
 */
export function LanguageSwitcherCompact() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLng = i18n.language === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLng);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
      title="Sprache wechseln / Switch language"
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-bold uppercase">{i18n.language}</span>
    </button>
  );
}

