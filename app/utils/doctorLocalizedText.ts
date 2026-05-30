import type { SupportedLanguage } from "@/app/contexts/LanguageContext";

export type DoctorLocalizedField = "about" | "adminNotes";

export interface DoctorLocalizedFields {
  about?: string;
  aboutEn?: string;
  aboutRu?: string;
  adminNotes?: string;
  adminNotesEn?: string;
  adminNotesRu?: string;
}

export const getDoctorLocalizedText = (
  doctor: DoctorLocalizedFields | null | undefined,
  field: DoctorLocalizedField,
  language: SupportedLanguage,
): string => {
  if (!doctor) return "";
  const ka = (doctor[field] ?? "").trim();
  const en = (doctor[`${field}En` as keyof DoctorLocalizedFields] as
    | string
    | undefined)?.trim();
  const ru = (doctor[`${field}Ru` as keyof DoctorLocalizedFields] as
    | string
    | undefined)?.trim();
  if (language === "en") return en || ka;
  if (language === "ru") return ru || ka;
  return ka;
};
