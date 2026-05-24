"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type SupportedLanguage = "ka" | "en" | "ru";

const LANGUAGE_STORAGE_KEY = "admin-language";

type TranslationDict = Record<string, string>;

const translations: Record<SupportedLanguage, TranslationDict> = {
  ka: {
    "appointments.status.pending": "მოლოდინში",
    "appointments.status.confirmed": "დანიშნული",
    "appointments.status.in-progress": "მიმდინარე",
    "appointments.status.completed": "დასრულებული",
    "appointments.status.cancelled": "გაუქმებული",
    "appointments.status.blocked": "დაბლოკილი",
    "appointments.payment.pending": "მოლოდინში",
    "appointments.payment.paid": "გადახდილი",
    "appointments.payment.failed": "ვერ გადაიხადა",
    "common.all": "ყველა",
    "common.language.georgian": "ქართული",
    "common.language.english": "English",
    "common.language.russian": "Русский",
  },
  en: {
    "appointments.status.pending": "Pending",
    "appointments.status.confirmed": "Scheduled",
    "appointments.status.in-progress": "In progress",
    "appointments.status.completed": "Completed",
    "appointments.status.cancelled": "Cancelled",
    "appointments.status.blocked": "Blocked",
    "appointments.payment.pending": "Pending",
    "appointments.payment.paid": "Paid",
    "appointments.payment.failed": "Payment failed",
    "common.all": "All",
    "common.language.georgian": "ქართული",
    "common.language.english": "English",
    "common.language.russian": "Русский",
  },
  ru: {
    "appointments.status.pending": "В ожидании",
    "appointments.status.confirmed": "Назначен",
    "appointments.status.in-progress": "В процессе",
    "appointments.status.completed": "Завершён",
    "appointments.status.cancelled": "Отменён",
    "appointments.status.blocked": "Заблокирован",
    "appointments.payment.pending": "В ожидании",
    "appointments.payment.paid": "Оплачено",
    "appointments.payment.failed": "Ошибка оплаты",
    "common.all": "Все",
    "common.language.georgian": "ქართული",
    "common.language.english": "English",
    "common.language.russian": "Русский",
  },
};

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("ka");

  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "ka" || stored === "en" || stored === "ru") {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key: string) => {
      const dict = translations[language] ?? translations.ka;
      return dict[key] ?? key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
