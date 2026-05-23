import type { Specialization } from "@/app/_services/api";
import type { SupportedLanguage } from "@/app/contexts/LanguageContext";

export const getSpecializationDisplayName = (
  spec: Pick<Specialization, "name" | "nameEn" | "nameRu">,
  language: SupportedLanguage,
): string => {
  if (language === "en" && spec.nameEn?.trim()) return spec.nameEn.trim();
  if (language === "ru" && spec.nameRu?.trim()) return spec.nameRu.trim();
  return spec.name;
};

/** Match doctor.specialization (Georgian key) to localized label */
export const getSpecializationLabelByName = (
  specializationName: string,
  specs: Pick<Specialization, "name" | "nameEn" | "nameRu">[],
  language: SupportedLanguage,
): string => {
  if (!specializationName?.trim()) return specializationName;
  const normalized = specializationName.trim().toLowerCase();
  const match = specs.find(
    (s) =>
      s.name?.trim().toLowerCase() === normalized ||
      s.nameEn?.trim().toLowerCase() === normalized ||
      s.nameRu?.trim().toLowerCase() === normalized,
  );
  return match
    ? getSpecializationDisplayName(match, language)
    : specializationName;
};
