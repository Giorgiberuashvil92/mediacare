import type { SupportedLanguage } from "@/app/contexts/LanguageContext";

export interface LabNamedItem {
  name: string;
  nameEn?: string;
  nameRu?: string;
}

export const getLabDisplayName = (
  item: LabNamedItem | string,
  language: SupportedLanguage,
  t: (key: string) => string,
): string => {
  const name = typeof item === "string" ? item : item.name;
  const nameEn = typeof item === "string" ? undefined : item.nameEn;
  const nameRu = typeof item === "string" ? undefined : item.nameRu;

  if (language === "en" && nameEn?.trim()) return nameEn.trim();
  if (language === "ru" && nameRu?.trim()) return nameRu.trim();

  const mapKey = `lab.names.${name}`;
  const translated = t(mapKey);
  if (translated && translated !== mapKey) return translated;

  return name;
};
