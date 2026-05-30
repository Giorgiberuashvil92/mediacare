import type { SupportedLanguage } from "@/app/contexts/LanguageContext";

export interface TermContent {
  content: string;
  contentEn?: string;
  contentRu?: string;
}

export const getTermDisplayContent = (
  term: TermContent,
  language: SupportedLanguage,
): string => {
  if (language === "en") {
    return term.contentEn?.trim() || term.content;
  }
  if (language === "ru") {
    return term.contentRu?.trim() || term.content;
  }
  return term.content;
};
