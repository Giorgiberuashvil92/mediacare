import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientGuard } from '../auth/guards/patient.guard';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { DoctorGuard } from '../doctors/guards/doctor.guard';
import {
  Availability,
  AvailabilitySchema,
} from '../doctors/schemas/availability.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: User.name, schema: UserSchema },
      { name: Availability.name, schema: AvailabilitySchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, PatientGuard, DoctorGuard],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
