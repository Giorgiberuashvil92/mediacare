"use client";

import { useLanguage, type SupportedLanguage } from "@/contexts/LanguageContext";

const LANGUAGES: { code: SupportedLanguage; labelKey: string }[] = [
  { code: "ka", labelKey: "common.language.georgian" },
  { code: "en", labelKey: "common.language.english" },
  { code: "ru", labelKey: "common.language.russian" },
];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-stroke bg-gray-2 p-0.5 dark:border-dark-3 dark:bg-dark-2"
      role="group"
      aria-label="Language"
    >
      {LANGUAGES.map(({ code, labelKey }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          title={t(labelKey)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase transition-colors ${
            language === code
              ? "bg-primary text-white"
              : "text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
