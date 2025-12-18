import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const LanguageSwitcher = ({ variant = "default" }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === "de" ? "en" : "de";
    i18n.changeLanguage(newLang);
    localStorage.setItem("sf-language", newLang);
  };

  if (variant === "minimal") {
    return (
      <button
        onClick={toggleLanguage}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        title={currentLang === "de" ? "Switch to English" : "Auf Deutsch wechseln"}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="uppercase">{currentLang}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
      <button
        onClick={() => i18n.changeLanguage("de")}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
          currentLang === "de"
            ? "bg-white/10 text-white"
            : "text-gray-500 hover:text-white"
        }`}
      >
        🇩🇪 DE
      </button>
      <button
        onClick={() => i18n.changeLanguage("en")}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
          currentLang === "en"
            ? "bg-white/10 text-white"
            : "text-gray-500 hover:text-white"
        }`}
      >
        🇺🇸 EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;

