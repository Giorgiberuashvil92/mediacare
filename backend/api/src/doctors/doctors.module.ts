import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, UserSchema } from '../schemas/user.schema';
import {
  Specialization,
  SpecializationSchema,
} from '../specializations/schemas/specialization.schema';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { DoctorGuard } from './guards/doctor.guard';
import {
  Availability,
  AvailabilitySchema,
} from './schemas/availability.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Availability.name, schema: AvailabilitySchema },
      { name: Specialization.name, schema: SpecializationSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService, DoctorGuard, JwtAuthGuard],
  exports: [DoctorsService],
})
export class DoctorsModule {}
