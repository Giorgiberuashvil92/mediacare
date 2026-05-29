import type { SupportedLanguage } from "@/app/contexts/LanguageContext";

export interface DoctorNamed {
  name: string;
  nameEn?: string;
  nameRu?: string;
}

export const getDoctorDisplayName = (
  doctor: DoctorNamed | null | undefined,
  language: SupportedLanguage,
  fallback = "",
): string => {
  if (!doctor?.name?.trim() && !doctor?.nameEn?.trim() && !doctor?.nameRu?.trim()) {
    return fallback;
  }
  if (language === "en" && doctor.nameEn?.trim()) return doctor.nameEn.trim();
  if (language === "ru" && doctor.nameRu?.trim()) return doctor.nameRu.trim();
  return doctor.name?.trim() || fallback;
};

/** ძებნისთვის — ყველა ენოვანი სახელი */
export const doctorNameSearchText = (
  doctor: DoctorNamed | null | undefined,
): string => {
  if (!doctor) return "";
  return [doctor.name, doctor.nameEn, doctor.nameRu]
    .filter((v) => typeof v === "string" && v.trim())
    .join(" ")
    .toLowerCase();
};
