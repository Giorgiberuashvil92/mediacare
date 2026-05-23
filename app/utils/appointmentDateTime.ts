import type { SupportedLanguage } from "@/app/contexts/LanguageContext";

const KA_MONTHS = [
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
] as const;

const parseYmd = (
  dateStr: string,
): { year: number; month: number; day: number } | null => {
  if (!dateStr) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (iso) {
    return {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
    };
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

/** e.g. 08 მაისი 2026 (ka), 08 May 2026 (en), 08 мая 2026 (ru) */
export const formatAppointmentDateLong = (
  dateStr: string,
  language: SupportedLanguage = "ka",
): string => {
  const parts = parseYmd(dateStr);
  if (!parts) return dateStr;
  const { year, month, day } = parts;
  const dd = String(day).padStart(2, "0");

  if (language === "ka") {
    const monthName = KA_MONTHS[month - 1] ?? String(month);
    return `${dd} ${monthName} ${year}`;
  }

  const locale = language === "ru" ? "ru-RU" : "en-GB";
  const date = new Date(year, month - 1, day);
  const monthName = date.toLocaleDateString(locale, { month: "long" });
  return `${dd} ${monthName} ${year}`;
};

/** Numeric date/time for appointments: DD.MM.YYYY and HH:mm */
export const formatAppointmentDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}.${month}.${year}`;
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export const formatAppointmentTime = (timeStr: string): string => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return timeStr;
};
