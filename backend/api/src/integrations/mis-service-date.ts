/** HIS GenerateService ServiceDate — საქართველოს wall-clock (+04:00). */
export const MIS_SERVICE_DATE_TZ_OFFSET = '+04:00';

/**
 * MIS-ის მოთხოვნის მიხედვით: `2026-06-23T18:00:00+04:00`
 * (18:00 ზუსტად ისე ჩავარდება ბაზაში, UTC-ში კონვერტაციის გარეშე).
 */
export function formatMisServiceDate(
  dateYmd: string,
  timeHhMm: string,
): string {
  const dateOnly = dateYmd.trim().split('T')[0];
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!dateMatch) {
    throw new Error(`Invalid MIS service date: ${dateYmd}`);
  }

  const timeMatch = /^(\d{1,2}):(\d{2})/.exec(timeHhMm.trim());
  if (!timeMatch) {
    throw new Error(`Invalid MIS service time: ${timeHhMm}`);
  }

  const hours = timeMatch[1].padStart(2, '0');
  const minutes = timeMatch[2].padStart(2, '0');

  return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${hours}:${minutes}:00${MIS_SERVICE_DATE_TZ_OFFSET}`;
}

/** Mongo-ში შენახული appointmentDate → YYYY-MM-DD (UTC კალენდარი). */
export function appointmentDateToYmd(value: Date | string): string {
  if (typeof value === 'string') {
    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    if (iso) return iso[1];
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid appointment date');
  }

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
