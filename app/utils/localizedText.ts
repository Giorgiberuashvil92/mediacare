import type { SupportedLanguage } from "@/app/contexts/LanguageContext";

export function getLocalizedText(
  ka: string | undefined,
  en: string | undefined,
  ru: string | undefined,
  language: SupportedLanguage,
): string {
  const primary = (ka ?? "").trim();
  const enText = (en ?? "").trim();
  const ruText = (ru ?? "").trim();
  if (language === "en") return enText || primary;
  if (language === "ru") return ruText || primary;
  return primary;
}
