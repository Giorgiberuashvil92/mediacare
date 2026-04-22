import { AppointmentType } from '../appointments/schemas/appointment.schema';

/** HIS სერვისების ID-ები (ფიქსირებული); env-ით ცალკე გადაფარვა საჭიროებისამებრ */
export const MIS_SERVICE_IDS = {
  /** ექიმ სპეციალისტის ვიდეო კონსულტაცია */
  videoConsultation: 'B4A51380-3884-4781-9C3D-F629616D4E5A',
  /** ექიმ სპეციალისტის ვიდეო კონსულტაცია (განმეორებითი) */
  videoFollowUp: '68B0586C-7419-499B-885D-88F38A4FFF02',
  /** ექიმ სპეციალისტის კონსულტაცია ბინაზე (გამოძახება) */
  homeVisit: '97B2908F-4405-498B-A770-1DB47B556016',
} as const;

/** ფიქსირებული კონტრაქტი (იგივე წერილიდან) */
export const MIS_GENERATE_CONTRACT_ID_DEFAULT =
  '5DCA35BF-AB36-11F0-A26C-00259082206B';

export type MisGenerateCatalogContext = {
  type: AppointmentType;
  isFollowUp: boolean;
};

/**
 * GenerateService-ისთვის ServiceID / ContractID.
 * ბინაზე: ერთი სერვისი; ვიდეო: განმეორებითი vs პირველი.
 */
export function resolveMisGenerateCatalog(ctx: MisGenerateCatalogContext): {
  serviceId: string;
  contractId: string;
} {
  const contractId =
    process.env.MIS_GENERATE_SERVICE_CONTRACT_ID?.trim() ||
    MIS_GENERATE_CONTRACT_ID_DEFAULT;

  let serviceId: string;
  if (ctx.type === AppointmentType.HOME_VISIT) {
    serviceId =
      process.env.MIS_SERVICE_ID_HOME_VISIT?.trim() ||
      MIS_SERVICE_IDS.homeVisit;
  } else if (ctx.isFollowUp) {
    serviceId =
      process.env.MIS_SERVICE_ID_VIDEO_FOLLOWUP?.trim() ||
      MIS_SERVICE_IDS.videoFollowUp;
  } else {
    serviceId =
      process.env.MIS_SERVICE_ID_VIDEO?.trim() ||
      MIS_SERVICE_IDS.videoConsultation;
  }

  return { serviceId, contractId };
}
