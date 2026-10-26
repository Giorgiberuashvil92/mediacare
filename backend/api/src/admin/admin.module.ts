import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Appointment,
  AppointmentSchema,
} from 'src/appointments/schemas/appointment.schema';
import {
  Availability,
  AvailabilitySchema,
} from '../doctors/schemas/availability.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { AiSubscription, AiSubscriptionSchema } from '../ai-subscription/schemas/ai-subscription.schema';
import { Clinic, ClinicSchema } from '../shop/schemas/clinic.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Availability.name, schema: AvailabilitySchema },
      { name: AiSubscription.name, schema: AiSubscriptionSchema },
      { name: Clinic.name, schema: ClinicSchema },
    ]),
    JwtModule.register({}),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
