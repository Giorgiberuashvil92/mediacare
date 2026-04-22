/** ვიდეო/არა-ბინაზე ვიზიტის დასრულება: მხოლოდ HIS GET mis-print-forms-ზე ნაპოვნი ფორმა IV–100 (`misForm100AvailableAt`). PDF ატვირთვა არ ითვლება. */
export function appointmentHasForm100ReadyForCompletion(apt: {
  misForm100AvailableAt?: Date | string | null;
}): boolean {
  const d = apt.misForm100AvailableAt;
  if (d == null) return false;
  if (d instanceof Date) return !Number.isNaN(d.getTime());
  if (typeof d === 'string' && d.trim()) return !Number.isNaN(Date.parse(d));
  return false;
}
