import { Global, Module } from '@nestjs/common';
import { HeraUsersService } from './hera-users.service';
import { MisAuthService } from './mis-auth.service';

@Global()
@Module({
  providers: [HeraUsersService, MisAuthService],
  exports: [HeraUsersService, MisAuthService],
})
export class IntegrationsModule {}
