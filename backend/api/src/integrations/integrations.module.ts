import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { Clinic, ClinicSchema } from '../shop/schemas/clinic.schema';
import { HeraUsersService } from './hera-users.service';
import { MisAuthService } from './mis-auth.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Clinic.name, schema: ClinicSchema },
    ]),
  ],
  providers: [HeraUsersService, MisAuthService],
  exports: [HeraUsersService, MisAuthService],
})
export class IntegrationsModule {}
