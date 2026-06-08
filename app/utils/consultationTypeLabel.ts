export function normalizeAppointmentType(type?: string): "video" | "home-visit" {
  const raw = String(type ?? "video").toLowerCase();
  if (
    raw === "home-visit" ||
    raw === "home_visit" ||
    raw === "homevisit"
  ) {
    return "home-visit";
  }
  return "video";
}

export function getConsultationTypeLabel(
  type: string | undefined,
  isFollowUp: boolean | undefined,
  t: (key: string) => string,
): string {
  const normalized = normalizeAppointmentType(type);

  if (isFollowUp === true) {
    return normalized === "home-visit"
      ? t("appointments.type.followUpHomeVisit")
      : t("appointments.type.followUpVideo");
  }

  return normalized === "home-visit"
    ? t("appointments.type.homeVisit")
    : t("appointments.type.videoConsultation");
}

export function getConsultationTypeIconName(
  type: string | undefined,
): "videocam-outline" | "home-outline" {
  return normalizeAppointmentType(type) === "home-visit"
    ? "home-outline"
    : "videocam-outline";
}
