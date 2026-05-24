const APPOINTMENT_STATUS_KEYS: Record<string, string> = {
  pending: "appointments.status.pending",
  confirmed: "appointments.status.confirmed",
  "in-progress": "appointments.status.in-progress",
  completed: "appointments.status.completed",
  cancelled: "appointments.status.cancelled",
  blocked: "appointments.status.blocked",
};

const PAYMENT_STATUS_KEYS: Record<string, string> = {
  pending: "appointments.payment.pending",
  paid: "appointments.payment.paid",
  failed: "appointments.payment.failed",
};

export function getAppointmentStatusLabel(
  status: string,
  t: (key: string) => string,
): string {
  const key = APPOINTMENT_STATUS_KEYS[status];
  return key ? t(key) : status;
}

export function getPaymentStatusLabel(
  status: string,
  t: (key: string) => string,
): string {
  const key = PAYMENT_STATUS_KEYS[status];
  return key ? t(key) : status;
}
