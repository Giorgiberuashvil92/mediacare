import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PhoneVerification,
  PhoneVerificationSchema,
} from '../schemas/phone-verification.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from '../schemas/refresh-token.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PhoneVerificationService } from './phone-verification.service';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PatientGuard } from './guards/patient.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: PhoneVerification.name, schema: PhoneVerificationSchema },
    ]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PhoneVerificationService,
    SmsService,
    JwtAuthGuard,
    PatientGuard,
    RolesGuard,
  ],
  exports: [AuthService, PhoneVerificationService, JwtAuthGuard, PatientGuard, RolesGuard],
})
export class AuthModule {}
