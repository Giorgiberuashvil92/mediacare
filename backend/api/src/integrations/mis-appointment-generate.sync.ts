import { BadRequestException, Logger } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { AppointmentDocument } from '../appointments/schemas/appointment.schema';
import { MisAuthService } from './mis-auth.service';
import { resolveMisGenerateCatalog } from './mis-generate-service-catalog';

export type MisAttachGenerateContext = {
  misPersonId: string;
  doctorPersonalId: string;
  serviceDateIso: string;
};

/**
 * პაციენტის ჯავშნის შექმნისას (POST შემდეგ):
 * 1) HIS POST …/Services/GenerateService — დაბრუნებული instance serviceId ინახება Appointment-ზე (`misGeneratedServiceId`).
 * 2) PrintForm GET …/PrintForm/GetFormsByServiceID — არა აქ; ყოველთვის GET /appointments/:id/mis-print-forms
 *    (HIS პირდაპირ, Mongo-ში ფორმები არ ინახება).
 *
 * წარუმატებელი GenerateService-ისას appointment იშლება Mongo-დან.
 */
export async function misAttachGeneratedServiceId(
  misAuthService: MisAuthService,
  appointmentModel: Model<AppointmentDocument>,
  appointment: AppointmentDocument,
  ctx: MisAttachGenerateContext,
  logger: Logger,
): Promise<void> {
  const { serviceId, contractId } = resolveMisGenerateCatalog({
    type: appointment.type,
    isFollowUp: appointment.isFollowUp === true,
  });

  const genResult = await misAuthService.generateService({
    ServiceID: serviceId,
    PersonID: ctx.misPersonId,
    ContractID: contractId,
    MakeAutoPayment: true,
    DoctorPersonalID: ctx.doctorPersonalId,
    ServiceDate: ctx.serviceDateIso,
  });

  if (!genResult.success || !genResult.serviceId) {
    await appointmentModel.findByIdAndDelete(appointment._id);
    throw new BadRequestException(
      'HIS-ში სერვისის გენერაცია ვერ მოხერხდა. ჯავშანი გაუქმებულია.',
    );
  }

  appointment.misGeneratedServiceId = genResult.serviceId;
  await appointment.save();

  logger.log(
    `MIS GenerateService OK appointment=${String(appointment._id)} catalogServiceId=${serviceId} misServiceId=${genResult.serviceId} (PrintForm — GET /appointments/:id/mis-print-forms)`,
  );
}
